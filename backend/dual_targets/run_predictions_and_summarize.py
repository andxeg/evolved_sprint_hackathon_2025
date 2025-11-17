#!/usr/bin/env python3
"""
Run boltz predict on YAML files and summarize protein-protein iptm scores.

This script:
1. Runs boltz predict on all YAML files in a directory
2. Extracts protein-protein iptm scores from predictions
3. Summarizes results in a CSV file
"""

import argparse
import glob
import json
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional
import pandas as pd
import numpy as np


def extract_iptm_from_boltz(prediction_dir: Path, yaml_stem: str) -> Optional[Dict[str, float]]:
    """
    Extract ipTM and PAE scores from Boltz prediction outputs.
    
    According to Boltz documentation, the output structure is:
    out_dir/
    ├── predictions/
        ├── [input_file1]/
            ├── confidence_[input_file1]_model_0.json
    
    Returns:
        Dict with 'iptm' and 'pae' keys, or None if not found
    """
    
    # Prefer Boltz-2 actual structure:
    # out_dir/boltz_results_[yaml_stem]/predictions/[yaml_stem]/confidence_[yaml_stem]_model_0.json
    boltz2_dir = prediction_dir / f"boltz_results_{yaml_stem}" / "predictions" / yaml_stem
    boltz2_conf = boltz2_dir / f"confidence_{yaml_stem}_model_0.json"
    print(f"Checking for confidence file (boltz2) at: {boltz2_conf}")
    if boltz2_conf.exists():
        try:
            with open(boltz2_conf, "r") as f:
                data = json.load(f)
            result: Dict[str, float] = {}
            if "protein_iptm" in data:
                result["iptm"] = float(data["protein_iptm"])
            elif "iptm" in data:
                result["iptm"] = float(data["iptm"])
            # PAE alongside in the same directory
            pae_file = boltz2_dir / f"pae_{yaml_stem}_model_0.npz"
            if pae_file.exists():
                try:
                    pae_npz = np.load(pae_file)
                    if "pae" in pae_npz:
                        pae_matrix = pae_npz["pae"]
                    else:
                        pae_matrix = pae_npz[pae_npz.files[0]]
                    result["pae"] = float(np.mean(pae_matrix))
                except Exception as e:
                    print(f"      ⚠ Could not load PAE from npz: {e}")
            if "iptm" in result:
                return result
        except Exception as e:
            print(f"      ⚠ Error reading boltz2 confidence file: {e}")
    
    # Fallback to older/default structure:
    # out_dir/predictions/[yaml_stem]/confidence_[yaml_stem]_model_0.json
    confidence_file = prediction_dir / "predictions" / yaml_stem / f"confidence_{yaml_stem}_model_0.json"
    print(f"Checking for confidence file at: {confidence_file}")
    if confidence_file.exists():
        try:
            with open(confidence_file, 'r') as f:
                data = json.load(f)
            result = {}
            if 'protein_iptm' in data:
                result['iptm'] = float(data['protein_iptm'])
            elif 'iptm' in data:
                result['iptm'] = float(data['iptm'])
            pae_file = prediction_dir / "predictions" / yaml_stem / f"pae_{yaml_stem}_model_0.npz"
            if pae_file.exists():
                try:
                    pae_npz = np.load(pae_file)
                    if 'pae' in pae_npz:
                        pae_matrix = pae_npz['pae']
                    else:
                        pae_matrix = pae_npz[pae_npz.files[0]]
                    result['pae'] = float(np.mean(pae_matrix))
                except Exception as e:
                    print(f"      ⚠ Could not load PAE from npz: {e}")
            if 'iptm' in result:
                return result
        except Exception as e:
            print(f"      ⚠ Error reading confidence file: {e}")
    
    # Fallback: search for any confidence JSON file
    # Try globbing inside boltz2 structure
    boltz2_pred_dir = prediction_dir / f"boltz_results_{yaml_stem}" / "predictions"
    print(f"Checking for predictions directory at: {boltz2_pred_dir}")
    if boltz2_pred_dir.exists():
        json_pattern = str(boltz2_pred_dir / yaml_stem / "*_confidence*.json")
        json_files = glob.glob(json_pattern)
        print(f"Found {len(json_files)} confidence JSON files")
        for json_file in json_files:
            try:
                with open(json_file, 'r') as f:
                    data = json.load(f)
                result = {}
                if 'iptm' in data:
                    result['iptm'] = float(data['iptm'])
                if 'protein_iptm' in data:
                    result['iptm'] = float(data['protein_iptm'])
                # Optional PAE
                npz_candidate = Path(json_file).with_name(f"pae_{yaml_stem}_model_0.npz")
                if npz_candidate.exists():
                    try:
                        pae_npz = np.load(npz_candidate)
                        if 'pae' in pae_npz:
                            pae_matrix = pae_npz['pae']
                        else:
                            pae_matrix = pae_npz[pae_npz.files[0]]
                        result['pae'] = float(np.mean(pae_matrix))
                    except Exception:
                        pass
                if 'iptm' in result:
                    return result
            except Exception:
                continue
    
    # Original fallback globbing
    boltz_pred_dir = prediction_dir / yaml_stem / "predictions"
    print(f"Checking for predictions directory at: {boltz_pred_dir}")
    if boltz_pred_dir.exists():
        json_pattern = str(boltz_pred_dir / "*_confidence*.json")
        json_files = glob.glob(json_pattern)
        print(f"Found {len(json_files)} confidence JSON files")
        for json_file in json_files:
            try:
                with open(json_file, 'r') as f:
                    data = json.load(f)
                    result = {}
                    
                    if 'iptm' in data:
                        result['iptm'] = float(data['iptm'])
                    
                    if 'pae' in data:
                        pae_data = data['pae']
                        if isinstance(pae_data, (list, np.ndarray)):
                            result['pae'] = float(np.mean(pae_data))
                        else:
                            result['pae'] = float(pae_data)
                    
                    if 'iptm' in result:
                        return result
            except Exception:
                continue
    
    # Last resort: try alternative output structures
    alt_paths = [
        prediction_dir / "predictions" / yaml_stem / "predictions",
        prediction_dir / "predictions",
    ]
    
    for alt_dir in alt_paths:
        if alt_dir.exists():
            json_pattern = str(alt_dir / "*_confidence*.json")
            json_files = glob.glob(json_pattern)
            for json_file in json_files:
                try:
                    with open(json_file, 'r') as f:
                        data = json.load(f)
                        result = {}
                        
                        if 'iptm' in data:
                            result['iptm'] = float(data['iptm'])
                        
                        if 'pae' in data:
                            pae_data = data['pae']
                            if isinstance(pae_data, (list, np.ndarray)):
                                result['pae'] = float(np.mean(pae_data))
                            else:
                                result['pae'] = float(pae_data)
                        
                        if 'iptm' in result:
                            return result
                except Exception:
                    continue
    
    return None


