from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from app.db.database import Base

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, index=True, nullable=False) # e.g., 'GPM', 'DAHITI', 'SMAP'
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    value = Column(Float, nullable=False)
    
    # Store the location of the reading (point for gauge, polygon/point for satellite grid cell)
    geometry = Column(Geometry(geometry_type='GEOMETRY', srid=4326), nullable=True) 
