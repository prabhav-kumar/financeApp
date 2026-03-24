"""
Simulation Schemas — request/response models for the simulation engine.
"""

from pydantic import BaseModel
from typing import List


# ── Compound Growth ──────────────────────────────────────

class CompoundGrowthRequest(BaseModel):
    """Calculate future value with compound interest."""
    principal: float            # initial investment
    annual_rate: float          # annual interest rate in % (e.g. 12.0)
    years: int                  # investment duration
    compounding_frequency: int = 12  # times per year (12 = monthly)


class CompoundGrowthResponse(BaseModel):
    """Result of compound growth calculation."""
    principal: float
    annual_rate: float
    years: int
    compounding_frequency: int
    future_value: float
    total_interest_earned: float
    yearly_breakdown: List[dict]  # [{year, value, interest_earned}]


# ── Monthly Investment Projection (SIP / DCA) ───────────

class MonthlyInvestmentRequest(BaseModel):
    """Project wealth from regular monthly contributions."""
    monthly_amount: float       # amount invested each month
    annual_return: float        # expected annual return in %
    years: int                  # investment horizon
    initial_investment: float = 0.0  # optional lump sum at start


class MonthlyInvestmentResponse(BaseModel):
    """SIP / DCA projection result."""
    monthly_amount: float
    annual_return: float
    years: int
    initial_investment: float
    total_invested: float
    future_value: float
    total_returns: float
    yearly_breakdown: List[dict]  # [{year, invested, value, returns}]


# ── Loan Payoff Calculator ──────────────────────────────

class LoanPayoffRequest(BaseModel):
    """Calculate loan amortization schedule."""
    principal: float           # loan amount
    annual_rate: float         # annual interest rate in %
    tenure_months: int         # total months
    extra_monthly_payment: float = 0.0  # optional prepayment


class AmortizationEntry(BaseModel):
    """Single month in the amortization schedule."""
    month: int
    emi: float
    principal_component: float
    interest_component: float
    remaining_balance: float


class LoanPayoffResponse(BaseModel):
    """Full loan payoff analysis."""
    principal: float
    annual_rate: float
    tenure_months: int
    calculated_emi: float
    total_payment: float
    total_interest: float
    extra_monthly_payment: float
    months_saved: int          # months saved with extra payments
    interest_saved: float      # interest saved with extra payments
    schedule: List[AmortizationEntry]
