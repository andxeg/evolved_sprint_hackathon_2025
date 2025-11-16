import argparse
import asyncio
import subprocess

import traceback
import uuid
from datetime import datetime, timezone

from pathlib import Path

from api.design.models import DesignJob, DesignJobStatus

from boltzgen.cli.boltzgen import ARTIFACTS, run_command
from core.config import settings

# Import config_dir from boltzgen.cli.boltzgen
# We need to compute it the same way as boltzgen does
from boltzgen.cli import boltzgen as boltzgen_cli
from core.postgres_db import async_session_maker
from sqlalchemy import select, update


async def run_boltzgen_pipeline(
    job_id: uuid.UUID,
    input_yaml_filename: str,
    protocol_name: str,
    num_designs: int,
    budget: int,
    fasta_filename: str | None = None,
    run_dual_targets: bool = False,
) -> None:
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
            
            if run_dual_targets:
                await run_dual_targets_pipeline(job_id, input_yaml_filename, fasta_filename)
            
            # Calculate run_time_in_seconds
            run_time_seconds = None
            try:
                # Get the job to access created_at
                stmt = select(DesignJob).where(DesignJob.id == job_id)
                result = await db.execute(stmt)
                job = result.scalar_one_or_none()
                if job and job.created_at:
                    # Use timezone-naive datetime to match model's get_utc_now()
                    now = datetime.now(timezone.utc).replace(tzinfo=None)
                    created_at = job.created_at
                    if isinstance(created_at, datetime):
                        time_diff = now - created_at
                        run_time_seconds = int(time_diff.total_seconds())
            except Exception as time_error:
                # Don't block completion if time calculation fails
                print(f"Warning: Failed to calculate run_time_in_seconds for job {job_id}: {str(time_error)}")
            
            # Update status and run_time_in_seconds in database
            update_values = {"status": new_status}
            if run_time_seconds is not None:
                update_values["run_time_in_seconds"] = run_time_seconds
            
            stmt = update(DesignJob).where(DesignJob.id == job_id).values(**update_values)
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


async def run_binder_optimization_pipeline(job_id: uuid.UUID, input_yaml_filename: str) -> None:
    """
    Run the binder optimization pipeline in the background and update job status.
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
            
            # Get the backend root directory (parent of api/)
            backend_root = Path(__file__).parent.parent.parent
            script_path = backend_root / "scripts" / "optimize_binder.py"
            
            # Validate script exists
            if not script_path.exists():
                raise FileNotFoundError(f"Script not found: {script_path}")
            
            # Build command: uv run python scripts/optimize_binder.py <full input YAML path> --id <job_id>
            # Use relative path for script since we set cwd to backend_root
            cmd = [
                "uv", "run", "python", "scripts/optimize_binder.py",
                str(yaml_path),
                "--id", str(job_id)
            ]
            
            # Debug logging
            print(f"Running binder optimization pipeline for job {job_id}")
            print(f"YAML path: {yaml_path} (exists: {yaml_path.exists()})")
            print(f"Command: {' '.join(cmd)}")
            
            # Run the command in a thread pool to avoid blocking the event loop
            loop = asyncio.get_event_loop()
            process = await loop.run_in_executor(
                None,
                lambda: subprocess.run(
                    cmd,
                    cwd=str(backend_root),
                    check=True,
                    capture_output=False
                )
            )
            
            # If we get here, the command completed successfully
            new_status = DesignJobStatus.COMPLETED
            print(f"Binder optimization pipeline completed successfully for job {job_id}")
            
            # Calculate run_time_in_seconds
            run_time_seconds = None
            try:
                # Get the job to access created_at
                stmt = select(DesignJob).where(DesignJob.id == job_id)
                result = await db.execute(stmt)
                job = result.scalar_one_or_none()
                if job and job.created_at:
                    # Use timezone-naive datetime to match model's get_utc_now()
                    now = datetime.now(timezone.utc).replace(tzinfo=None)
                    created_at = job.created_at
                    if isinstance(created_at, datetime):
                        time_diff = now - created_at
                        run_time_seconds = int(time_diff.total_seconds())
            except Exception as time_error:
                # Don't block completion if time calculation fails
                print(f"Warning: Failed to calculate run_time_in_seconds for job {job_id}: {str(time_error)}")
            
            # Update status and run_time_in_seconds in database
            update_values = {"status": new_status}
            if run_time_seconds is not None:
                update_values["run_time_in_seconds"] = run_time_seconds
            
            stmt = update(DesignJob).where(DesignJob.id == job_id).values(**update_values)
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
            print(f"Error running binder optimization pipeline for job {job_id}: {str(e)}")
            print(f"Traceback: {error_trace}")
            
            
            
async def run_dual_targets_pipeline(job_id: uuid.UUID, input_yaml_filename: str, fasta_filename: str) -> None:
    """
    Run the dual-targets pipeline in the background and update job status.
    """
    pass