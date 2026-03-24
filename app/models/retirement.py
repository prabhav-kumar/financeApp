"""
Retirement Planning Model

Tracks retirement goals, contributions, and projections.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class RetirementAccountType(str, enum.Enum):
    EPF = "epf"
    PPF = "ppf"
    NPS = "nps"
    ELSS = "elss"
    PENSION = "pension"
    OTHER = "other"


class RetirementPlan(Base):
    __tablename__ = "retirement_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    plan_name = Column(String(255), nullable=False)           # e.g. "EPF Account"
    account_type = Column(Enum(RetirementAccountType), nullable=False)
    current_value = Column(Float, nullable=False, default=0)  # current corpus
    monthly_contribution = Column(Float, nullable=False, default=0)
    expected_return_rate = Column(Float, nullable=False, default=8.0)  # % p.a.
    current_age = Column(Integer, nullable=True)
    retirement_age = Column(Integer, nullable=True, default=60)
    desired_monthly_income = Column(Float, nullable=True)     # post-retirement monthly need

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="retirement_plans")

    def __repr__(self):
        return f"<RetirementPlan id={self.id} name={self.plan_name}>"
