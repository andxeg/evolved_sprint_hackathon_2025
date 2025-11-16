import argparse
import asyncio
import json
import sys
import uuid
from datetime import datetime
from http import HTTPStatus
from io import StringIO
from pathlib import Path
from typing import Any

import msgspec
from sqlalchemy import select, update
from sanic import Blueprint, response
from sanic.exceptions import SanicException
from sanic.request import Request
from sanic.views import HTTPMethodView
from sanic_ext import validate
from sanic_ext.extensions.openapi import openapi

from api.design.models import DesignJob, DesignJobStatus
from api.design.serializers import DesignInput, StructureBasedSpecInput
from dual_targets.get_input_boltzgen import generate_structure_based_binder_spec
import yaml
from boltzgen.cli.boltzgen import ARTIFACTS, check_design_spec, get_artifact_path
from boltzgen.data.mol import load_canonicals
from core.config import settings

# Import config_dir from boltzgen.cli.boltzgen
# We need to compute it the same way as boltzgen does
from sqlalchemy.ext.asyncio import AsyncSession
from urllib.parse import quote

from api.design.workflows import run_boltzgen_pipeline, run_binder_optimization_pipeline

design_v1 = Blueprint("design", version=1)

class ErrorResponse(msgspec.Struct):
    message: str


class NotFoundResponse(ErrorResponse):
    pass

class DesignCheckView(HTTPMethodView):
    @openapi.definition(
        response={
            200: dict[str, Any],
            400: ErrorResponse,
            404: ErrorResponse,
            500: ErrorResponse,
        },
    )
    @validate(json=DesignInput)
    async def post(self, request: Request, body: DesignInput) -> Any:
        """
        Check a design specification YAML file and generate a visualization CIF file.
        
        The input YAML file should be in OUTPUT_DIR/uploads/ and will be checked.
        The output CIF file will be written to OUTPUT_DIR/checks/.
        """
        # Set up paths
        output_dir = Path(settings.OUTPUT_DIR)
        uploads_folder = output_dir / "uploads"
        checks_folder = output_dir / "checks"
        checks_folder.mkdir(parents=True, exist_ok=True)

        # Find the input YAML file
        yaml_path = uploads_folder / body.inputYamlFilename
        if not yaml_path.exists():
            raise SanicException(
                status_code=HTTPStatus.NOT_FOUND,
                message=f"Input YAML file not found: {body.inputYamlFilename}",
            )

        # Create a mock argparse.Namespace for check_design_spec
        # We need to capture stdout to check for warnings
        original_stdout = sys.stdout
        captured_output = StringIO()
        
        try:
            # Create args object
            args = argparse.Namespace()
            args.output = checks_folder
            args.moldir = ARTIFACTS["moldir"][0]
            args.force_download = False
            args.models_token = None
            args.cache = None

            # Get moldir path
            moldir = get_artifact_path(args, args.moldir, repo_type="dataset", verbose=False)
            mols = load_canonicals(moldir=moldir)

            # Capture stdout to check for warnings
            sys.stdout = captured_output
            
            # Run the check
            check_design_spec(args, moldir, yaml_path, mols)
            
            # Restore stdout
            sys.stdout = original_stdout
            
            # Get the output
            output_text = captured_output.getvalue()
            
            # Determine output CIF filename (based on YAML stem)
            cif_filename = yaml_path.stem + ".cif"
            cif_path = checks_folder / cif_filename
            
            # Check if file was created
            if not cif_path.exists():
                raise SanicException(
                    status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
                    message="CIF file was not generated",
                )
            
            # Determine if check passed (no unresolved residues/atoms warnings)
            # The function prints "There are X unresolved residues" if there are issues
            check_passed = "unresolved residues" not in output_text.lower() and "unresolved atoms" not in output_text.lower()
            
            # Build the full URL to the CIF file
            cif_url = f"/v1/files/checks/{quote(cif_filename)}"
            
            return response.json(
                {
                    "message": "Design check completed",
                    "check_passed": check_passed,
                    "cif_filename": cif_filename,
                    "cif_url": cif_url,
                    "output": output_text,
                },
                status=HTTPStatus.OK,
            )
            
        except Exception as e:
            # Restore stdout in case of error
            sys.stdout = original_stdout
            raise SanicException(
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
                message=f"Design check failed: {str(e)}",
            )

