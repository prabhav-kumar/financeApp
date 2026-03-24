from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional
from app.models.insurance import InsuranceType


class InsurancePolicyCreate(BaseModel):
    policy_name: str
    insurance_type: InsuranceType
    insurer: Optional[str] = None
    coverage_amount: float
    annual_premium: float
    policy_start_date: Optional[date] = None
    policy_end_date: Optional[date] = None


class InsurancePolicyUpdate(BaseModel):
    policy_name: Optional[str] = None
    insurance_type: Optional[InsuranceType] = None
    insurer: Optional[str] = None
    coverage_amount: Optional[float] = None
    annual_premium: Optional[float] = None
    policy_start_date: Optional[date] = None
    policy_end_date: Optional[date] = None
    is_active: Optional[int] = None


class InsurancePolicyResponse(BaseModel):
    id: int
    policy_name: str
    insurance_type: InsuranceType
    insurer: Optional[str]
    coverage_amount: float
    annual_premium: float
    monthly_premium: float
    policy_start_date: Optional[date]
    policy_end_date: Optional[date]
    is_active: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InsuranceSummaryResponse(BaseModel):
    total_coverage: float
    total_annual_premium: float
    total_monthly_premium: float
    active_policies: int
    coverage_by_type: dict
