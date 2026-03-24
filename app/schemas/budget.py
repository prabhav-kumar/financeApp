from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict
from app.models.budget import BudgetCategory


class BudgetCreate(BaseModel):
    month: str  # "2025-03"
    category: BudgetCategory
    budgeted_amount: float
    actual_amount: float = 0
    notes: Optional[str] = None


class BudgetUpdate(BaseModel):
    month: Optional[str] = None
    category: Optional[BudgetCategory] = None
    budgeted_amount: Optional[float] = None
    actual_amount: Optional[float] = None
    notes: Optional[str] = None


class BudgetResponse(BaseModel):
    id: int
    month: str
    category: BudgetCategory
    budgeted_amount: float
    actual_amount: float
    variance: float
    notes: Optional[str]
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BudgetSummaryResponse(BaseModel):
    month: str
    total_budgeted: float
    total_actual: float
    total_variance: float
    category_breakdown: Dict[str, dict]  # {category: {budgeted, actual, variance}}