class StructureBasedBindersSpecView(HTTPMethodView):
    @openapi.definition(
        response={
            200: dict[str, Any],
            400: ErrorResponse,
            404: ErrorResponse,
            500: ErrorResponse,
        },
    )
    @validate(json=StructureBasedSpecInput)
    async def post(self, request: Request, body: StructureBasedSpecInput) -> Any:
        """
        Generate a structure-based binder design spec YAML.
        
        Input files must already be uploaded to OUTPUT_DIR/uploads/ and referenced by filename.
        Request JSON:
        {
            "bindersScaffoldCIF": "<filename>",
            "targetPDB": "<filename>"
        }
        """
        output_dir = Path(settings.OUTPUT_DIR)
        uploads_folder = output_dir / "uploads"

        cif_path = uploads_folder / body.bindersScaffoldCIF
        pdb_path = uploads_folder / body.targetPDB

        if not cif_path.exists():
            raise SanicException(
                status_code=HTTPStatus.NOT_FOUND,
                message=f"bindersScaffoldCIF not found: {body.bindersScaffoldCIF}",
            )
        if not pdb_path.exists():
            raise SanicException(
                status_code=HTTPStatus.NOT_FOUND,
                message=f"targetPDB not found: {body.targetPDB}",
            )

        try:
            spec_dict = generate_structure_based_binder_spec(cif_path, pdb_path)
            yaml_text = yaml.dump(spec_dict, default_flow_style=False, sort_keys=False)

            # Return YAML content directly
            return response.raw(
                yaml_text.encode("utf-8"),
                content_type="application/x-yaml",
                headers={
                    "Content-Disposition": 'attachment; filename="Fcgr4_binder_design.yaml"'
                },
            )
        except Exception as e:
            raise SanicException(
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
                message=f"Failed to generate design spec: {str(e)}",
            )

class DesignFileView(HTTPMethodView):
    @openapi.definition(
        response={
            200: dict[str, Any],
            400: ErrorResponse,
            404: ErrorResponse,
        },
    )
    async def post(self, request: Request) -> Any:
        """
        Upload one or more files to the uploads folder.
        Accepts multipart/form-data with one or multiple 'files' fields.
        Files are saved to OUTPUT_DIR/uploads/ using a unique filename (uuid_prefix_original.ext).
        """
        # Validate files presence
        if not request.files:
            raise SanicException(status_code=HTTPStatus.BAD_REQUEST, message="No files provided")

        # Collect files from request
        files_lists: list[list[Any]] = []
        explicit = request.files.get("files")
        if explicit:
            # Sanic may return a single File or a list
            if isinstance(explicit, list):
                files_lists.append(explicit)
            else:
                files_lists.append([explicit])
        else:
            # Collect all lists from request.files (for clients using different field names)
            for k in request.files.keys():
                vals = request.files.get(k)
                if vals:
                    if isinstance(vals, list):
                        files_lists.append(vals)
                    else:
                        files_lists.append([vals])

        if not files_lists:
            raise SanicException(status_code=HTTPStatus.BAD_REQUEST, message="No files found in request")

        # Create uploads folder in OUTPUT_DIR
        output_dir = Path(settings.OUTPUT_DIR)
        uploads_folder = output_dir / "uploads"
        uploads_folder.mkdir(parents=True, exist_ok=True)

        # Collect optional extra fields from multipart form
        extra_fields: dict[str, Any] = {}
        try:
            form_data: dict[str, Any] = request.form or {}
        except Exception:
            form_data = {}

        if hasattr(form_data, "items"):
            for key, raw_value in form_data.items():
                # Sanic may return single str or list[str]
                value = raw_value[0] if isinstance(raw_value, list) and raw_value else raw_value
                if value is None:
                    continue
                parsed: Any = value
                # Attempt JSON parse for any key ending with _json
                if isinstance(value, str) and key.endswith("_json"):
                    try:
                        parsed = json.loads(value)
                    except Exception:
                        parsed = value
                extra_fields[key] = parsed

        # Upload files to local folder
        stored_file_entries: list[dict[str, Any]] = []
        for files_field in files_lists:
            for file_obj in files_field:
                if not (file_obj and hasattr(file_obj, "name") and hasattr(file_obj, "body")):
                    continue

                original_name = file_obj.name or "file"
                # Extract base name
                if "/" in original_name:
                    original_name = original_name.split("/")[-1]
                elif "\\" in original_name:
                    original_name = original_name.split("\\")[-1]

                # Make unique filename
                unique_prefix = uuid.uuid4().hex
                stored_name = f"{unique_prefix}_{original_name}"
                file_path = uploads_folder / stored_name

                body_bytes = getattr(file_obj, "body", None)
                # Allow zero-length files; only skip when body is None (missing)
                if body_bytes is None:
                    continue

                try:
                    # Write file to local folder
                    with open(file_path, "wb") as f:
                        f.write(body_bytes)

                    entry: dict[str, Any] = {"file_name": stored_name}
                    # Merge optional extra form fields into each entry
                    if extra_fields:
                        entry.update(extra_fields)
                    stored_file_entries.append(entry)
                except Exception as e:
                    raise SanicException(
                        status_code=HTTPStatus.INTERNAL_SERVER_ERROR, message=f"File upload failed: {e}"
                    )

        if not stored_file_entries:
            raise SanicException(status_code=HTTPStatus.BAD_REQUEST, message="No valid files to upload")

        # Return uploaded files info
        return response.json(
            {
                "message": "Files uploaded successfully",
                "files": stored_file_entries,
                "folder": str(uploads_folder),
            },
            status=HTTPStatus.OK,
        )

