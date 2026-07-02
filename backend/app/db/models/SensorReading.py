from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.db.database import Base


class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id       = Column(Integer, primary_key=True, index=True)
    source   = Column(String, index=True, nullable=False)  # e.g. 'GPM', 'DAHITI', 'SMAP'
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    value    = Column(Float, nullable=False)
    grid_id  = Column(String, index=True, nullable=True)   # e.g. 'TA Ngabu'
    # geometry column removed — Railway PostgreSQL does not have PostGIS installed.
    # All spatial identification is done via the grid_id string field.
