"""
metrics.py — Financial Metrics Router

Endpoints:
  GET /metrics/savings-rate       — monthly savings rate
  GET /metrics/debt-to-income     — debt-to-income ratio
  GET /metrics/diversification    — investment diversification score
  GET /metrics/risk-level         — composite risk assessment
  GET /metrics/full-report        — complete financial health report
  GET /metrics/ai-advice          — AI advisor (stub — ready for LLM)
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.metrics import (
    SavingsRateResponse,
    DebtToIncomeResponse,
    DiversificationResponse,
    RiskLevelResponse,
    FullFinancialReport,
)
from app.services.metrics_engine import (
    calculate_savings_rate,
    calculate_debt_to_income,
    calculate_diversification,
    calculate_risk_level,
    generate_full_report,
)
from app.services.ai_advisor import generate_advice
from app.utils.dependencies import get_current_user

router = APIRouter()


@router.get("/savings-rate", response_model=SavingsRateResponse)
def savings_rate(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Calculate the user's monthly savings rate.
    
    Savings Rate = (Income − Expenses) / Income × 100
    
    Ratings: excellent (≥30%), good (≥20%), fair (≥10%), poor (<10%)
    """
    return calculate_savings_rate(db, current_user.id)


@router.get("/debt-to-income", response_model=DebtToIncomeResponse)
def debt_to_income(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Calculate the user's debt-to-income ratio.
    
    DTI = Total Monthly EMIs / Gross Monthly Income × 100
    
    Ratings: low_risk (≤20%), moderate (≤36%), high_risk (≤50%), critical (>50%)
    """
    return calculate_debt_to_income(db, current_user.id)


@router.get("/diversification", response_model=DiversificationResponse)
def diversification(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Calculate portfolio diversification score using the Herfindahl-Hirschman Index.
    
    Score of 100 = perfectly diversified; 0 = entirely concentrated.
    """
    return calculate_diversification(db, current_user.id)


@router.get("/risk-level", response_model=RiskLevelResponse)
def risk_level(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Compute a composite risk score (0–100) based on:
      - Equity allocation (40% weight)
      - DTI ratio (30% weight)
      - Savings rate (30% weight)
    """
    return calculate_risk_level(db, current_user.id)


@router.get("/full-report", response_model=FullFinancialReport)
def full_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate a complete financial health report combining all four metrics.
    This endpoint produces AI-ready structured data.
    """
    return generate_full_report(db, current_user.id)


@router.get("/ai-advice")
def ai_advice(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get AI-powered financial advice based on the full report.
    
    CURRENT: Returns a structured prompt ready for LLM consumption.
    FUTURE: Will return personalised advice from a connected LLM.
    """
    report = generate_full_report(db, current_user.id)
    return generate_advice(report)
