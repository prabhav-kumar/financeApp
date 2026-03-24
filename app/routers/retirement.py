"""Retirement Planning Router — CRUD + corpus projection."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.retirement import RetirementPlan
from app.models.user import User
from app.schemas.retirement import RetirementPlanCreate, RetirementPlanUpdate, RetirementPlanResponse, RetirementSummaryResponse
from app.utils.dependencies import get_current_user

router = APIRouter()


def _project_corpus(current_value: float, monthly_contribution: float, rate: float, years: int) -> float:
    """Project future corpus using compound growth + SIP formula."""
    if years <= 0:
        return current_value
    r = rate / 100 / 12  # monthly rate
    n = years * 12
    # Lump sum growth
    lump = current_value * ((1 + r) ** n)
    # SIP growth
    sip = monthly_contribution * (((1 + r) ** n - 1) / r) if r > 0 else monthly_contribution * n
    return round(lump + sip, 2)


@router.post("/", response_model=RetirementPlanResponse, status_code=status.HTTP_201_CREATED)
def add_plan(payload: RetirementPlanCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    plan = RetirementPlan(user_id=current_user.id, **payload.model_dump())
    db.add(plan); db.commit(); db.refresh(plan)
    return _enrich(plan)


@router.get("/", response_model=List[RetirementPlanResponse])
def list_plans(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return [_enrich(p) for p in db.query(RetirementPlan).filter(RetirementPlan.user_id == current_user.id).all()]


@router.get("/summary", response_model=RetirementSummaryResponse)
def retirement_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    plans = db.query(RetirementPlan).filter(RetirementPlan.user_id == current_user.id).all()
    total_corpus = sum(p.current_value for p in plans)
    total_monthly = sum(p.monthly_contribution for p in plans)
    enriched = [_enrich(p) for p in plans]
    projected = sum(e["projected_corpus"] or 0 for e in enriched)

    # Required corpus: 25x annual desired income (4% withdrawal rule)
    desired_incomes = [p.desired_monthly_income for p in plans if p.desired_monthly_income]
    required: Optional[float] = None
    readiness: Optional[float] = None
    if desired_incomes:
        required = round(max(desired_incomes) * 12 * 25, 2)
        readiness = round(min(projected / required * 100, 100), 2) if required > 0 else None

    return RetirementSummaryResponse(
        total_current_corpus=round(total_corpus, 2),
        total_monthly_contribution=round(total_monthly, 2),
        projected_total_corpus=projected,
        required_corpus=required,
        readiness_pct=readiness,
        plans=enriched,
    )


@router.put("/{plan_id}", response_model=RetirementPlanResponse)
def update_plan(plan_id: int, payload: RetirementPlanUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    plan = db.query(RetirementPlan).filter(RetirementPlan.id == plan_id, RetirementPlan.user_id == current_user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Retirement plan not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)
    db.commit(); db.refresh(plan)
    return _enrich(plan)


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(plan_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    plan = db.query(RetirementPlan).filter(RetirementPlan.id == plan_id, RetirementPlan.user_id == current_user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Retirement plan not found.")
    db.delete(plan); db.commit()


def _enrich(p: RetirementPlan) -> dict:
    years = (p.retirement_age - p.current_age) if p.current_age and p.retirement_age else None
    projected = _project_corpus(p.current_value, p.monthly_contribution, p.expected_return_rate, years) if years else None
    return {
        "id": p.id, "plan_name": p.plan_name, "account_type": p.account_type,
        "current_value": p.current_value, "monthly_contribution": p.monthly_contribution,
        "expected_return_rate": p.expected_return_rate, "current_age": p.current_age,
        "retirement_age": p.retirement_age, "desired_monthly_income": p.desired_monthly_income,
        "years_to_retirement": years, "projected_corpus": projected, "created_at": p.created_at,
    }
