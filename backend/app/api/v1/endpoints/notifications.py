
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from app.api import deps
from app.websocket.connection_manager import manager
from app.models.user import User
import logging

router = APIRouter()
logger = logging.getLogger("app.websocket")

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...)
):
    """
    WebSocket endpoint for real-time notifications.
    Token must be provided as a query param for initial handshake.
    """
    user = None
    try:
        # Manual auth for websocket
        from jose import jwt
        from app.core.config import settings
        from app.core import security

        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[security.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=1008) # Policy Violation
            return

        await manager.connect(user_id, websocket)

        while True:
            # Keep connection alive, wait for client messages if any
            data = await websocket.receive_text()
            # Echo or handle incoming commands
            await websocket.send_text(f"ACK: {data}")

    except WebSocketDisconnect:
        if user_id:
            manager.disconnect(user_id, websocket)
    except Exception as e:
        logger.error(f"WebSocket Error: {str(e)}")
        if websocket.client:
            await websocket.close()
