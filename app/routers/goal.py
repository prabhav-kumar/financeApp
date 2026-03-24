"""Financial Goals Router — CRUD + progress tracking."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.goal import FinancialGoal
from app.models.user import User
from app.schemas.goal import FinancialGoalCreate, FinancialGoalUpdate, FinancialGoalResponse
from app.utils.dependencies import get_current_user

router = APIRouter()


@router.post("/", response_model=FinancialGoalResponse, status_code=status.HTTP_201_CREATED)
def add_goal(payload: FinancialGoalCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    goal = FinancialGoal(user_id=current_user.id, **payload.model_dump())
    db.add(goal); db.commit(); db.refresh(goal)
    return _enrich(goal)


@router.get("/", response_model=List[FinancialGoalResponse])
def list_goals(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return [_enrich(g) for g in db.query(FinancialGoal).filter(FinancialGoal.user_id == current_user.id).order_by(FinancialGoal.target_date).all()]


@router.put("/{goal_id}", response_model=FinancialGoalResponse)
def update_goal(goal_id: int, payload: FinancialGoalUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    goal = db.query(FinancialGoal).filter(FinancialGoal.id == goal_id, FinancialGoal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
    db.commit(); db.refresh(goal)
    return _enrich(goal)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    goal = db.query(FinancialGoal).filter(FinancialGoal.id == goal_id, FinancialGoal.user_id == current_user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found.")
    db.delete(goal); db.commit()


def _enrich(g: FinancialGoal) -> dict:
    progress = g.progress_pct
    remaining = max(g.target_amount - g.current_amount, 0)
    months_to_goal: Optional[int] = None
    if g.monthly_contribution > 0 and remaining > 0:
        months_to_goal = int(remaining / g.monthly_contribution) + 1
    return {
        "id": g.id, "goal_name": g.goal_name, "category": g.category,
        "target_amount": g.target_amount, "current_amount": g.current_amount,
        "monthly_contribution": g.monthly_contribution, "target_date": g.target_date,
        "status": g.status, "progress_pct": progress, "months_to_goal": months_to_goal,
        "notes": g.notes, "created_at": g.created_at,
    }
