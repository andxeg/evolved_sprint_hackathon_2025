import argparse
import asyncio
import json
import os
import subprocess
import sys
import traceback
import uuid
from datetime import datetime
from http import HTTPStatus
from io import StringIO
from pathlib import Path
from typing import Any

import msgspec
from sanic import Blueprint, response
from sanic.exceptions import SanicException
from sanic.request import Request
from sanic.views import HTTPMethodView
from sanic_ext import validate
from sanic_ext.extensions.openapi import openapi

from api.design.models import DesignJob, DesignJobStatus
from api.design.serializers import DesignInput
from boltzgen.cli.boltzgen import ARTIFACTS, check_design_spec, get_artifact_path, run_command
from boltzgen.data.mol import load_canonicals
from core.config import settings

# Import config_dir from boltzgen.cli.boltzgen
# We need to compute it the same way as boltzgen does
from boltzgen.cli import boltzgen as boltzgen_cli
from core.postgres_db import async_session_maker
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from urllib.parse import quote


class ErrorResponse(msgspec.Struct):
    message: str


class NotFoundResponse(ErrorResponse):
    pass


design_v1 = Blueprint("design", version=1)


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
    async def get(self, request: Request, folder: str, filename: str) -> Any:
        """
        Serve a file from the OUTPUT_DIR by folder and filename.
        
        Parameters
        ----------
        folder : str
            The folder name (e.g., "checks", "uploads")
        filename : str
            The filename to serve
        """
        # Validate folder name to prevent directory traversal
        allowed_folders = {"checks", "uploads"}
        if folder not in allowed_folders:
            raise SanicException(
                status_code=HTTPStatus.BAD_REQUEST,
                message=f"Invalid folder. Allowed folders: {', '.join(allowed_folders)}",
            )
        
        # Build file path
        output_dir = Path(settings.OUTPUT_DIR)
        file_path = output_dir / folder / filename
        
        # Security check: ensure the file is within the allowed directory
        try:
            file_path.resolve().relative_to(output_dir.resolve())
        except ValueError:
            raise SanicException(
                status_code=HTTPStatus.BAD_REQUEST,
                message="Invalid file path",
            )
        
        # Check if file exists
        if not file_path.exists():
            raise SanicException(
                status_code=HTTPStatus.NOT_FOUND,
                message=f"File not found: {filename} in folder {folder}",
            )
        
        # Check if it's a file (not a directory)
        if not file_path.is_file():
            raise SanicException(
                status_code=HTTPStatus.BAD_REQUEST,
                message=f"Path is not a file: {filename}",
            )
        
        # Determine content type based on file extension
        content_type = "application/octet-stream"
        if filename.endswith(".cif"):
            content_type = "chemical/x-cif"
        elif filename.endswith(".yaml") or filename.endswith(".yml"):
            content_type = "application/x-yaml"
        elif filename.endswith(".json"):
            content_type = "application/json"
        elif filename.endswith(".txt"):
            content_type = "text/plain"
        
        # Read and serve the file
        try:
            with open(file_path, "rb") as f:
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


async def run_boltzgen_pipeline(job_id: uuid.UUID, input_yaml_filename: str, protocol_name: str, num_designs: int, budget: int) -> None:
    """
    Run the boltzgen pipeline in the background and update job status.
    """
    # Create a new database session for this background task
    async with async_session_maker() as db:
        try:
            # Update status to RUNNING
            stmt = update(DesignJob).where(DesignJob.id == job_id).values(status=DesignJobStatus.RUNNING)
            await db.execute(stmt)
            await db.commit()
            
            # Build paths
            output_dir = Path(settings.OUTPUT_DIR)
            yaml_path = output_dir / "uploads" / input_yaml_filename
            
            # Validate YAML file exists
            if not yaml_path.exists():
                raise FileNotFoundError(f"Input YAML file not found: {yaml_path}")
            
            job_output_dir = output_dir / "boltzgen_outputs" / str(job_id)
            job_output_dir.mkdir(parents=True, exist_ok=True)
            
            # Create argparse.Namespace with required arguments
            args = argparse.Namespace()
            args.design_spec = [yaml_path]  # List of Path objects
            args.output = job_output_dir
            args.protocol = protocol_name
            args.num_designs = num_designs
            args.budget = budget
            args.moldir = ARTIFACTS["moldir"][0]
            args.force_download = False
            args.models_token = None
            args.cache = None
            args.config = None
            args.devices = None
            args.num_workers = 1
            # Set config_dir to the default value (boltzgen/resources/config)
            # Import it from the boltzgen module where it's defined
            args.config_dir = boltzgen_cli.config_dir
            args.use_kernels = "auto"
            args.diffusion_batch_size = None
            # Default design checkpoints (required, cannot be None)
            args.design_checkpoints = [
                ARTIFACTS["design-diverse"][0],
                ARTIFACTS["design-adherence"][0],
            ]
            args.step_scale = None
            args.noise_scale = None
            args.skip_inverse_folding = False
            args.inverse_fold_num_sequences = 1
            args.inverse_fold_checkpoint = ARTIFACTS["inverse-fold"][0]
            args.inverse_fold_avoid = None
            args.only_inverse_fold = False
            args.folding_checkpoint = ARTIFACTS["folding"][0]
            args.affinity_checkpoint = ARTIFACTS["affinity"][0]
            args.alpha = None
            args.filter_biased = "true"  # Default is "true"
            args.refolding_rmsd_threshold = None
            args.metrics_override = None
            args.additional_filters = None
            args.size_buckets = None
            args.steps = None
            args.subprocess = True  # --no_subprocess uses dest="subprocess" with action="store_false"
            args.reuse = False
            
            # Debug logging
            print(f"Running boltzgen pipeline for job {job_id}")
            print(f"YAML path: {yaml_path} (exists: {yaml_path.exists()})")
            print(f"Output dir: {job_output_dir}")
            print(f"Protocol: {protocol_name}, Designs: {num_designs}, Budget: {budget}")
            
            # Run the command directly (this is a blocking call, but we're in a background task)
            # We'll run it in a thread pool to avoid blocking the event loop
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, run_command, args)
            
            # If we get here, the command completed successfully
            new_status = DesignJobStatus.COMPLETED
            print(f"Boltzgen pipeline completed successfully for job {job_id}")
            
            # Update status in database
            stmt = update(DesignJob).where(DesignJob.id == job_id).values(status=new_status)
            await db.execute(stmt)
            await db.commit()
            
        except Exception as e:
            # Update status to FAILED on exception
            try:
                stmt = update(DesignJob).where(DesignJob.id == job_id).values(status=DesignJobStatus.FAILED)
                await db.execute(stmt)
                await db.commit()
            except Exception as db_error:
                await db.rollback()
                print(f"Error updating job status in database: {str(db_error)}")
            
            # Log the full exception with traceback
            error_trace = traceback.format_exc()
            print(f"Error running boltzgen pipeline for job {job_id}: {str(e)}")
            print(f"Traceback: {error_trace}")


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


design_v1.add_route(DesignCheckView.as_view(), "/design/check")
design_v1.add_route(DesignCreateView.as_view(), "/design/create")
design_v1.add_route(DesignListView.as_view(), "/design/list")
design_v1.add_route(DesignFileView.as_view(), "/upload")
design_v1.add_route(DesignFileServeView.as_view(), "/files/<folder>/<filename>")
