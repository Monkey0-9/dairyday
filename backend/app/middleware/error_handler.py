
import logging
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.middleware.base import BaseHTTPMiddleware
import traceback

logger = logging.getLogger("app.errors")

class GlobalErrorHandlerMiddleware(BaseHTTPMiddleware):
    """
    Middleware for catching all unhandled exceptions and formatting them.
    """
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except HTTPException as e:
            # Re-raise to let FastAPI's built-in handlers handle it if desired,
            # or custom handle here.
            return JSONResponse(
                status_code=e.status_code,
                content={
                    "error": {
                        "code": "HTTP_EXCEPTION",
                        "message": e.detail,
                        "request_id": getattr(request.state, "request_id", None)
                    }
                }
            )
        except SQLAlchemyError as e:
            logger.error(f"Database error: {str(e)}\n{traceback.format_exc()}")
            return JSONResponse(
                status_code=500,
                content={
                    "error": {
                        "code": "DATABASE_ERROR",
                        "message": "A system error occurred while processing your request.",
                        "request_id": getattr(request.state, "request_id", None)
                    }
                }
            )
        except Exception as e:
            logger.error(f"Unhandled error: {str(e)}\n{traceback.format_exc()}")
            return JSONResponse(
                status_code=500,
                content={
                    "error": {
                        "code": "INTERNAL_SERVER_ERROR",
                        "message": "An unexpected error occurred.",
                        "request_id": getattr(request.state, "request_id", None)
                    }
                }
            )
