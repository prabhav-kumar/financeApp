from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.retirement import RetirementAccountType


class RetirementPlanCreate(BaseModel):
    plan_name: str
    account_type: RetirementAccountType
    current_value: float = 0
    monthly_contribution: float = 0
    expected_return_rate: float = 8.0
    current_age: Optional[int] = None
    retirement_age: int = 60
    desired_monthly_income: Optional[float] = None


class RetirementPlanUpdate(BaseModel):
    plan_name: Optional[str] = None
    account_type: Optional[RetirementAccountType] = None
    current_value: Optional[float] = None
    monthly_contribution: Optional[float] = None
    expected_return_rate: Optional[float] = None
    current_age: Optional[int] = None
    retirement_age: Optional[int] = None
    desired_monthly_income: Optional[float] = None


class RetirementPlanResponse(BaseModel):
    id: int
    plan_name: str
    account_type: RetirementAccountType
    current_value: float
    monthly_contribution: float
    expected_return_rate: float
    current_age: Optional[int]
    retirement_age: int
    desired_monthly_income: Optional[float]
    years_to_retirement: Optional[int]
    projected_corpus: Optional[float]
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class RetirementSummaryResponse(BaseModel):
    total_current_corpus: float
    total_monthly_contribution: float
    projected_total_corpus: float
    required_corpus: Optional[float]
    readiness_pct: Optional[float]
    plans: list
