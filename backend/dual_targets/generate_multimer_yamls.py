#!/usr/bin/env python3
"""
Generate multimer YAML files for protein-protein interaction predictions.

This script:
1. Reads a target sequence from a FASTA file (protein A)
2. Reads designed sequences from a CSV file (protein B)
3. Generates one YAML file per CSV row with the target and designed sequence
"""

import argparse
import csv
import sys
from pathlib import Path
from typing import List, Tuple


def read_fasta(fasta_path: Path) -> str:
    """Read the first sequence from a FASTA file."""
    sequences = []
    current_seq = []
    
    with open(fasta_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line.startswith('>'):
                if current_seq:
                    sequences.append(''.join(current_seq))
                    current_seq = []
            else:
                current_seq.append(line)
        
        if current_seq:
            sequences.append(''.join(current_seq))
    
    if not sequences:
        raise ValueError(f"No sequences found in {fasta_path}")
    
    return sequences[0]


def read_csv_sequences(csv_path: Path) -> List[Tuple[str, str]]:
    """
    Read designed sequences from CSV file.
    
    Returns:
        List of tuples: (design_id, designed_sequence)
    """
    sequences = []
    
    with open(csv_path, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            design_id = row.get('id', '')
            designed_seq = row.get('designed_sequence', '')
            
            if not designed_seq:
                print(f"⚠ Warning: No designed_sequence for {design_id}, skipping", file=sys.stderr)
                continue
            
            sequences.append((design_id, designed_seq))
    
    return sequences


def generate_yaml(target_sequence: str, designed_sequence: str, design_id: str) -> str:
    """Generate a multimer YAML file content."""
    yaml_content = f"""version: 1  # Optional, defaults to 1
sequences:
  - protein:
      id: A
      sequence: {target_sequence}
  - protein:
      id: B
      sequence: {designed_sequence}
"""
    return yaml_content


def main():
    parser = argparse.ArgumentParser(
        description="Generate multimer YAML files from target FASTA and designed sequences CSV"
    )
    parser.add_argument(
        '--fasta',
        type=Path,
        required=True,
        help='Path to FASTA file containing target sequence (protein A)'
    )
    parser.add_argument(
        '--csv',
        type=Path,
        required=True,
        help='Path to CSV file with designed sequences (protein B)'
    )
    parser.add_argument(
        '--output-dir',
        type=Path,
        required=True,
        help='Directory to save generated YAML files'
    )
    
    args = parser.parse_args()
    
    # Validate inputs
    if not args.fasta.exists():
        print(f"❌ Error: FASTA file not found: {args.fasta}", file=sys.stderr)
        sys.exit(1)
    
    if not args.csv.exists():
        print(f"❌ Error: CSV file not found: {args.csv}", file=sys.stderr)
        sys.exit(1)
    
    # Create output directory
    args.output_dir.mkdir(parents=True, exist_ok=True)
    
    # Read target sequence
    print(f"📖 Reading target sequence from {args.fasta}...")
    target_sequence = read_fasta(args.fasta)
    print(f"   ✓ Target sequence length: {len(target_sequence)}")
    
    # Read designed sequences
    print(f"📖 Reading designed sequences from {args.csv}...")
    designed_sequences = read_csv_sequences(args.csv)
    print(f"   ✓ Found {len(designed_sequences)} designed sequences")
    
    # Generate YAML files
    print(f"📝 Generating YAML files in {args.output_dir}...")
    generated = 0
    for design_id, designed_seq in designed_sequences:
        # Sanitize design_id for filename
        safe_id = design_id.replace('/', '_').replace('\\', '_')
        yaml_path = args.output_dir / f"{safe_id}.yaml"
        
        yaml_content = generate_yaml(target_sequence, designed_seq, design_id)
        
        with open(yaml_path, 'w') as f:
            f.write(yaml_content)
        
        generated += 1
        if generated % 5 == 0:
            print(f"   ✓ Generated {generated}/{len(designed_sequences)} YAML files...")
    
    print(f"✅ Successfully generated {generated} YAML files in {args.output_dir}")


if __name__ == '__main__':
    main()