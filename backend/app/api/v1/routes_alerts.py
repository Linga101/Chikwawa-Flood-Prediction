from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.dependencies import get_db, get_admin_user
from app.db.models.Subscriber import Subscriber
from app.db.crud.crud_alerts import get_alert_history, create_alert_log, delete_alert
from app.core.alerting.sms_gateway import send_sms_alert
from pydantic import BaseModel

router = APIRouter()


class DispatchRequest(BaseModel):
    """
    Payload sent by the administrator when they click 'Approve & Dispatch Alert'
    on the dashboard. The grid_id and risk_level are pre-populated from the
    current prediction; the message can be customised before sending.
    """
    grid_id:    str              # e.g. "TA Ngabu"
    risk_level: str              # "LOW" | "MEDIUM" | "HIGH"
    message:    str              # Human-approved alert text
    ta_area:    Optional[str]    # If None, sends to ALL active subscribers

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
    risk_level: str = "MEDIUM"  # LOW | MEDIUM | HIGH

@router.get("/alerts")
async def read_alerts(db: Session = Depends(get_db), current_user = Depends(get_admin_user)):
    return get_alert_history(db)

@router.delete("/alerts/{alert_id}")
async def dismiss_alert(alert_id: int, db: Session = Depends(get_db), current_user = Depends(get_admin_user)):
    success = delete_alert(db, alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"message": "Alert permanently deleted"}

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
            # Log every successful send so the alerts feed has real data
            create_alert_log(
                db,
                risk_level=payload.risk_level,
                channel="SMS",
                recipient=sub.phone_number,
                message=payload.message,
                ta_area=payload.ta_area,
            )

    return {
        "message": "Broadcast completed",
        "ta_area": payload.ta_area,
        "total_subscribers": len(subscribers),
        "successful_sends": sent_count
    }


@router.post("/alerts/dispatch")
async def dispatch_alert(
    payload: DispatchRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_admin_user),
):
    """
    Human-in-the-loop alert dispatch.

    Called when an administrator reviews the dashboard, confirms the risk is
    genuine, and clicks 'Approve & Dispatch Alert'. This is the ONLY path
    through which SMS messages reach citizens.

    Flow:
      1. Admin sees HIGH risk on dashboard
      2. Admin clicks 'Approve & Dispatch Alert'
      3. Frontend sends POST /alerts/dispatch with the zone + message
      4. This endpoint sends SMS to all matching active subscribers
      5. Each send is logged in alert_history for audit
    """
    # Build subscriber query — optionally filtered by TA area
    query = db.query(Subscriber).filter(Subscriber.is_active == True)
    if payload.ta_area:
        query = query.filter(Subscriber.ta_area == payload.ta_area)

    subscribers = query.all()

    if not subscribers:
        raise HTTPException(
            status_code=404,
            detail=f"No active subscribers found"
                   + (f" in {payload.ta_area}" if payload.ta_area else ""),
        )

    sent_count = 0
    failed_count = 0
    for sub in subscribers:
        success = await send_sms_alert(sub.phone_number, payload.message)
        if success:
            sent_count += 1
            create_alert_log(db, payload.risk_level, "SMS", sub.phone_number)
        else:
            failed_count += 1

    # Also log a summary entry for the WebSocket broadcast
    create_alert_log(db, payload.risk_level, "WS", f"Dashboard dispatch: {payload.grid_id}")

    return {
        "status":              "dispatched",
        "grid_id":             payload.grid_id,
        "risk_level":          payload.risk_level,
        "total_subscribers":   len(subscribers),
        "successful_sends":    sent_count,
        "failed_sends":        failed_count,
        "message_preview":     payload.message[:120],
    }
