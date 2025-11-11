// Client-side utility to get design specification configuration (local state only)
export async function fetchVHHConfig(): Promise<string> {
  // Return default config following DESIGN_SPEC.md format
  return `# Design Specification
# This file follows the design specification format for protein design
# See DESIGN_SPEC.md for detailed documentation

entities:
  # Add your entities here (proteins, ligands, files)
  # Example:
  # - protein:
  #     id: G
  #     sequence: 15..20AAAAAAVTTTT18PPP
  # - ligand:
  #     id: Q
  #     ccd: WHL
  # - file:
  #     path: 7rpz.cif
  #     include:
  #       - chain:
  #           id: A
`
}
