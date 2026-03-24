"""
simulation.py — Simulation Engine Router

Endpoints:
  POST /simulation/compound-growth       — compound interest projection
  POST /simulation/monthly-investment    — SIP/DCA projection
  POST /simulation/loan-payoff           — loan amortization schedule
"""

from fastapi import APIRouter

from app.schemas.simulation import (
    CompoundGrowthRequest,
    CompoundGrowthResponse,
    MonthlyInvestmentRequest,
    MonthlyInvestmentResponse,
    LoanPayoffRequest,
    LoanPayoffResponse,
)
from app.services.simulation_engine import (
    calculate_compound_growth,
    calculate_monthly_investment,
    calculate_loan_payoff,
)

router = APIRouter()


@router.post("/compound-growth", response_model=CompoundGrowthResponse)
def compound_growth(payload: CompoundGrowthRequest):
    """
    Calculate compound interest growth over a given period.

    Example:
      ₹1,00,000 at 12% for 10 years, compounded monthly
      → Future value with yearly breakdown

    Note: This is a public endpoint (no auth required) — 
    simulation tools are available to all users.
    """
    return calculate_compound_growth(payload)


@router.post("/monthly-investment", response_model=MonthlyInvestmentResponse)
def monthly_investment(payload: MonthlyInvestmentRequest):
    """
    Project wealth from systematic monthly investments (SIP / DCA).

    Example:
      ₹10,000/month at 15% return for 20 years, starting with ₹50,000 lump sum
      → Total invested, future value, returns, yearly breakdown

    Supports both lump-sum + SIP and SIP-only scenarios.
    """
    return calculate_monthly_investment(payload)


@router.post("/loan-payoff", response_model=LoanPayoffResponse)
def loan_payoff(payload: LoanPayoffRequest):
    """
    Generate a complete loan amortization schedule.

    Features:
      - Standard EMI calculation
      - Month-by-month breakdown (principal, interest, balance)
      - Optional extra monthly payment analysis
      - Shows months saved and interest saved with prepayments

    Example:
      ₹50,00,000 home loan at 8.5% for 20 years, with ₹5,000 extra/month
      → Full schedule + savings analysis
    """
    return calculate_loan_payoff(payload)
