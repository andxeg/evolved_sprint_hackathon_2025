# Evolved Sprint-Hackathon

A production-ready platform for therapeutic binder optimization with selectivity guidance. This project provides a complete pipeline for protein design, including a web-based UI for pipeline configuration and job management, and a backend API for running BoltzGen-based design pipelines.

## 📚 Documentation

### Frontend (UI)
- **[UI README](ui/README.md)** - Next.js frontend setup, features, and usage guide
  - Pipeline editor with multiple operating modes (Standard Boltzgen, Binder Optimization, Dual Target)
  - YAML editor with schema validation
  - Job results viewers (CSV tables, YAML, PDF, Mol* structure visualization)

### Backend (API)
- **[Backend README](backend/README.md)** - Backend setup, configuration, and development guide
  - Sanic-based REST API
  - PostgreSQL and Redis integration
  - Docker Compose setup with GPU support
  - Database migrations and configuration

- **[API Documentation](backend/API.md)** - Complete API reference
  - File upload endpoints
  - Design job management
  - File serving endpoints
  - Request/response examples with cURL and Python

- **[Hackathon README](backend/README_HACKATHON.md)** - Fine-grained binder design pipeline guide
  - Pipeline overview and architecture
  - Configuration guide for YAML files
  - Parameter tuning recommendations
  - Output interpretation
  - Examples and best practices

## 🚀 Quick Start

### Prerequisites
- **Frontend**: Node.js 18.18+ (Node 20+ recommended), pnpm 8+
- **Backend**: Python 3.12+, uv, Docker & Docker Compose, PostgreSQL 17, Redis 7, NVIDIA GPU with CUDA 12.6+

### Frontend Setup
```bash
cd ui
pnpm install
pnpm dev
# App runs on http://localhost:3000
```

See [UI README](ui/README.md) for detailed setup instructions.

### Backend Setup
```bash
cd backend
uv sync
export ENV_FOR_DYNACONF=local
docker-compose up -d db redis
uv run alembic upgrade head
uv run sanic --dev server:create_app --host 0.0.0.0 --port 8000
# API runs on http://localhost:8000
```

See [Backend README](backend/README.md) for detailed setup instructions.

## 🏗️ Project Structure

```
evolved_sprint_hackathon_2025/
├── ui/                    # Next.js frontend application
│   ├── src/              # Source code
│   ├── public/           # Static assets
│   └── README.md         # UI documentation
├── backend/              # Sanic backend API
│   ├── api/              # API routes
│   ├── boltzgen/         # BoltzGen ML pipeline
│   ├── core/             # Core utilities
│   ├── API.md            # API documentation
│   ├── README.md         # Backend documentation
│   └── README_HACKATHON.md  # Pipeline guide
└── README.md             # This file
```

## 🎯 Features

### Pipeline Modes
- **Standard Boltzgen**: Standard protein design pipeline
- **Binder Optimization**: Optimize existing binders with selectivity scoring
- **Dual Target**: Design for existing + unknown targets

### File Viewers
- **CSV Tables**: Interactive tables with column toggling and resizing
- **YAML Editor**: Monaco-based editor with syntax highlighting
- **PDF Viewer**: Full PDF viewing with page navigation
- **Mol* Viewer**: 3D protein structure visualization
- **Image Viewer**: Support for PNG, JPG, SVG, and other image formats

## 📖 Getting Started

1. **Set up the backend** following the [Backend README](backend/README.md)
2. **Set up the frontend** following the [UI README](ui/README.md)
3. **Configure your pipeline** using the web UI or YAML configuration files
4. **Run design jobs** and view results in the job results page

For detailed information on:
- **API endpoints**: See [API.md](backend/API.md)
- **Pipeline configuration**: See [README_HACKATHON.md](backend/README_HACKATHON.md)
- **UI features**: See [ui/README.md](ui/README.md)

## 🔗 Links

- [UI Documentation](ui/README.md)
- [Backend Documentation](backend/README.md)
- [API Reference](backend/API.md)
- [Pipeline Guide](backend/README_HACKATHON.md)
