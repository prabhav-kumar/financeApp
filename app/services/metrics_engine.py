"""
metrics_engine.py — Financial Metrics Calculator

Implements four key personal finance health indicators:
  1. Savings Rate        — how much of income is being saved
  2. Debt-to-Income      — how much income goes to debt payments
  3. Diversification     — how spread out the portfolio is
  4. Risk Level          — composite risk score

All functions return structured data ready for LLM consumption.
"""

from sqlalchemy.orm import Session
from app.models.income import Income
from app.models.expense import Expense
from app.models.investment import Investment
from app.models.loan import Loan
from app.schemas.metrics import (
    SavingsRateResponse,
    DebtToIncomeResponse,
    DiversificationResponse,
    RiskLevelResponse,
    FullFinancialReport,
)


# ─────────────────────────────────────────────────────────
# 1. SAVINGS RATE
# ─────────────────────────────────────────────────────────

def _normalise_to_monthly(amount: float, frequency: str) -> float:
    """Convert any income frequency to a monthly equivalent."""
    multipliers = {
        "monthly": 1.0,
        "quarterly": 1 / 3,
        "yearly": 1 / 12,
        "one_time": 0.0,  # one-time income is excluded from recurring calcs
    }
    return amount * multipliers.get(frequency, 1.0)


def calculate_savings_rate(db: Session, user_id: int) -> SavingsRateResponse:
    """
    Savings Rate = (Monthly Income − Monthly Expenses) / Monthly Income × 100

    Rating scale:
      ≥ 30%  → excellent
      ≥ 20%  → good
      ≥ 10%  → fair
      < 10%  → poor
    """
    # Sum all active income sources, normalised to monthly
    incomes = db.query(Income).filter(
        Income.user_id == user_id, Income.is_active == 1
    ).all()
    monthly_income = sum(
        _normalise_to_monthly(i.amount, i.frequency.value) for i in incomes
    )

    # Sum all active monthly expense budget items
    expenses = db.query(Expense).filter(
        Expense.user_id == user_id, Expense.is_active == 1
    ).all()
    monthly_expenses = sum(e.monthly_amount for e in expenses)

    savings = monthly_income - monthly_expenses
    rate = (savings / monthly_income * 100) if monthly_income > 0 else 0.0

    if rate >= 30:
        rating = "excellent"
    elif rate >= 20:
        rating = "good"
    elif rate >= 10:
        rating = "fair"
    else:
        rating = "poor"

    return SavingsRateResponse(
        total_monthly_income=round(monthly_income, 2),
        total_monthly_expenses=round(monthly_expenses, 2),
        monthly_savings=round(savings, 2),
        savings_rate_pct=round(rate, 2),
        rating=rating,
    )


# ─────────────────────────────────────────────────────────
# 2. DEBT-TO-INCOME RATIO
# ─────────────────────────────────────────────────────────

def calculate_debt_to_income(db: Session, user_id: int) -> DebtToIncomeResponse:
    """
    DTI Ratio = Total Monthly EMIs / Gross Monthly Income × 100

    Rating scale:
      ≤ 20%  → low_risk
      ≤ 36%  → moderate
      ≤ 50%  → high_risk
      > 50%  → critical
    """
    # Monthly income
    incomes = db.query(Income).filter(
        Income.user_id == user_id, Income.is_active == 1
    ).all()
    monthly_income = sum(
        _normalise_to_monthly(i.amount, i.frequency.value) for i in incomes
    )

    # Total monthly EMI across active loans
    loans = db.query(Loan).filter(
        Loan.user_id == user_id, Loan.is_active == 1
    ).all()
    total_emi = sum(l.emi_amount for l in loans)

    dti = (total_emi / monthly_income * 100) if monthly_income > 0 else 0.0

    if dti <= 20:
        rating = "low_risk"
    elif dti <= 36:
        rating = "moderate"
    elif dti <= 50:
        rating = "high_risk"
    else:
        rating = "critical"

    return DebtToIncomeResponse(
        total_monthly_emi=round(total_emi, 2),
        total_monthly_income=round(monthly_income, 2),
        dti_ratio_pct=round(dti, 2),
        rating=rating,
    )


# ─────────────────────────────────────────────────────────
# 3. DIVERSIFICATION SCORE
# ─────────────────────────────────────────────────────────

