from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Google Earth Engine
    GEE_SERVICE_ACCOUNT: str = ""
    GEE_PRIVATE_KEY_PATH: str = ""

    # Database & Redis
    DATABASE_URL: str = "postgresql+psycopg2://postgres:postgrespassword@localhost:5432/chikwawa_flood_db"
    REDIS_URL: str = "redis://localhost:6379/0"

    # External APIs
    AIRTEL_MALAWI_API_KEY: str = ""
    AIRTEL_MALAWI_SENDER_ID: str = "FLOOD-ALERT"
    DAHITI_API_KEY: str = ""

    # Model Configuration
    ALERT_THRESHOLD: float = 0.85
    MODEL_DIR: str = "models/"
    SCALER_PATH: str = "models/scaler.pkl"

    # Authentication
    JWT_SECRET_KEY: str = "supersecretkey" # Override in production
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    class Config:
        env_file = ".env"

settings = Settings()
