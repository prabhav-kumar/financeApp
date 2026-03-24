"""Emergency Fund Router — CRUD + progress tracking."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.emergency_fund import EmergencyFund
from app.models.user import User
from app.schemas.emergency_fund import EmergencyFundCreate, EmergencyFundUpdate, EmergencyFundResponse
from app.utils.dependencies import get_current_user

router = APIRouter()


@router.post("/", response_model=EmergencyFundResponse, status_code=status.HTTP_201_CREATED)
def add_fund(payload: EmergencyFundCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fund = EmergencyFund(user_id=current_user.id, **payload.model_dump())
    db.add(fund); db.commit(); db.refresh(fund)
    return _enrich(fund)


@router.get("/", response_model=List[EmergencyFundResponse])
def list_funds(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return [_enrich(f) for f in db.query(EmergencyFund).filter(EmergencyFund.user_id == current_user.id).all()]


@router.put("/{fund_id}", response_model=EmergencyFundResponse)
def update_fund(fund_id: int, payload: EmergencyFundUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fund = db.query(EmergencyFund).filter(EmergencyFund.id == fund_id, EmergencyFund.user_id == current_user.id).first()
    if not fund:
        raise HTTPException(status_code=404, detail="Emergency fund not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(fund, field, value)
    db.commit(); db.refresh(fund)
    return _enrich(fund)


@router.delete("/{fund_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fund(fund_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    fund = db.query(EmergencyFund).filter(EmergencyFund.id == fund_id, EmergencyFund.user_id == current_user.id).first()
    if not fund:
        raise HTTPException(status_code=404, detail="Emergency fund not found.")
    db.delete(fund); db.commit()


def _enrich(f: EmergencyFund) -> dict:
    progress = min(round(f.current_amount / f.target_amount * 100, 2), 100.0) if f.target_amount > 0 else 0.0
    remaining = max(f.target_amount - f.current_amount, 0)
    months_to_goal: Optional[int] = None
    if f.monthly_contribution > 0 and remaining > 0:
        months_to_goal = int(remaining / f.monthly_contribution) + 1
    return {
        "id": f.id, "fund_name": f.fund_name, "current_amount": f.current_amount,
        "target_amount": f.target_amount, "monthly_contribution": f.monthly_contribution,
        "months_of_expenses": f.months_of_expenses, "progress_pct": progress,
        "months_to_goal": months_to_goal, "created_at": f.created_at,
    }
