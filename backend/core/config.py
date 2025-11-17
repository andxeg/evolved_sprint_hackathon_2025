import os

from dynaconf import Dynaconf, Validator  # type: ignore

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# Define computed settings
def compute_sqlalchemy_database_uri(settings: Dynaconf, validator: Validator) -> str:  # noqa: ARG001
    return (
        f"postgresql+psycopg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}"
        f"@{settings.POSTGRES_SERVER}:{settings.POSTGRES_PORT}/{settings.POSTGRES_DB}"
        f"?sslmode={settings.POSTGRES_SSL_MODE}"
    )


def compute_mongo_db_database_uri(settings: Dynaconf, validator: Validator) -> str:  # noqa: ARG001
    return (
        f"mongodb://{settings.MONGO_DB_USER}:{settings.MONGO_DB_PASSWORD}"
        f"@{settings.MONGO_DB_HOST}:{settings.MONGO_DB_PORT}"
    )


def compute_output_dir(settings: Dynaconf, validator: Validator) -> str:  # noqa: ARG001
    if settings.ENVIRONMENT == "docker":
        return str(settings.DOCKER_OUTPUT_PATH)
    elif settings.ENVIRONMENT == "local":
        return str(settings.LOCAL_OUTPUT_PATH)

    return str(settings.LOCAL_OUTPUT_PATH)


def parse_cors(settings: Dynaconf, validator: Validator) -> list[str] | str:  # noqa: ARG001
    value = settings.get("BACKEND_CORS_ORIGINS", [])
    if isinstance(value, str) and not value.startswith("["):
        return [v.strip() for v in value.split(",")]
    elif isinstance(value, list | str):
        return value
    raise ValueError(f"Invalid CORS configuration: {value}")


# Initialize Dynaconf settings
settings = Dynaconf(
    environments=True,
    root_path=str(PROJECT_ROOT),
    settings_files=["settings.toml"],
    validators=[
        # Required settings with defaults
        Validator("PROJECT_NAME", default="Evolved Hackathon API"),
        # Database settings
        Validator("POSTGRES_SERVER", must_exist=True, is_type_of=str),
        Validator("POSTGRES_PORT", is_type_of=int, default=5432),
        Validator("POSTGRES_USER", must_exist=True, is_type_of=str),
        Validator("POSTGRES_PASSWORD", default=""),
        Validator("POSTGRES_DB", must_exist=True, is_type_of=str),
        Validator("POSTGRES_SSL_MODE", must_exist=True, is_type_of=str),
        # Redis settings
        Validator("REDIS_HOST", must_exist=True),
        Validator("REDIS_PORT", default=6379),
        # Environment settings
        Validator("ENVIRONMENT", must_exist=True, is_type_of=str),
        Validator("DEV_ENVIRONMENT", must_exist=True, is_type_of=str),
        Validator("HOST_API", must_exist=True),
        Validator("SQLALCHEMY_DATABASE_URI", default=compute_sqlalchemy_database_uri),
        Validator("OUTPUT_DIR", default=compute_output_dir),
        Validator("LOCAL_OUTPUT_PATH", default=""),
        Validator("DOCKER_OUTPUT_PATH", default=""),
    ],
)
