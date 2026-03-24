"""
Expense Schemas — request/response models for monthly budget items.
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.expense import ExpenseCategory


class ExpenseCreate(BaseModel):
    """Payload to add a monthly expense item."""
    category: ExpenseCategory
    label: str
    monthly_amount: float


class ExpenseUpdate(BaseModel):
    """Payload to update an existing expense item."""
    category: Optional[ExpenseCategory] = None
    label: Optional[str] = None
    monthly_amount: Optional[float] = None
    is_active: Optional[int] = None


class ExpenseResponse(BaseModel):
    """Expense record returned from the API."""
    id: int
    category: ExpenseCategory
    label: str
    monthly_amount: float
    is_active: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ExpenseSummaryResponse(BaseModel):
    """Aggregated monthly expense overview."""
    total_monthly_expenses: float
    category_breakdown: dict  # { "housing": 15000, "food": 5000, ... }
    active_items: int