class DesignFileServeView(HTTPMethodView):
    @openapi.definition(
        response={
            200: dict[str, Any],
            400: ErrorResponse,
            404: NotFoundResponse,
        },
    )
    async def get(self, request: Request, file_path: str) -> Any:
        """
        Serve a file from the OUTPUT_DIR by path.
        
        Supports both simple paths (e.g., /files/checks/file.cif) and nested paths
        (e.g., /files/boltzgen_outputs/job_id/final_ranked_designs/file.csv).
        
        Parameters
        ----------
        file_path : str
            Relative path from OUTPUT_DIR (e.g., "checks/file.cif" or "boltzgen_outputs/job_id/final_ranked_designs/file.csv")
        """
        # Build file path
        output_dir = Path(settings.OUTPUT_DIR)
        # Split the path and join it safely
        path_parts = file_path.split("/")
        full_path = output_dir / Path(*path_parts)
        
        # Security check: ensure the file is within the allowed directory
        try:
            full_path.resolve().relative_to(output_dir.resolve())
        except ValueError:
            raise SanicException(
                status_code=HTTPStatus.BAD_REQUEST,
                message="Invalid file path - path must be within output directory",
            )
        
        # Validate that the first folder is allowed
        first_folder = path_parts[0] if path_parts else None
        allowed_folders = {"checks", "uploads", "boltzgen_outputs"}
        if first_folder not in allowed_folders:
            raise SanicException(
                status_code=HTTPStatus.BAD_REQUEST,
                message=f"Invalid folder. Allowed folders: {', '.join(allowed_folders)}",
            )
        
        # Check if file exists
        if not full_path.exists():
            raise SanicException(
                status_code=HTTPStatus.NOT_FOUND,
                message=f"File not found: {file_path}",
            )
        
        # Check if it's a file (not a directory)
        if not full_path.is_file():
            raise SanicException(
                status_code=HTTPStatus.BAD_REQUEST,
                message=f"Path is not a file: {file_path}",
            )
        
        # Determine content type based on file extension
        filename = path_parts[-1]
        content_type = "application/octet-stream"
        if filename.endswith(".cif"):
            content_type = "chemical/x-cif"
        elif filename.endswith(".yaml") or filename.endswith(".yml"):
            content_type = "application/x-yaml"
        elif filename.endswith(".json"):
            content_type = "application/json"
        elif filename.endswith(".txt"):
            content_type = "text/plain"
        elif filename.endswith(".csv"):
            content_type = "text/csv"
        elif filename.endswith(".pdf"):
            content_type = "application/pdf"
        
        # Read and serve the file
        try:
            with open(full_path, "rb") as f:
                file_content = f.read()
            
            # Escape filename for Content-Disposition header
            safe_filename = filename.replace('"', '\\"')
            
            return response.raw(
                file_content,
                content_type=content_type,
                headers={
                    "Content-Disposition": f'attachment; filename="{safe_filename}"',
                },
            )
        except Exception as e:
            raise SanicException(
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
                message=f"Error reading file: {str(e)}",
            )

