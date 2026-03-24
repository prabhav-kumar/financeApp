from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class EmergencyFundCreate(BaseModel):
    fund_name: str = "Emergency Fund"
    current_amount: float = 0
    target_amount: float
    monthly_contribution: float = 0
    months_of_expenses: int = 6


class EmergencyFundUpdate(BaseModel):
    fund_name: Optional[str] = None
    current_amount: Optional[float] = None
    target_amount: Optional[float] = None
    monthly_contribution: Optional[float] = None
    months_of_expenses: Optional[int] = None


class EmergencyFundResponse(BaseModel):
    id: int
    fund_name: str
    current_amount: float
    target_amount: float
    monthly_contribution: float
    months_of_expenses: int
    progress_pct: float
    months_to_goal: Optional[int]
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
