from pydantic import BaseModel
from datetime import datetime

class RiskBase(BaseModel):
    grid_id: str
    probability: float
    risk_level: str

class RiskCreate(RiskBase):
    pass

class RiskResponse(RiskBase):
    id: int
    run_timestamp: datetime

    class Config:
        from_attributes = True
