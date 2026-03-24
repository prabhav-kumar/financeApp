"""Insurance Router — CRUD + coverage summary."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.insurance import InsurancePolicy
from app.models.user import User
from app.schemas.insurance import InsurancePolicyCreate, InsurancePolicyUpdate, InsurancePolicyResponse, InsuranceSummaryResponse
from app.utils.dependencies import get_current_user

router = APIRouter()


@router.post("/", response_model=InsurancePolicyResponse, status_code=status.HTTP_201_CREATED)
def add_policy(payload: InsurancePolicyCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    policy = InsurancePolicy(user_id=current_user.id, **payload.model_dump())
    db.add(policy); db.commit(); db.refresh(policy)
    return _enrich(policy)


@router.get("/", response_model=List[InsurancePolicyResponse])
def list_policies(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return [_enrich(p) for p in db.query(InsurancePolicy).filter(InsurancePolicy.user_id == current_user.id).all()]


@router.get("/summary", response_model=InsuranceSummaryResponse)
def insurance_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    policies = db.query(InsurancePolicy).filter(InsurancePolicy.user_id == current_user.id, InsurancePolicy.is_active == 1).all()
    total_coverage = sum(p.coverage_amount for p in policies)
    total_annual = sum(p.annual_premium for p in policies)
    coverage_by_type: dict = {}
    for p in policies:
        t = p.insurance_type.value
        if t not in coverage_by_type:
            coverage_by_type[t] = {"coverage": 0, "annual_premium": 0}
        coverage_by_type[t]["coverage"] += p.coverage_amount
        coverage_by_type[t]["annual_premium"] += p.annual_premium
    return InsuranceSummaryResponse(
        total_coverage=round(total_coverage, 2),
        total_annual_premium=round(total_annual, 2),
        total_monthly_premium=round(total_annual / 12, 2),
        active_policies=len(policies),
        coverage_by_type=coverage_by_type,
    )


@router.put("/{policy_id}", response_model=InsurancePolicyResponse)
def update_policy(policy_id: int, payload: InsurancePolicyUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    policy = db.query(InsurancePolicy).filter(InsurancePolicy.id == policy_id, InsurancePolicy.user_id == current_user.id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(policy, field, value)
    db.commit(); db.refresh(policy)
    return _enrich(policy)


@router.delete("/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_policy(policy_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    policy = db.query(InsurancePolicy).filter(InsurancePolicy.id == policy_id, InsurancePolicy.user_id == current_user.id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found.")
    db.delete(policy); db.commit()


def _enrich(p: InsurancePolicy) -> dict:
    return {
        "id": p.id, "policy_name": p.policy_name, "insurance_type": p.insurance_type,
        "insurer": p.insurer, "coverage_amount": p.coverage_amount,
        "annual_premium": p.annual_premium, "monthly_premium": round(p.annual_premium / 12, 2),
        "policy_start_date": p.policy_start_date, "policy_end_date": p.policy_end_date,
        "is_active": p.is_active, "created_at": p.created_at,
    }
