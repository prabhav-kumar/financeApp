"""
Emergency Fund Model

Tracks emergency fund progress — target vs current savings.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class EmergencyFund(Base):
    __tablename__ = "emergency_funds"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    fund_name = Column(String(255), nullable=False, default="Emergency Fund")
    current_amount = Column(Float, nullable=False, default=0)
    target_amount = Column(Float, nullable=False)             # goal corpus
    monthly_contribution = Column(Float, nullable=False, default=0)
    months_of_expenses = Column(Integer, nullable=False, default=6)  # target coverage months

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="emergency_funds")

    def __repr__(self):
        return f"<EmergencyFund id={self.id} current={self.current_amount} target={self.target_amount}>"
