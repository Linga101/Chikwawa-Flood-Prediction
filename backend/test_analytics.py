import sys
import os
sys.path.insert(0, os.path.dirname(__file__))
from app.db.database import SessionLocal
from app.core.analytics import compute_5_factor_assessment

db = SessionLocal()
print(compute_5_factor_assessment(db, "TA Ngabu"))
