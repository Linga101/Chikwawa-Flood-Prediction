from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from app.db.database import Base

try:
    from geoalchemy2 import Geometry
    HAS_GEO = True
except ImportError:
    HAS_GEO = False

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, index=True, nullable=False) # e.g., 'GPM', 'DAHITI', 'SMAP'
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    value = Column(Float, nullable=False)
    grid_id = Column(String, index=True, nullable=True) # e.g., 'TA Ngabu'
    
    # Store the location of the reading (only available with PostGIS)
    if HAS_GEO:
        geometry = Column(Geometry(geometry_type='GEOMETRY', srid=4326), nullable=True)