class DesignCreateView(HTTPMethodView):
    @openapi.definition(
        response={
            200: dict[str, Any],
            400: ErrorResponse,
            500: ErrorResponse,
        },
    )
    @validate(json=DesignInput)
    async def post(self, request: Request, body: DesignInput) -> Any:
        """
        Create a new design job in the database.
        
        Receives the same payload as the design check endpoint and creates a DesignJob
        record with status PENDING.
        """
        # Get database session from request context
        db: AsyncSession = request.ctx.postgres_db
        
        try:
            # Create a new DesignJob
            design_job = DesignJob(
                input_yaml_filename=body.inputYamlFilename,
                budget=body.budget,
                protocol_name=body.protocolName,
                num_designs=body.numDesigns,
                status=DesignJobStatus.PENDING,
                pipeline_name=body.pipelineName,
                operating_mode=body.operatingMode,
            )
            
            # Add to session
            db.add(design_job)
            await db.flush()  # Flush to get the ID without committing
            job_id = design_job.id
            
            # Commit the job creation
            await db.commit()
            
            # Start the boltzgen pipeline in the background
            asyncio.create_task(
                run_boltzgen_pipeline(
                    job_id=job_id,
                    input_yaml_filename=body.inputYamlFilename,
                    protocol_name=body.protocolName,
                    num_designs=body.numDesigns,
                    budget=body.budget,
                )
            )
            
            # Convert to dict for response
            job_dict = design_job.to_dict()
            
            # Convert non-JSON-serializable types to strings
            for key, value in job_dict.items():
                if isinstance(value, uuid.UUID):
                    job_dict[key] = str(value)
                elif isinstance(value, datetime):
                    job_dict[key] = value.isoformat()
                elif hasattr(value, "value"):  # Handle enums
                    job_dict[key] = value.value
            
            return response.json(
                {
                    "message": "Design job created successfully and pipeline started",
                    "job": job_dict,
                },
                status=HTTPStatus.CREATED,
            )
            
        except Exception as e:
            await db.rollback()
            raise SanicException(
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
                message=f"Failed to create design job: {str(e)}",
            )

class DesignCreateDualTargetView(HTTPMethodView):
    @openapi.definition(
        response={
            200: dict[str, Any],
            400: ErrorResponse,
            500: ErrorResponse,
        },
    )
    @validate(json=DesignInput)
    async def post(self, request: Request, body: DesignInput) -> Any:
        """
        Create a new dual-target design job and start the same BoltzGen pipeline.
        
        This reuses the standard run_boltzgen_pipeline; behavior is identical to /design/create.
        """
        db: AsyncSession = request.ctx.postgres_db

        try:
            design_job = DesignJob(
                input_yaml_filename=body.inputYamlFilename,
                budget=body.budget,
                protocol_name=body.protocolName,
                num_designs=body.numDesigns,
                status=DesignJobStatus.PENDING,
                pipeline_name=body.pipelineName,
                operating_mode=body.operatingMode,
            )

            db.add(design_job)
            await db.flush()
            job_id = design_job.id
            await db.commit()

            asyncio.create_task(
                run_boltzgen_pipeline(
                    job_id=job_id,
                    input_yaml_filename=body.inputYamlFilename,
                    protocol_name=body.protocolName,
                    num_designs=body.numDesigns,
                    budget=body.budget,
                    fasta_filename=body.fastaFileFilename,
                    run_dual_targets=True,
                )
            )

            job_dict = design_job.to_dict()
            for key, value in job_dict.items():
                if isinstance(value, uuid.UUID):
                    job_dict[key] = str(value)
                elif isinstance(value, datetime):
                    job_dict[key] = value.isoformat()
                elif hasattr(value, "value"):
                    job_dict[key] = value.value

            return response.json(
                {
                    "message": "Dual-target design job created successfully and pipeline started",
                    "job": job_dict,
                },
                status=HTTPStatus.CREATED,
            )

        except Exception as e:
            await db.rollback()
            raise SanicException(
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
                message=f"Failed to create dual-target design job: {str(e)}",
            )

