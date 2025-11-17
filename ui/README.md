## Evolved Sprint Hackathon UI

A Next.js 16 + React 19 app for building and running protein design pipelines (Standard Boltzgen, Binder Optimization, and Dual Target modes). Includes a Monaco-based YAML editor with schema validation, pipeline diagram editor, and job results viewers (CSV tables, YAML, PDF, and Mol* structure visualization).

### Prerequisites
- Node.js 18.18+ (Node 20+ recommended)
- pnpm 8+

Install pnpm if you don’t have it:
```bash
npm i -g pnpm
```

### Quick Start
```bash
# 1) Install dependencies
pnpm install

# 2) (Optional) set backend API URL (default: http://localhost:8000)
export NEXT_PUBLIC_API_URL="http://localhost:8000"

# 3) Start the dev server
pnpm dev
# App runs on http://localhost:3000 (binds to 0.0.0.0)
```

### Scripts
- Development:
```bash
pnpm dev
```
- Lint (auto-fix):
```bash
pnpm lint
```
- Build (production):
```bash
pnpm build
```
- Start (after build):
```bash
pnpm start
```

### Environment
- `NEXT_PUBLIC_API_URL` (string, optional): Base URL of the backend API. Defaults to `http://localhost:8000` if not set.

### Features Overview
- Pipeline editor with multiple operating modes:
  - Standard Boltzgen
  - Binder Optimization
  - Dual Target: Existing + Unknown
- YAML editing with live schema validation and a preflight confirmation modal to review the exact YAML that will be uploaded.
- File uploads (CIF, PDB, FASTA) with example loaders from `public/examples/...`.
- Results page with:
  - Mol* structure viewer (CIF)
  - CSV viewer (with column toggling and resizing)
  - YAML viewer
  - PDF viewer
  - Dual Target-specific PPI ranking table merged from `prediction_summary.csv` and `final_designs_metrics_*.csv`.

### Notes
- The app binds the dev server to `0.0.0.0` (via `next dev --hostname 0.0.0.0`) for easy access across your network. If you prefer localhost-only, remove the hostname flag in `package.json`.
- Example inputs are available under:
  - `public/examples/binder_optimization_example`
  - `public/examples/dual_target`

### Troubleshooting
- Ensure your Node version satisfies Next.js 16 requirements.
- If API calls fail, confirm `NEXT_PUBLIC_API_URL` points to a reachable backend and that CORS is configured appropriately.


