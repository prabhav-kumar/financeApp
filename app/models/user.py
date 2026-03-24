"""
User Model

Stores registered users with hashed passwords.
One user → many incomes, expenses, investments, and loans.
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # ── Relationships ────────────────────────────────────
    incomes = relationship("Income", back_populates="owner", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="owner", cascade="all, delete-orphan")
    investments = relationship("Investment", back_populates="owner", cascade="all, delete-orphan")
    loans = relationship("Loan", back_populates="owner", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="owner", cascade="all, delete-orphan")
    emergency_funds = relationship("EmergencyFund", back_populates="owner", cascade="all, delete-orphan")
    insurance_policies = relationship("InsurancePolicy", back_populates="owner", cascade="all, delete-orphan")
    financial_goals = relationship("FinancialGoal", back_populates="owner", cascade="all, delete-orphan")
    retirement_plans = relationship("RetirementPlan", back_populates="owner", cascade="all, delete-orphan")
    tax_records = relationship("TaxRecord", back_populates="owner", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User id={self.id} email={self.email}>"
