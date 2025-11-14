FROM nvidia/cuda:12.6.3-base-ubuntu24.04

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Install uv
# Ref: https://docs.astral.sh/uv/guides/integration/docker/#installing-uv
COPY --from=ghcr.io/astral-sh/uv:0.4.23 /uv /bin/uv

# Compile bytecode
# Ref: https://docs.astral.sh/uv/guides/integration/docker/#compiling-bytecode
ENV UV_COMPILE_BYTECODE=1

# uv Cache
# Ref: https://docs.astral.sh/uv/guides/integration/docker/#caching
ENV UV_LINK_MODE=copy

RUN apt-get update && apt-get install -y gcc clang build-essential python3-dev && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set up user (use build args to allow customization, default to 1002 to match host)
ARG USER_ID=1002
ARG GROUP_ID=1002
RUN groupadd -g ${GROUP_ID} user 2>/dev/null || true && \
    useradd --create-home -r -u ${USER_ID} -g ${GROUP_ID} user 2>/dev/null || true
# Create the output directory and subdirectories and change ownership of /app to user
RUN mkdir -p /app/tmp/output/results/uploads /app/tmp/output/results/checks /app/tmp/output/chat_images && chown -R ${USER_ID}:${GROUP_ID} /app
# Set user by non-root ID for Knative security compatibility
USER ${USER_ID}:${GROUP_ID}

WORKDIR /app/

# Place executables in the environment at the front of the path
# Ref: https://docs.astral.sh/uv/guides/integration/docker/#using-the-environment
ENV PATH="/app/.venv/bin:$PATH"

# Install dependencies
# Ref: https://docs.astral.sh/uv/guides/integration/docker/#intermediate-layers
RUN --mount=type=cache,target=/user/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen --no-install-project

COPY --chown=user:user ./alembic /app/alembic
COPY --chown=user:user ./api /app/api
COPY --chown=user:user ./core /app/core
COPY --chown=user:user ./binder_optimization /app/binder_optimization
COPY --chown=user:user ./scripts /app/scripts
COPY --chown=user:user ./boltzgen /app/boltzgen
COPY --chown=user:user ./pyproject.toml ./uv.lock ./alembic.ini ./settings.toml ./server.py ./main.py /app/
COPY --chown=user:user ./docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Sync the project
# Ref: https://docs.astral.sh/uv/guides/integration/docker/#intermediate-layers
RUN --mount=type=cache,target=/user/.cache/uv \
    uv sync