class DesignListView(HTTPMethodView):
    @openapi.definition(
        response={
            200: dict[str, Any],
            500: ErrorResponse,
        },
    )
    async def get(self, request: Request) -> Any:
        """
        List all design jobs in the database.
        
        Returns a list of all DesignJob records ordered by creation date (newest first).
        """
        # Get database session from request context
        db: AsyncSession = request.ctx.postgres_db
        
        try:
            # Query all design jobs, ordered by created_at descending
            stmt = select(DesignJob).order_by(DesignJob.created_at.desc())
            result = await db.execute(stmt)
            design_jobs = result.scalars().all()
            
            # Convert to list of dicts with proper serialization
            jobs_list = []
            for job in design_jobs:
                job_dict = job.to_dict()
                # Convert non-JSON-serializable types to strings
                for key, value in job_dict.items():
                    if isinstance(value, uuid.UUID):
                        job_dict[key] = str(value)
                    elif isinstance(value, datetime):
                        job_dict[key] = value.isoformat()
                    elif hasattr(value, "value"):  # Handle enums
                        job_dict[key] = value.value
                jobs_list.append(job_dict)
            
            return response.json(
                {
                    "message": "Design jobs retrieved successfully",
                    "count": len(jobs_list),
                    "jobs": jobs_list,
                },
                status=HTTPStatus.OK,
            )
            
        except Exception as e:
            raise SanicException(
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
                message=f"Failed to retrieve design jobs: {str(e)}",
            )

