from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from app.models.tax import TaxRegime, DeductionSection


class TaxRecordCreate(BaseModel):
    financial_year: str  # "2024-25"
    regime: TaxRegime = TaxRegime.NEW
    gross_income: float = 0
    deduction_section: DeductionSection
    deduction_label: str
    deduction_amount: float
    tax_paid: float = 0


class TaxRecordUpdate(BaseModel):
    financial_year: Optional[str] = None
    regime: Optional[TaxRegime] = None
    gross_income: Optional[float] = None
    deduction_section: Optional[DeductionSection] = None
    deduction_label: Optional[str] = None
    deduction_amount: Optional[float] = None
    tax_paid: Optional[float] = None


class TaxRecordResponse(BaseModel):
    id: int
    financial_year: str
    regime: TaxRegime
    gross_income: float
    deduction_section: DeductionSection
    deduction_label: str
    deduction_amount: float
    tax_paid: float
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TaxSummaryResponse(BaseModel):
    financial_year: str
    regime: str
    gross_income: float
    total_deductions: float
    taxable_income: float
    estimated_tax: float
    tax_paid: float
    tax_remaining: float
    deductions_by_section: dict