def calculate_diversification(db: Session, user_id: int) -> DiversificationResponse:
    """
    Diversification Score (0–100) based on:
      - Number of distinct asset types
      - Concentration — how much is in the single largest type

    A perfectly diversified portfolio across N types would score 100.
    A portfolio with everything in one type scores near 0.
    
    Formula: score = (1 − HHI) × 100, where HHI is the Herfindahl index.
    """
    investments = db.query(Investment).filter(
        Investment.user_id == user_id
    ).all()

    if not investments:
        return DiversificationResponse(
            unique_asset_types=0,
            total_holdings=0,
            largest_allocation_pct=0.0,
            diversification_score=0.0,
            rating="concentrated",
        )

    # Group by type
    type_values: dict = {}
    for inv in investments:
        t = inv.investment_type.value
        type_values[t] = type_values.get(t, 0) + (inv.quantity * inv.buy_price)

    total = sum(type_values.values())
    if total == 0:
        return DiversificationResponse(
            unique_asset_types=len(type_values),
            total_holdings=len(investments),
            largest_allocation_pct=0.0,
            diversification_score=0.0,
            rating="concentrated",
        )

    # Calculate Herfindahl-Hirschman Index (HHI)
    shares = [v / total for v in type_values.values()]
    hhi = sum(s ** 2 for s in shares)
    score = (1 - hhi) * 100
    largest = max(shares) * 100

    if score >= 60:
        rating = "well_diversified"
    elif score >= 30:
        rating = "moderate"
    else:
        rating = "concentrated"

    return DiversificationResponse(
        unique_asset_types=len(type_values),
        total_holdings=len(investments),
        largest_allocation_pct=round(largest, 2),
        diversification_score=round(score, 2),
        rating=rating,
    )


# ─────────────────────────────────────────────────────────
# 4. RISK LEVEL
# ─────────────────────────────────────────────────────────

def calculate_risk_level(db: Session, user_id: int) -> RiskLevelResponse:
    """
    Composite risk score (0–100) based on:
      - Equity allocation percentage  (higher equity = higher risk)
      - Debt-to-income ratio          (higher DTI = higher risk)
      - Savings rate                  (lower savings = higher risk)

    Risk is a weighted average:
      equity_weight = 0.4
      dti_weight    = 0.3
      savings_weight = 0.3
    """
    # Equity vs. non-equity split
    investments = db.query(Investment).filter(Investment.user_id == user_id).all()
    equity_types = {"stock", "etf", "crypto"}  # higher-risk categories
    equity_val = 0.0
    debt_val = 0.0

    for inv in investments:
        val = inv.quantity * inv.buy_price
        if inv.investment_type.value in equity_types:
            equity_val += val
        else:
            debt_val += val

    total_inv = equity_val + debt_val
    equity_pct = (equity_val / total_inv * 100) if total_inv > 0 else 0
    debt_pct = 100 - equity_pct if total_inv > 0 else 0

    # Get DTI and savings rate
    dti_data = calculate_debt_to_income(db, user_id)
    savings_data = calculate_savings_rate(db, user_id)

    # Normalise components to 0–100 risk scale
    equity_risk = min(equity_pct, 100)                         # 100% equity = 100 risk
    dti_risk = min(dti_data.dti_ratio_pct * 2, 100)            # DTI 50% → risk 100
    savings_risk = max(0, 100 - savings_data.savings_rate_pct * 2)  # 50% savings → risk 0

    risk_score = (
        equity_risk * 0.4
        + dti_risk * 0.3
        + savings_risk * 0.3
    )

    if risk_score <= 25:
        level = "conservative"
    elif risk_score <= 50:
        level = "moderate"
    elif risk_score <= 75:
        level = "aggressive"
    else:
        level = "very_aggressive"

    return RiskLevelResponse(
        equity_pct=round(equity_pct, 2),
        debt_pct=round(debt_pct, 2),
        dti_ratio=round(dti_data.dti_ratio_pct, 2),
        savings_rate=round(savings_data.savings_rate_pct, 2),
        risk_score=round(risk_score, 2),
        risk_level=level,
    )


# ─────────────────────────────────────────────────────────
# 5. FULL FINANCIAL REPORT
# ─────────────────────────────────────────────────────────

def generate_full_report(db: Session, user_id: int) -> FullFinancialReport:
    """Combine all four metrics into a single comprehensive report."""
    return FullFinancialReport(
        savings=calculate_savings_rate(db, user_id),
        debt_to_income=calculate_debt_to_income(db, user_id),
        diversification=calculate_diversification(db, user_id),
        risk=calculate_risk_level(db, user_id),
        ai_ready=True,
        ai_summary_placeholder="Connect an LLM to generate personalised insights from this data.",
    )
