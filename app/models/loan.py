"""
Loan Model

Tracks user loans — home, car, personal, education, credit card, etc.
Stores EMI, interest rate, and tenure for payoff calculations.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class LoanType(str, enum.Enum):
    HOME = "home"
    CAR = "car"
    PERSONAL = "personal"
    EDUCATION = "education"
    CREDIT_CARD = "credit_card"
    BUSINESS = "business"
    OTHER = "other"


class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    loan_name = Column(String(255), nullable=False)            # e.g. "HDFC Home Loan"
    loan_type = Column(Enum(LoanType), nullable=False)

    principal_amount = Column(Float, nullable=False)            # original loan amount
    outstanding_balance = Column(Float, nullable=False)         # current remaining balance
    interest_rate = Column(Float, nullable=False)               # annual interest rate (%)
    tenure_months = Column(Integer, nullable=False)             # total tenure in months
    emi_amount = Column(Float, nullable=False)                  # monthly EMI

    start_date = Column(Date, nullable=False)
    is_active = Column(Integer, default=1)                      # 1 = ongoing, 0 = closed

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # ── Relationship ─────────────────────────────────────
    owner = relationship("User", back_populates="loans")

    def __repr__(self):
        return f"<Loan id={self.id} name={self.loan_name} balance={self.outstanding_balance}>"
