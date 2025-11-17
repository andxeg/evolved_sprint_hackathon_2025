# Evolved Hackathon Backend

Backend API for the Evolved Hackathon project, built with Sanic, PostgreSQL, and Redis.

## Documentation

- **[API Documentation](API.md)** - Complete API reference with request/response examples for all endpoints

## Prerequisites

- **Python 3.12+**
- **uv** - Fast Python package installer ([installation guide](https://docs.astral.sh/uv/getting-started/installation/))
- **Docker & Docker Compose** (for containerized setup)
- **PostgreSQL 17** (for local development, or use Docker Compose)
- **Redis 7** (for local development, or use Docker Compose)
- **NVIDIA GPU with CUDA 12.6+** (required for inference)
- **nvidia-container-toolkit** (for Docker GPU support)

## Local Development Setup

### 1. Install Dependencies

Install all project dependencies using `uv`:

```bash
uv sync
```

This will:
- Create a virtual environment (`.venv`)
- Install all dependencies from `pyproject.toml`
- Lock dependencies in `uv.lock`

### 2. Set Environment Variable

Set the environment configuration to use local settings:

```bash
export ENV_FOR_DYNACONF=local
```

This tells Dynaconf to use the `[local]` section from `settings.toml`.

### 3. Start Required Services

You need PostgreSQL and Redis running. You can either:

**Option A: Use Docker Compose (recommended for services only)**

```bash
# Start only database and Redis services
docker-compose up -d db redis
```

**Option B: Install and run locally**

- PostgreSQL: Install and start PostgreSQL 17 on `localhost:5432`
- Redis: Install and start Redis 7 on `localhost:6379`

### 4. Configure Database

The database configuration is managed through `settings.toml`. For local development, ensure the `[local]` section has the correct settings:

```toml
[local]
POSTGRES_SERVER = "localhost"
POSTGRES_PORT = 5432
POSTGRES_DB = "evolved-hackathon"
POSTGRES_USER = "postgres"
POSTGRES_PASSWORD = "donothackmeplease"
```

**Create the database** (if it doesn't exist):

```bash
# Using psql
psql -U postgres -c "CREATE DATABASE \"evolved-hackathon\";"

# Or using createdb
createdb -U postgres evolved-hackathon
```

**Run database migrations:**

```bash
uv run alembic upgrade head
```

### 5. Create Required Directories

The application needs output directories for storing results. Create them locally:

```bash
# Create the output directory structure
mkdir -p /home/nebius/julio/runs/uploads
mkdir -p /home/nebius/julio/runs/checks
```

**Note:** Update `LOCAL_OUTPUT_PATH` in `settings.toml` if you want to use a different path.

### 6. Run the Development Server

Start the Sanic development server:

```bash
uv run sanic --dev server:create_app --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`.

**API Base URL:** `http://localhost:8000/v1`

See [API.md](API.md) for complete API documentation with examples. Auto generated Swagger at `/docs/swagger`

## Docker Compose Setup

### Prerequisites for GPU Support

If you're using GPU features, ensure `nvidia-container-toolkit` is installed:

```bash
# Check if nvidia runtime is available
docker info | grep -i runtime

# Install nvidia-container-toolkit (Ubuntu/Debian)
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update && sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

### Build and Run

1. **Build and start all services:**

```bash
docker-compose up --build -d
```

This will:
- Build the API container with CUDA 12.6.3 base image
- Start PostgreSQL database
- Start Redis
- Start the API server

2. **View logs:**

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f api
```

3. **Stop services:**

```bash
docker-compose down
```

4. **Stop and remove volumes (clean slate):**

```bash
docker-compose down -v
```

### Verify GPU Access

Once the container is running, verify GPU access:

```bash
# Enter the container
docker-compose exec api bash

# Check GPU
nvidia-smi
```

### Run Database Migrations in Docker

```bash
docker-compose exec api uv run alembic upgrade head
```

## Configuration

### settings.toml

The application uses [Dynaconf](https://www.dynaconf.com/) for configuration management. Settings are organized by environment:

- **`[global]`** - Shared settings across all environments
- **`[local]`** - Local development settings (used when `ENV_FOR_DYNACONF=local`)
- **`[docker]`** - Docker container settings (used when `ENV_FOR_DYNACONF=docker`)

#### Key Configuration Sections

**Application Settings:**
- `PROJECT_NAME` - Application name
- `HOST_API` - API base URL
- `CORS_ORIGINS` - Allowed CORS origins

**Output Paths:**
- `LOCAL_OUTPUT_PATH` - Local filesystem path for output files
- `DOCKER_OUTPUT_PATH` - Container path for output files

**Database Settings:**
- `POSTGRES_SERVER` - Database host
- `POSTGRES_PORT` - Database port
- `POSTGRES_DB` - Database name
- `POSTGRES_USER` - Database user
- `POSTGRES_PASSWORD` - Database password
- `POSTGRES_SSL_MODE` - SSL mode (disable for local/dev)

**Redis Settings:**
- `REDIS_HOST` - Redis host
- `REDIS_PORT` - Redis port

### Environment Variables

- `ENV_FOR_DYNACONF` - Controls which section of `settings.toml` to use (`local` or `docker`)
- `NVIDIA_VISIBLE_DEVICES` - Controls GPU visibility (set to `all` in Docker)
- `NVIDIA_DRIVER_CAPABILITIES` - GPU capabilities (set to `compute,utility` in Docker)

## Directory Structure

```
backend/
├── alembic/              # Database migrations
│   ├── versions/         # Migration scripts
│   └── env.py           # Alembic environment
├── api/                  # API routes and handlers
│   └── design/          # Design-related endpoints
├── boltzgen/            # BoltzGen ML pipeline code
├── config/              # Hydra configuration files
├── core/                # Core utilities
│   ├── config.py        # Settings loader
│   ├── postgres_db.py   # Database connection
│   └── redis.py         # Redis connection
├── docker-compose.yml   # Docker Compose configuration
├── Dockerfile           # Container image definition
├── pyproject.toml       # Project dependencies and metadata
├── settings.toml        # Application configuration
└── server.py            # Sanic application factory
```

## Output Directories

The application creates and uses the following output directories:

- **`/app/tmp/output/results/uploads`** (Docker) or **`LOCAL_OUTPUT_PATH/uploads`** (Local)
  - User-uploaded files

- **`/app/tmp/output/results/checks`** (Docker) or **`LOCAL_OUTPUT_PATH/checks`** (Local)
  - Validation and check results

- **`/app/tmp/output/chat_images`** (Docker) or **`LOCAL_OUTPUT_PATH/chat_images`** (Local)
  - Generated chat images

**Note:** When running with Docker Compose, ensure the host directory (`/home/nebius/julio/runs` by default) exists and has proper permissions.

## Database Migrations

### Create a new migration:

```bash
uv run alembic revision --autogenerate -m "description of changes"
```

### Apply migrations:

```bash
# Local
uv run alembic upgrade head

# Docker
docker-compose exec api uv run alembic upgrade head
```

### Rollback:

```bash
uv run alembic downgrade -1
```

## Development Tips

1. **Hot Reload:** The `--dev` flag enables auto-reload on code changes
2. **Virtual Environment:** `uv` automatically manages the `.venv` directory
3. **Dependency Updates:** Run `uv sync` after updating `pyproject.toml`
4. **GPU Debugging:** Use `nvidia-smi` inside the container to verify GPU access
5. **Database Access:** Connect to the database using the credentials from `settings.toml`

## Troubleshooting

### GPU not accessible in Docker

- Verify `nvidia-container-toolkit` is installed
- Check `docker info | grep -i runtime` shows `nvidia`
- Ensure `runtime: nvidia` is set in `docker-compose.yml`
- Restart Docker daemon after installing nvidia-container-toolkit

### Database connection errors

- Verify PostgreSQL is running: `docker-compose ps db`
- Check database credentials in `settings.toml` match your setup
- Ensure the database exists: `psql -U postgres -l`
- Check network connectivity between services

### Permission errors on output directories

- Ensure the host directory exists and is writable
- Check Docker volume mount permissions
- Verify user ID/GID in docker-compose build args match your system

