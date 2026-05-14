from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class AlertResponse(BaseModel):
    id: int
    fired_at: datetime
    risk_level: str
    channel: str
    recipient: Optional[str]

    class Config:
        from_attributes = True
