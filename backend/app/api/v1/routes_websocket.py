from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.alerting.websocket_notifier import manager

router = APIRouter()

@router.websocket("/live-feed")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; clients can send pings
            data = await websocket.receive_text()
            # Echo or handle incoming client messages if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket)
