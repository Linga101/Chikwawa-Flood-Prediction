from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.database import engine, Base
from app.api.v1 import routes_auth, routes_alerts, routes_websocket, routes_risk, routes_map, routes_charts

# Import models to ensure they are registered with SQLAlchemy
from app.db.models.HistoricalEvent import HistoricalEvent

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Chikwawa Flood Prediction API",
    description="Backend API for real-time flood risk prediction in Chikwawa, Malawi.",
    version="1.0.0"
)

# Configure CORS for the frontend dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Chikwawa Flood Prediction API is running"}

app.include_router(routes_auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(routes_alerts.router, prefix="/api/v1", tags=["alerts"])
app.include_router(routes_websocket.router, prefix="/api/v1", tags=["notifications"])
app.include_router(routes_risk.router, prefix="/api/v1/risk", tags=["risk"])
app.include_router(routes_map.router, prefix="/api/v1", tags=["map"])
app.include_router(routes_charts.router, prefix="/api/v1/charts", tags=["trends"])
