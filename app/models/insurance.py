"""
Insurance Model

Tracks insurance policies — life, health, vehicle, term, etc.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class InsuranceType(str, enum.Enum):
    LIFE = "life"
    HEALTH = "health"
    TERM = "term"
    VEHICLE = "vehicle"
    HOME = "home"
    TRAVEL = "travel"
    OTHER = "other"


class InsurancePolicy(Base):
    __tablename__ = "insurance_policies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    policy_name = Column(String(255), nullable=False)         # e.g. "LIC Jeevan Anand"
    insurance_type = Column(Enum(InsuranceType), nullable=False)
    insurer = Column(String(255), nullable=True)              # e.g. "LIC", "HDFC Ergo"
    coverage_amount = Column(Float, nullable=False)           # sum assured
    annual_premium = Column(Float, nullable=False)
    policy_start_date = Column(Date, nullable=True)
    policy_end_date = Column(Date, nullable=True)
    is_active = Column(Integer, default=1)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="insurance_policies")

    def __repr__(self):
        return f"<InsurancePolicy id={self.id} name={self.policy_name}>"
