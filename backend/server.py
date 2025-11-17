from types import SimpleNamespace

from sanic import HTTPResponse, Request, Sanic
from sanic.config import Config
from sanic.response import json
from sanic_ext import Extend
from sqlalchemy.ext.asyncio import AsyncSession

from api.design.routes import design_v1
from core.config import settings
from core.postgres_db import async_session_maker


def create_app() -> Sanic[Config, SimpleNamespace]:
    app = Sanic("fastfold-cloud-backend")
    app.config.CORS_ALLOW_HEADERS = [
        "Content-Type",
        "Authorization",
        "Access-Control-Allow-Origin",
        "Access-Control-Allow-Headers",
        "Access-Control-Allow-Methods",
        "Access-Control-Allow-Credentials",
    ]
    app.config.CORS_METHODS = ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    app.config.CORS_SUPPORTS_CREDENTIALS = True
    app.config.FALLBACK_ERROR_FORMAT = "json"

    # Configure timeouts for long-running streaming responses
    app.config.REQUEST_TIMEOUT = 300  # 5 minutes for request timeout
    app.config.RESPONSE_TIMEOUT = 300  # 5 minutes for response timeout
    app.config.KEEP_ALIVE_TIMEOUT = 300  # 5 minutes for keep-alive timeout
    app.config.GRACEFUL_SHUTDOWN_TIMEOUT = 30  # 30 seconds for graceful shutdown

    app.config.update(settings.to_dict())
    # app.config.OAS = False
    Extend(app)

    initialize_app(app)
    register_routes(app)

    return app


def register_routes(app: Sanic[Config, SimpleNamespace]) -> None:
    @app.get("/health/ready")
    async def health_ready(request: Request) -> HTTPResponse:
        print(request)
        return json({"status": "ready", "service": "evolved-hackathon-backend"})

    app.blueprint(design_v1)


def initialize_app(app: Sanic[Config, SimpleNamespace]) -> None:
    @app.on_request
    async def inject_db(request: Request) -> None:
        request.ctx.postgres_db = async_session_maker()

    @app.on_response  # type: ignore
    async def close_db(request: Request, _response: HTTPResponse) -> None:
        session: AsyncSession = request.ctx.postgres_db
        try:
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
