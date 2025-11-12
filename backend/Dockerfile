FROM python:3.12

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

RUN apt-get update && apt-get install -y gcc
RUN curl -fsSL https://get.docker.com -o get-docker.sh
RUN sh get-docker.sh

# Install kubectl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

# Install AWS CLI v2
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    apt-get install -y unzip && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf aws awscliv2.zip

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

COPY --chown=user:user ./boltzgen /app/boltzgen
COPY --chown=user:user ./pyproject.toml ./uv.lock ./alembic.ini ./settings.toml ./server.py ./main.py /app/
COPY --chown=user:user ./docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Sync the project
# Ref: https://docs.astral.sh/uv/guides/integration/docker/#intermediate-layers
RUN --mount=type=cache,target=/user/.cache/uv \
    uv sync
