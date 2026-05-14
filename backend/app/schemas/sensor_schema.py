from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class SensorReadingResponse(BaseModel):
    id: int
    source: str
    timestamp: datetime
    value: float

    class Config:
        from_attributes = True
