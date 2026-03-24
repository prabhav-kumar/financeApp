"""
Income Model

Tracks user income sources — salary, freelance, dividends, etc.
Each record belongs to one user.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class IncomeCategory(str, enum.Enum):
    SALARY = "salary"
    FREELANCE = "freelance"
    BUSINESS = "business"
    DIVIDENDS = "dividends"
    RENTAL = "rental"
    INTEREST = "interest"
    OTHER = "other"


class IncomeFrequency(str, enum.Enum):
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    ONE_TIME = "one_time"


class Income(Base):
    __tablename__ = "incomes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    source_name = Column(String(255), nullable=False)          # e.g. "Acme Corp Salary"
    category = Column(Enum(IncomeCategory), nullable=False)
    amount = Column(Float, nullable=False)                      # per-period amount
    frequency = Column(Enum(IncomeFrequency), default=IncomeFrequency.MONTHLY)
    is_active = Column(Integer, default=1)                      # 1 = active, 0 = stopped
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # ── Relationship ─────────────────────────────────────
    owner = relationship("User", back_populates="incomes")

    def __repr__(self):
        return f"<Income id={self.id} source={self.source_name} amount={self.amount}>"
