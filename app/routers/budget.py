"""Budget Router — CRUD + monthly summary."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.budget import Budget
from app.models.user import User
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetResponse, BudgetSummaryResponse
from app.utils.dependencies import get_current_user

router = APIRouter()


@router.post("/", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def add_budget(payload: BudgetCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = Budget(user_id=current_user.id, **payload.model_dump())
    db.add(item); db.commit(); db.refresh(item)
    return _enrich(item)


@router.get("/summary", response_model=BudgetSummaryResponse)
def budget_summary(month: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Must be defined BEFORE /{budget_id} to avoid route shadowing."""
    items = db.query(Budget).filter(Budget.user_id == current_user.id, Budget.month == month).all()
    total_b = sum(i.budgeted_amount for i in items)
    total_a = sum(i.actual_amount for i in items)
    breakdown = {}
    for i in items:
        cat = i.category.value
        breakdown[cat] = {
            "budgeted": i.budgeted_amount,
            "actual": i.actual_amount,
            "variance": round(i.budgeted_amount - i.actual_amount, 2),
        }
    return BudgetSummaryResponse(
        month=month, total_budgeted=round(total_b, 2),
        total_actual=round(total_a, 2), total_variance=round(total_b - total_a, 2),
        category_breakdown=breakdown,
    )


@router.get("/", response_model=List[BudgetResponse])
def list_budgets(month: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Budget).filter(Budget.user_id == current_user.id)
    if month:
        q = q.filter(Budget.month == month)
    return [_enrich(b) for b in q.order_by(Budget.month.desc(), Budget.category).all()]


@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(budget_id: int, payload: BudgetUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Budget item not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit(); db.refresh(item)
    return _enrich(item)


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(budget_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(Budget).filter(Budget.id == budget_id, Budget.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Budget item not found.")
    db.delete(item); db.commit()


def _enrich(b: Budget) -> dict:
    """Return a plain dict so Pydantic can validate it cleanly."""
    return {
        "id": b.id,
        "month": b.month,
        "category": b.category.value,   # serialize enum → string
        "budgeted_amount": b.budgeted_amount,
        "actual_amount": b.actual_amount,
        "variance": b.variance,
        "notes": b.notes,
        "created_at": b.created_at,
    }
