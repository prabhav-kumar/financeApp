from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional
from app.models.goal import GoalCategory, GoalStatus


class FinancialGoalCreate(BaseModel):
    goal_name: str
    category: GoalCategory
    target_amount: float
    current_amount: float = 0
    monthly_contribution: float = 0
    target_date: Optional[date] = None
    notes: Optional[str] = None


class FinancialGoalUpdate(BaseModel):
    goal_name: Optional[str] = None
    category: Optional[GoalCategory] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    monthly_contribution: Optional[float] = None
    target_date: Optional[date] = None
    status: Optional[GoalStatus] = None
    notes: Optional[str] = None


class FinancialGoalResponse(BaseModel):
    id: int
    goal_name: str
    category: GoalCategory
    target_amount: float
    current_amount: float
    monthly_contribution: float
    target_date: Optional[date]
    status: GoalStatus
    progress_pct: float
    months_to_goal: Optional[int]
    notes: Optional[str]
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
