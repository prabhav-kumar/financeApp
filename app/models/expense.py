"""
Expense Model

Tracks fixed monthly expense allocations per category.
Each row represents "I spend ₹X per month on category Y".
This is NOT a per-transaction log — it is a budget definition.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class ExpenseCategory(str, enum.Enum):
    HOUSING = "housing"
    FOOD = "food"
    TRANSPORT = "transport"
    UTILITIES = "utilities"
    HEALTHCARE = "healthcare"
    ENTERTAINMENT = "entertainment"
    EDUCATION = "education"
    SHOPPING = "shopping"
    INSURANCE = "insurance"
    EMI = "emi"
    OTHER = "other"


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category = Column(Enum(ExpenseCategory), nullable=False, unique=False)
    label = Column(String(255), nullable=False)            # e.g. "House Rent", "Groceries", "Netflix"
    monthly_amount = Column(Float, nullable=False)          # fixed monthly spend
    is_active = Column(Integer, default=1)                  # 1 = active, 0 = paused
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # ── Relationship ─────────────────────────────────────
    owner = relationship("User", back_populates="expenses")

    def __repr__(self):
        return f"<Expense id={self.id} label={self.label} monthly={self.monthly_amount}>"
