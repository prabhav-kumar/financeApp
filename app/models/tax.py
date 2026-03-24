"""
Tax Record Model

Tracks tax deductions, paid taxes, and tax-saving investments per financial year.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class TaxRegime(str, enum.Enum):
    OLD = "old"
    NEW = "new"


class DeductionSection(str, enum.Enum):
    SEC_80C = "80c"           # PPF, ELSS, LIC, EPF, etc. (max 1.5L)
    SEC_80D = "80d"           # Health insurance premium
    SEC_80E = "80e"           # Education loan interest
    SEC_80G = "80g"           # Donations
    SEC_80TTA = "80tta"       # Savings account interest
    HRA = "hra"               # House Rent Allowance
    NPS_80CCD = "nps_80ccd"   # NPS additional (50k)
    HOME_LOAN = "home_loan"   # Home loan interest (24b)
    OTHER = "other"


class TaxRecord(Base):
    __tablename__ = "tax_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    financial_year = Column(String(10), nullable=False)       # e.g. "2024-25"
    regime = Column(Enum(TaxRegime), nullable=False, default=TaxRegime.NEW)
    gross_income = Column(Float, nullable=False, default=0)
    deduction_section = Column(Enum(DeductionSection), nullable=False)
    deduction_label = Column(String(255), nullable=False)     # e.g. "PPF Contribution"
    deduction_amount = Column(Float, nullable=False)
    tax_paid = Column(Float, nullable=True, default=0)        # TDS / advance tax paid

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    owner = relationship("User", back_populates="tax_records")

    def __repr__(self):
        return f"<TaxRecord id={self.id} fy={self.financial_year} section={self.deduction_section}>"
