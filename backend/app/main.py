import json
import logging
import re
import time
from uuid import uuid4

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    request_logger = logging.getLogger("app.request")
    request_logger.setLevel(logging.INFO)
    if not request_logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(message)s"))
        request_logger.addHandler(handler)
    request_logger.propagate = False
    application = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        docs_url="/docs" if settings.environment != "production" else None,
        redoc_url="/redoc" if settings.environment != "production" else None,
    )

    @application.exception_handler(RequestValidationError)
    async def validation_error(_, exc: RequestValidationError) -> JSONResponse:
        errors = [
            {key: item[key] for key in ("loc", "msg", "type") if key in item}
            for item in exc.errors()
        ]
        return JSONResponse(status_code=422, content={"detail": errors})

    @application.middleware("http")
    async def request_log(request, call_next):
        incoming = request.headers.get("x-request-id", "")
        request_id = incoming if re.fullmatch(r"[A-Za-z0-9_-]{1,64}", incoming) else uuid4().hex
        started = time.monotonic()
        try:
            response = await call_next(request)
        except Exception:
            request_logger.exception(
                json.dumps(
                    {
                        "request_id": request_id,
                        "method": request.method,
                        "path": request.url.path,
                        "status": 500,
                    }
                )
            )
            raise
        response.headers["X-Request-ID"] = request_id
        request_logger.info(
            json.dumps(
                {
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status": response.status_code,
                    "duration_ms": round((time.monotonic() - started) * 1000, 2),
                }
            )
        )
        return response

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )
    application.include_router(api_router, prefix="/api/v1")
    return application


app = create_app()
