"""
Budget Model

Tracks monthly budget limits per category and actual spending.
Enables budget vs actual analysis.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class BudgetCategory(str, enum.Enum):
    HOUSING = "housing"
    FOOD = "food"
    TRANSPORT = "transport"
    UTILITIES = "utilities"
    HEALTHCARE = "healthcare"
    ENTERTAINMENT = "entertainment"
    EDUCATION = "education"
    SHOPPING = "shopping"
    INSURANCE = "insurance"
    SAVINGS = "savings"
    INVESTMENTS = "investments"
    PERSONAL_CARE = "personal_care"
    DINING_OUT = "dining_out"
    SUBSCRIPTIONS = "subscriptions"
    OTHER = "other"


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    month = Column(String(7), nullable=False)                 # e.g. "2025-03"
    category = Column(Enum(BudgetCategory), nullable=False)
    budgeted_amount = Column(Float, nullable=False)           # planned spend
    actual_amount = Column(Float, nullable=False, default=0)  # actual spend
    notes = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="budgets")

    @property
    def variance(self) -> float:
        """Positive = under budget, Negative = over budget."""
        return round(self.budgeted_amount - self.actual_amount, 2)

    def __repr__(self):
        return f"<Budget id={self.id} month={self.month} category={self.category}>"