class DesignResultsView(HTTPMethodView):
    @openapi.definition(
        response={
            200: dict[str, Any],
            404: NotFoundResponse,
            500: ErrorResponse,
        },
    )
    async def get(self, request: Request, job_id: str) -> Any:
        """
        List available result files for a design job.
        
        Returns a JSON response with file paths that can be accessed via /v1/files/...
        """
        # Get database session from request context
        db: AsyncSession = request.ctx.postgres_db
        
        try:
            # Parse job ID
            try:
                job_uuid = uuid.UUID(job_id)
            except ValueError:
                raise SanicException(
                    status_code=HTTPStatus.BAD_REQUEST,
                    message=f"Invalid job ID format: {job_id}",
                )
            
            # Query the design job
            stmt = select(DesignJob).where(DesignJob.id == job_uuid)
            result = await db.execute(stmt)
            design_job = result.scalar_one_or_none()
            
            if not design_job:
                raise SanicException(
                    status_code=HTTPStatus.NOT_FOUND,
                    message=f"Design job not found: {job_id}",
                )
            
            # Build the job output directory path
            output_dir = Path(settings.OUTPUT_DIR)
            base_job_output_dir = output_dir / "boltzgen_outputs" / str(job_id)
            job_output_dir = base_job_output_dir
            
            # If operating_mode is BINDER_OPTIMIZATION, append "workbench" to the path
            if design_job.operating_mode == "BINDER_OPTIMIZATION":
                job_output_dir = job_output_dir / "workbench" 
            
            # Get the input YAML filename stem (without extension) for pattern matching
            yaml_stem = Path(design_job.input_yaml_filename).stem
            
            # List of files to check for
            files_to_check = []
            
            # Add the input YAML file
            input_yaml_path = output_dir / "uploads" / design_job.input_yaml_filename
            if input_yaml_path.exists():
                relative_path = input_yaml_path.relative_to(output_dir)
                files_to_check.append({
                    "name": design_job.input_yaml_filename,
                    "path": str(relative_path),
                    "url": f"/v1/files/{'/'.join(relative_path.parts)}",
                })
            
            # Root level CIF file
            root_cif = job_output_dir / f"{yaml_stem}.cif"
            if root_cif.exists():
                relative_path = root_cif.relative_to(output_dir)
                files_to_check.append({
                    "name": root_cif.name,
                    "path": str(relative_path),
                    "url": f"/v1/files/{'/'.join(relative_path.parts)}",
                })
            
            # Final ranked designs files
            final_ranked_dir = job_output_dir / "final_ranked_designs"
            if final_ranked_dir.exists():
                # all_designs_metrics.csv
                all_metrics = final_ranked_dir / "all_designs_metrics.csv"
                if all_metrics.exists():
                    relative_path = all_metrics.relative_to(output_dir)
                    files_to_check.append({
                        "name": all_metrics.name,
                        "path": str(relative_path),
                        "url": f"/v1/files/{'/'.join(relative_path.parts)}",
                    })
                
                # final_designs_metrics_2.csv
                final_metrics = final_ranked_dir / f"final_designs_metrics_{design_job.budget}.csv"
                if final_metrics.exists():
                    relative_path = final_metrics.relative_to(output_dir)
                    files_to_check.append({
                        "name": final_metrics.name,
                        "path": str(relative_path),
                        "url": f"/v1/files/{'/'.join(relative_path.parts)}",
                    })
                
                # results_overview.pdf
                results_pdf = final_ranked_dir / "results_overview.pdf"
                if results_pdf.exists():
                    relative_path = results_pdf.relative_to(output_dir)
                    files_to_check.append({
                        "name": results_pdf.name,
                        "path": str(relative_path),
                        "url": f"/v1/files/{'/'.join(relative_path.parts)}",
                    })
                
                # Final designs directory
                final_designs_dir = final_ranked_dir / f"final_{design_job.budget}_designs"
                if final_designs_dir.exists():
                    # Check for rank files in final_designs directory (excluding before_refolding subdirectory)
                    for rank_file in sorted(final_designs_dir.glob("rank*.cif")):
                        if rank_file.is_file() and rank_file.parent == final_designs_dir:
                            relative_path = rank_file.relative_to(output_dir)
                            files_to_check.append({
                                "name": rank_file.name,
                                "path": str(relative_path),
                                "url": f"/v1/files/{'/'.join(relative_path.parts)}",
                            })
                    
                    # Check before_refolding subdirectory
                    before_refolding_dir = final_designs_dir / "before_refolding"
                    if before_refolding_dir.exists():
                        for rank_file in sorted(before_refolding_dir.glob("rank*.cif")):
                            if rank_file.is_file():
                                relative_path = rank_file.relative_to(output_dir)
                                files_to_check.append({
                                    "name": rank_file.name,
                                    "path": str(relative_path),
                                    "url": f"/v1/files/{'/'.join(relative_path.parts)}",
                                })
            
            # Intermediate designs inverse folded files
            intermediate_dir = job_output_dir / "intermediate_designs_inverse_folded"
            if intermediate_dir.exists():
                # aggregate_metrics_analyze.csv
                aggregate_metrics = intermediate_dir / "aggregate_metrics_analyze.csv"
                if aggregate_metrics.exists():
                    relative_path = aggregate_metrics.relative_to(output_dir)
                    files_to_check.append({
                        "name": aggregate_metrics.name,
                        "path": str(relative_path),
                        "url": f"/v1/files/{'/'.join(relative_path.parts)}",
                    })
                
                # per_target_metrics_analyze.csv
                per_target_metrics = intermediate_dir / "per_target_metrics_analyze.csv"
                if per_target_metrics.exists():
                    relative_path = per_target_metrics.relative_to(output_dir)
                    files_to_check.append({
                        "name": per_target_metrics.name,
                        "path": str(relative_path),
                        "url": f"/v1/files/{'/'.join(relative_path.parts)}",
                    })
            
            # Additional files for BINDER_OPTIMIZATION mode
            if design_job.operating_mode == "BINDER_OPTIMIZATION":
                # ranked_designs.csv at base level
                ranked_designs_csv = base_job_output_dir / "ranked_designs.csv"
                if ranked_designs_csv.exists():
                    relative_path = ranked_designs_csv.relative_to(output_dir)
                    files_to_check.append({
                        "name": ranked_designs_csv.name,
                        "path": str(relative_path),
                        "url": f"/v1/files/{'/'.join(relative_path.parts)}",
                    })
                
                # Files in plots directory
                plots_dir = base_job_output_dir / "plots"
                if plots_dir.exists():
                    plot_files = [
                        "affinity_vs_selectivity.png",
                        "binding_profile_heatmap.png",
                        "pareto_frontier.png",
                        "selectivity_dashboard.png",
                        "summary_statistics.csv"
                    ]
                    for plot_file in plot_files:
                        plot_path = plots_dir / plot_file
                        if plot_path.exists():
                            relative_path = plot_path.relative_to(output_dir)
                            files_to_check.append({
                                "name": plot_file,
                                "path": str(relative_path),
                                "url": f"/v1/files/{'/'.join(relative_path.parts)}",
                            })
            
            # Convert to dict for response
            job_dict = design_job.to_dict()
            
            # Convert non-JSON-serializable types to strings
            for key, value in job_dict.items():
                if isinstance(value, uuid.UUID):
                    job_dict[key] = str(value)
                elif isinstance(value, datetime):
                    job_dict[key] = value.isoformat()
                elif hasattr(value, "value"):  # Handle enums
                    job_dict[key] = value.value
            
            return response.json(
                {
                    "message": "Design job results retrieved successfully",
                    "job": job_dict,
                    "files": files_to_check,
                    "count": len(files_to_check),
                },
                status=HTTPStatus.OK,
            )
            
        except SanicException:
            raise
        except Exception as e:
            raise SanicException(
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
                message=f"Failed to retrieve design job results: {str(e)}",
            )

