from sqlalchemy import Column, Integer, String, Boolean
from app.db.database import Base

class Subscriber(Base):
    __tablename__ = "subscribers"

    id = Column(Integer, primary_key=True, index=True)
    phone_number = Column(String, unique=True, index=True, nullable=False)
    ta_area = Column(String, index=True, nullable=False) # Traditional Authority area
    is_active = Column(Boolean, default=True)
