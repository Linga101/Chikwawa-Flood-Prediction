from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.dependencies import get_db, get_admin_user
from app.db.models.Subscriber import Subscriber
from app.db.crud.crud_alerts import get_alert_history
from pydantic import BaseModel

router = APIRouter()

class SubscriberCreate(BaseModel):
    phone_number: str
    ta_area: str

@router.get("/alerts")
async def read_alerts(db: Session = Depends(get_db), current_user = Depends(get_admin_user)):
    return get_alert_history(db)

@router.post("/alert-subscribe")
async def subscribe_to_alerts(
    sub_in: SubscriberCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_admin_user)
):
    db_sub = db.query(Subscriber).filter(Subscriber.phone_number == sub_in.phone_number).first()
    if db_sub:
        raise HTTPException(status_code=400, detail="Phone number already subscribed")
    
    new_sub = Subscriber(
        phone_number=sub_in.phone_number,
        ta_area=sub_in.ta_area,
        is_active=True
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)
    return {"message": "Successfully subscribed", "phone": new_sub.phone_number}
