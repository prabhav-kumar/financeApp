"""
Income Schemas — request/response models for income CRUD.
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.income import IncomeCategory, IncomeFrequency


class IncomeCreate(BaseModel):
    """Payload to add a new income source."""
    source_name: str
    category: IncomeCategory
    amount: float
    frequency: IncomeFrequency = IncomeFrequency.MONTHLY


class IncomeUpdate(BaseModel):
    """Payload to update an existing income source."""
    source_name: Optional[str] = None
    category: Optional[IncomeCategory] = None
    amount: Optional[float] = None
    frequency: Optional[IncomeFrequency] = None
    is_active: Optional[int] = None



class IncomeResponse(BaseModel):
    """Income record returned from the API."""
    id: int
    source_name: str
    category: IncomeCategory
    amount: float
    frequency: IncomeFrequency
    is_active: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
