
from typing import List, Dict
from fastapi import WebSocket
import logging
import json

logger = logging.getLogger("app.websocket")

class ConnectionManager:
    """
    Manages active WebSocket connections for real-time updates.
    """
    def __init__(self):
        # Maps user_id to list of active websockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"WebSocket CONNECT: user={user_id} total_users={len(self.active_connections)}")

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"WebSocket DISCONNECT: user={user_id} active={user_id in self.active_connections}")

    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                await connection.send_text(message)

    async def broadcast(self, message: dict):
        """
        Broadcast a structured message to all connected clients.
        """
        payload = json.dumps(message)
        for user_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_text(payload)
                except Exception as e:
                    logger.error(f"Failed to send broadcast to {user_id}: {str(e)}")

manager = ConnectionManager()
