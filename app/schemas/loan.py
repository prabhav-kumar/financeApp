"""
Loan Schemas — request/response models for loan CRUD.
"""

from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional
from app.models.loan import LoanType


class LoanCreate(BaseModel):
    """Payload to add a loan."""
    loan_name: str
    loan_type: LoanType
    principal_amount: float
    outstanding_balance: float
    interest_rate: float
    tenure_months: int
    emi_amount: float
    start_date: date


class LoanUpdate(BaseModel):
    """Payload to update an existing loan."""
    loan_name: Optional[str] = None
    loan_type: Optional[LoanType] = None
    principal_amount: Optional[float] = None
    outstanding_balance: Optional[float] = None
    interest_rate: Optional[float] = None
    tenure_months: Optional[int] = None
    emi_amount: Optional[float] = None
    start_date: Optional[date] = None
    is_active: Optional[int] = None



class LoanResponse(BaseModel):
    """Loan record returned from the API."""
    id: int
    loan_name: str
    loan_type: LoanType
    principal_amount: float
    outstanding_balance: float
    interest_rate: float
    tenure_months: int
    emi_amount: float
    start_date: date
    is_active: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
