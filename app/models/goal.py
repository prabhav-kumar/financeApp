"""
Financial Goal Model

Tracks savings goals — buying a car, house, vacation, education, etc.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class GoalCategory(str, enum.Enum):
    HOME = "home"
    CAR = "car"
    EDUCATION = "education"
    VACATION = "vacation"
    WEDDING = "wedding"
    GADGET = "gadget"
    BUSINESS = "business"
    EMERGENCY = "emergency"
    OTHER = "other"


class GoalStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"


class FinancialGoal(Base):
    __tablename__ = "financial_goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    goal_name = Column(String(255), nullable=False)           # e.g. "Buy a Honda City"
    category = Column(Enum(GoalCategory), nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, nullable=False, default=0)
    monthly_contribution = Column(Float, nullable=False, default=0)
    target_date = Column(Date, nullable=True)
    status = Column(Enum(GoalStatus), nullable=False, default=GoalStatus.ACTIVE)
    notes = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="financial_goals")

    @property
    def progress_pct(self) -> float:
        if self.target_amount <= 0:
            return 0.0
        return min(round(self.current_amount / self.target_amount * 100, 2), 100.0)

    def __repr__(self):
        return f"<FinancialGoal id={self.id} name={self.goal_name} progress={self.progress_pct}%>"
