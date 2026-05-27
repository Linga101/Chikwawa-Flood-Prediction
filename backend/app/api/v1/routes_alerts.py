from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.dependencies import get_db, get_admin_user
from app.db.models.Subscriber import Subscriber
from app.db.crud.crud_alerts import get_alert_history
from app.core.alerting.sms_gateway import send_sms_alert
from pydantic import BaseModel

router = APIRouter()

class SubscriberCreate(BaseModel):
    phone_number: str
    ta_area: str

class SubscriberOut(SubscriberCreate):
    id: int
    is_active: bool

    class Config:
        orm_mode = True

class BroadcastCreate(BaseModel):
    ta_area: str
    message: str

@router.get("/alerts")
async def read_alerts(db: Session = Depends(get_db), current_user = Depends(get_admin_user)):
    return get_alert_history(db)

@router.get("/subscribers", response_model=List[SubscriberOut])
async def list_subscribers(db: Session = Depends(get_db), current_user = Depends(get_admin_user)):
    return db.query(Subscriber).all()

@router.post("/subscribers")
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
    return {"message": "Successfully subscribed", "subscriber": new_sub}

@router.delete("/subscribers/{subscriber_id}")
async def delete_subscriber(
    subscriber_id: int, 
    db: Session = Depends(get_db),
    current_user = Depends(get_admin_user)
):
    sub = db.query(Subscriber).filter(Subscriber.id == subscriber_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscriber not found")
    
    db.delete(sub)
    db.commit()
    return {"message": "Subscriber removed"}

@router.post("/alerts/broadcast")
async def broadcast_manual_alert(
    payload: BroadcastCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_admin_user)
):
    subscribers = db.query(Subscriber).filter(Subscriber.ta_area == payload.ta_area, Subscriber.is_active == True).all()
    
    if not subscribers:
        raise HTTPException(status_code=404, detail=f"No active subscribers found in {payload.ta_area}")
    
    sent_count = 0
    for sub in subscribers:
        success = await send_sms_alert(sub.phone_number, payload.message)
        if success:
            sent_count += 1
            
    return {
        "message": "Broadcast completed",
        "ta_area": payload.ta_area,
        "total_subscribers": len(subscribers),
        "successful_sends": sent_count
    }
