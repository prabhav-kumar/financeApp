"""
simulation_engine.py — Financial Simulation Engine

Three core calculators:
  1. Compound Growth  — standard compound interest with yearly breakdown
  2. Monthly Investment Projection — SIP/DCA with optional lump sum
  3. Loan Payoff — full amortization schedule with prepayment analysis

All outputs include period-by-period breakdowns for charting on the frontend.
"""

import math
from typing import List

from app.schemas.simulation import (
    CompoundGrowthRequest,
    CompoundGrowthResponse,
    MonthlyInvestmentRequest,
    MonthlyInvestmentResponse,
    LoanPayoffRequest,
    LoanPayoffResponse,
    AmortizationEntry,
)


# ─────────────────────────────────────────────────────────
# 1. COMPOUND GROWTH CALCULATOR
# ─────────────────────────────────────────────────────────

def calculate_compound_growth(req: CompoundGrowthRequest) -> CompoundGrowthResponse:
    """
    Future Value = P × (1 + r/n)^(n×t)

    Where:
      P = principal
      r = annual rate (decimal)
      n = compounding frequency per year
      t = years

    Generates a yearly breakdown for charting.
    """
    P = req.principal
    r = req.annual_rate / 100      # convert % to decimal
    n = req.compounding_frequency
    t = req.years

    yearly_breakdown: List[dict] = []

    for year in range(1, t + 1):
        value = P * math.pow(1 + r / n, n * year)
        interest = value - P
        yearly_breakdown.append({
            "year": year,
            "value": round(value, 2),
            "interest_earned": round(interest, 2),
        })

    final_value = P * math.pow(1 + r / n, n * t)
    total_interest = final_value - P

    return CompoundGrowthResponse(
        principal=P,
        annual_rate=req.annual_rate,
        years=t,
        compounding_frequency=n,
        future_value=round(final_value, 2),
        total_interest_earned=round(total_interest, 2),
        yearly_breakdown=yearly_breakdown,
    )


# ─────────────────────────────────────────────────────────
# 2. MONTHLY INVESTMENT PROJECTION (SIP / DCA)
# ─────────────────────────────────────────────────────────

def calculate_monthly_investment(req: MonthlyInvestmentRequest) -> MonthlyInvestmentResponse:
    """
    Projects wealth accumulation from regular monthly contributions.

    Formula (lump sum + SIP combined):
      FV_lump = initial × (1 + r_m)^(total_months)
      FV_sip  = PMT × [((1 + r_m)^n − 1) / r_m]
      Total   = FV_lump + FV_sip

    Where r_m = monthly rate = annual_return / 12 / 100

    Generates a yearly breakdown.
    """
    monthly = req.monthly_amount
    annual_return = req.annual_return / 100
    monthly_rate = annual_return / 12
    years = req.years
    initial = req.initial_investment

    yearly_breakdown: List[dict] = []
    total_months = years * 12

    for year in range(1, years + 1):
        months = year * 12
        total_invested = initial + monthly * months

        if monthly_rate > 0:
            # Lump sum growth
            fv_lump = initial * math.pow(1 + monthly_rate, months)
            # SIP future value
            fv_sip = monthly * ((math.pow(1 + monthly_rate, months) - 1) / monthly_rate)
            value = fv_lump + fv_sip
        else:
            # Zero return — just sum contributions
            value = total_invested

        returns = value - total_invested
        yearly_breakdown.append({
            "year": year,
            "invested": round(total_invested, 2),
            "value": round(value, 2),
            "returns": round(returns, 2),
        })

    # Final values
    total_invested_final = initial + monthly * total_months
    if monthly_rate > 0:
        fv_final = initial * math.pow(1 + monthly_rate, total_months) + \
                   monthly * ((math.pow(1 + monthly_rate, total_months) - 1) / monthly_rate)
    else:
        fv_final = total_invested_final

    return MonthlyInvestmentResponse(
        monthly_amount=monthly,
        annual_return=req.annual_return,
        years=years,
        initial_investment=initial,
        total_invested=round(total_invested_final, 2),
        future_value=round(fv_final, 2),
        total_returns=round(fv_final - total_invested_final, 2),
        yearly_breakdown=yearly_breakdown,
    )


# ─────────────────────────────────────────────────────────
# 3. LOAN PAYOFF CALCULATOR
# ─────────────────────────────────────────────────────────

def _calculate_emi(principal: float, monthly_rate: float, tenure_months: int) -> float:
    """
    Standard EMI formula:
      EMI = P × r × (1+r)^n / ((1+r)^n − 1)
    """
    if monthly_rate == 0:
        return principal / tenure_months
    r = monthly_rate
    n = tenure_months
    emi = principal * r * math.pow(1 + r, n) / (math.pow(1 + r, n) - 1)
    return emi


def calculate_loan_payoff(req: LoanPayoffRequest) -> LoanPayoffResponse:
    """
    Generate a full amortization schedule.

    Supports optional extra monthly payments to show:
      - How many months are saved
      - How much interest is saved

    Each row in the schedule shows:
      month, EMI, principal component, interest component, remaining balance.
    """
    P = req.principal
    annual_rate = req.annual_rate / 100
    monthly_rate = annual_rate / 12
    tenure = req.tenure_months
    extra = req.extra_monthly_payment

    emi = _calculate_emi(P, monthly_rate, tenure)

    # ── Build schedule WITHOUT extra payments (baseline) ──
    baseline_total = emi * tenure
    baseline_interest = baseline_total - P

    # ── Build schedule WITH extra payments ────────────────
    schedule: List[AmortizationEntry] = []
    balance = P
    total_paid = 0.0
    month = 0

    while balance > 0.01 and month < tenure * 2:  # safety cap
        month += 1
        interest_component = balance * monthly_rate
        principal_component = emi - interest_component + extra

        # Don't overpay
        if principal_component > balance:
            principal_component = balance
            actual_payment = principal_component + interest_component
        else:
            actual_payment = emi + extra

        balance -= principal_component
        if balance < 0:
            balance = 0
        total_paid += actual_payment

        schedule.append(AmortizationEntry(
            month=month,
            emi=round(actual_payment, 2),
            principal_component=round(principal_component, 2),
            interest_component=round(interest_component, 2),
            remaining_balance=round(balance, 2),
        ))

    total_interest_paid = total_paid - P
    months_saved = tenure - month if month < tenure else 0
    interest_saved = baseline_interest - total_interest_paid if extra > 0 else 0

    return LoanPayoffResponse(
        principal=P,
        annual_rate=req.annual_rate,
        tenure_months=tenure,
        calculated_emi=round(emi, 2),
        total_payment=round(total_paid, 2),
        total_interest=round(total_interest_paid, 2),
        extra_monthly_payment=extra,
        months_saved=max(0, months_saved),
        interest_saved=round(max(0, interest_saved), 2),
        schedule=schedule,
    )