class DesignCreateBinderOptimizationView(HTTPMethodView):
    @openapi.definition(
        response={
            200: dict[str, Any],
            400: ErrorResponse,
            500: ErrorResponse,
        },
    )
    @validate(json=DesignInput)
    async def post(self, request: Request, body: DesignInput) -> Any:
        """
        Create a new design job in the database.
        
        Receives the same payload as the design check endpoint and creates a DesignJob
        record with status PENDING, then starts the binder optimization pipeline.
        """
        # Get database session from request context
        db: AsyncSession = request.ctx.postgres_db
        
        try:
            # Create a new DesignJob
            design_job = DesignJob(
                input_yaml_filename=body.inputYamlFilename,
                budget=body.budget,
                protocol_name=body.protocolName,
                num_designs=body.numDesigns,
                status=DesignJobStatus.PENDING,
                pipeline_name=body.pipelineName,
                operating_mode=body.operatingMode,
            )
            
            # Add to session
            db.add(design_job)
            await db.flush()  # Flush to get the ID without committing
            job_id = design_job.id
            
            # Commit the job creation
            await db.commit()
            
            # Start the binder optimization pipeline in the background
            asyncio.create_task(
                run_binder_optimization_pipeline(
                    job_id=job_id,
                    input_yaml_filename=body.inputYamlFilename,
                )
            )
            
            # Convert to dict for response
            job_dict = design_job.to_dict()
            
            # Convert non-JSON-serializable types to strings
            for key, value in job_dict.items():
                if isinstance(value, uuid.UUID):
                    job_dict[key] = str(value)
                elif isinstance(value, datetime):
                    job_dict[key] = value.isoformat()
                elif hasattr(value, "value"):  # Handle enums
                    job_dict[key] = value.value
            
            return response.json(
                {
                    "message": "Design job created successfully and pipeline started",
                    "job": job_dict,
                },
                status=HTTPStatus.CREATED,
            )
            
        except Exception as e:
            await db.rollback()
            raise SanicException(
                status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
                message=f"Failed to create design job: {str(e)}",
            )

design_v1.add_route(DesignCheckView.as_view(), "/design/check")
design_v1.add_route(DesignCreateView.as_view(), "/design/create")
design_v1.add_route(DesignListView.as_view(), "/design/list")
design_v1.add_route(DesignResultsView.as_view(), "/design/results/<job_id>")
design_v1.add_route(DesignFileView.as_view(), "/upload")
design_v1.add_route(DesignFileServeView.as_view(), "/files/<file_path:path>")
design_v1.add_route(DesignCreateBinderOptimizationView.as_view(), "/design/create/binder-optimization")
design_v1.add_route(StructureBasedBindersSpecView.as_view(), "/design/structure-based-binders/spec")
design_v1.add_route(DesignCreateDualTargetView.as_view(), "/design/create/dual-target")