def run_boltz_predict(yaml_file: Path, output_dir: Path, use_msa_server: bool = True, use_gpu: bool = True, boltz_env: str = None) -> bool:
    """Run boltz predict on a single YAML file."""
    # Use the correct option name: --out_dir (not --output_dir)
    cmd = [ 'uv', 'run', 'boltz', 'predict', str(yaml_file), '--out_dir', str(output_dir)]
    
    if use_msa_server:
        cmd.append('--use_msa_server')
    
    # Note: boltz predict uses --accelerator flag for device selection
    # Default is 'gpu', so we don't need to specify unless using CPU
    if not use_gpu:
        cmd.append('--accelerator')
        cmd.append('cpu')
    
    try:
        # If boltz_env is provided, use conda run to execute in that environment
        if boltz_env:
            # Use conda run to execute command in the specified environment
            conda_cmd = ['conda', 'run', '-n', boltz_env] + cmd
            result = subprocess.run(
                conda_cmd,
                capture_output=True,
                text=True,
                check=True,
                timeout=3600  # 1 hour timeout per prediction
            )
        else:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True,
                timeout=3600  # 1 hour timeout per prediction
            )
        return True
    except subprocess.TimeoutExpired:
        print(f"      ❌ Timeout running boltz predict", file=sys.stderr)
        return False
    except subprocess.CalledProcessError as e:
        print(f"      ❌ Error running boltz predict: {e}", file=sys.stderr)
        if e.stderr:
            print(f"      stderr: {e.stderr[:500]}", file=sys.stderr)  # Limit output
        return False
    except FileNotFoundError:
        print(f"      ❌ Error: 'boltz' command not found. Make sure boltz is installed and in PATH", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Run boltz predict on YAML files and summarize iptm scores"
    )
    parser.add_argument(
        '--yaml-dir',
        type=Path,
        required=True,
        help='Directory containing YAML files to predict'
    )
    parser.add_argument(
        '--output-dir',
        type=Path,
        required=True,
        help='Directory to save prediction outputs'
    )
    parser.add_argument(
        '--summary-csv',
        type=Path,
        default=None,
        help='Path to save summary CSV (default: yaml_dir/prediction_summary.csv)'
    )
    parser.add_argument(
        '--use-msa-server',
        action='store_true',
        default=True,
        help='Use MSA server for predictions (default: True)'
    )
    parser.add_argument(
        '--no-msa-server',
        dest='use_msa_server',
        action='store_false',
        help='Do not use MSA server'
    )
    parser.add_argument(
        '--use-gpu',
        action='store_true',
        default=True,
        help='Use GPU for predictions (default: True)'
    )
    parser.add_argument(
        '--no-gpu',
        dest='use_gpu',
        action='store_false',
        help='Do not use GPU'
    )
    parser.add_argument(
        '--skip-existing',
        action='store_true',
        help='Skip predictions that already have results'
    )
    parser.add_argument(
        '--boltz-env',
        type=str,
        default=None,
        help='Conda environment name to activate before running boltz (e.g., "boltz")'
    )
    
    args = parser.parse_args()
    
    # Validate inputs
    if not args.yaml_dir.exists():
        print(f"❌ Error: YAML directory not found: {args.yaml_dir}", file=sys.stderr)
        sys.exit(1)
    
    # Create output directory
    args.output_dir.mkdir(parents=True, exist_ok=True)
    
    # Find all YAML files
    yaml_files = list(args.yaml_dir.glob('*.yaml'))
    if not yaml_files:
        print(f"❌ Error: No YAML files found in {args.yaml_dir}", file=sys.stderr)
        sys.exit(1)
    
    print(f"📁 Found {len(yaml_files)} YAML files")
    print(f"📤 Output directory: {args.output_dir}")
    print(f"🔧 Using MSA server: {args.use_msa_server}")
    print(f"🔧 Using GPU: {args.use_gpu}")
    if args.boltz_env:
        print(f"🔧 Using conda environment: {args.boltz_env}")
    print()
    
    # Run predictions and collect results
    results = []
    
    for i, yaml_file in enumerate(yaml_files, 1):
        design_id = yaml_file.stem
        print(f"[{i}/{len(yaml_files)}] Processing {design_id}...")
        
        # Check if we should skip
        if args.skip_existing:
            yaml_stem = yaml_file.stem
            confidence_file = args.output_dir / "predictions" / yaml_stem / f"confidence_{yaml_stem}_model_0.json"
            if confidence_file.exists():
                print(f"   ⏭ Skipping (results already exist)")
                # Still try to extract existing results
                metrics = extract_iptm_from_boltz(args.output_dir, yaml_stem)
                if metrics:
                    results.append({
                        'design_id': design_id,
                        'yaml_file': str(yaml_file),
                        'iptm': metrics.get('iptm', None),
                        'pae': metrics.get('pae', None),
                        'status': 'existing'
                    })
                continue
        
        # Run prediction
        print(f"   🚀 Running boltz predict...")
        success = run_boltz_predict(yaml_file, args.output_dir, args.use_msa_server, args.use_gpu, args.boltz_env)
        
        if not success:
            results.append({
                'design_id': design_id,
                'yaml_file': str(yaml_file),
                'iptm': None,
                'pae': None,
                'status': 'failed'
            })
            continue
        
        # Extract metrics
        print(f"   📊 Extracting metrics...")
        yaml_stem = yaml_file.stem
        metrics = extract_iptm_from_boltz(args.output_dir, yaml_stem)
        
        if metrics:
            iptm = metrics.get('iptm', None)
            pae = metrics.get('pae', None)
            print(f"   ✓ ipTM = {iptm:.3f}" if iptm else "   ⚠ No ipTM found")
            if pae:
                print(f"   ✓ PAE = {pae:.2f}")
            
            results.append({
                'design_id': design_id,
                'yaml_file': str(yaml_file),
                'iptm': iptm,
                'pae': pae,
                'status': 'success'
            })
        else:
            print(f"   ⚠ Could not extract metrics")
            results.append({
                'design_id': design_id,
                'yaml_file': str(yaml_file),
                'iptm': None,
                'pae': None,
                'status': 'no_metrics'
            })
        
        print()
    
    # Create summary DataFrame
    df = pd.DataFrame(results)
    
    # Save summary
    if args.summary_csv is None:
        summary_csv = args.yaml_dir / 'prediction_summary.csv'
    else:
        summary_csv = args.summary_csv
    
    df.to_csv(summary_csv, index=False)
    print(f"✅ Summary saved to {summary_csv}")
    
    # Print statistics
    print()
    print("=" * 60)
    print("SUMMARY STATISTICS")
    print("=" * 60)
    
    successful = df[df['status'] == 'success']
    if len(successful) > 0:
        iptm_values = successful['iptm'].dropna()
        if len(iptm_values) > 0:
            print(f"✓ Successful predictions: {len(successful)}")
            print(f"  ipTM - Mean: {iptm_values.mean():.3f}")
            print(f"  ipTM - Median: {iptm_values.median():.3f}")
            print(f"  ipTM - Min: {iptm_values.min():.3f}")
            print(f"  ipTM - Max: {iptm_values.max():.3f}")
            print(f"  ipTM - Std: {iptm_values.std():.3f}")
            
            if 'pae' in successful.columns:
                pae_values = successful['pae'].dropna()
                if len(pae_values) > 0:
                    print(f"  PAE - Mean: {pae_values.mean():.2f}")
                    print(f"  PAE - Median: {pae_values.median():.2f}")
        else:
            print(f"⚠ No valid ipTM scores found")
    else:
        print("⚠ No successful predictions")
    
    print()
    print(f"Status breakdown:")
    for status, count in df['status'].value_counts().items():
        print(f"  {status}: {count}")


if __name__ == '__main__':
    main()