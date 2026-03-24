"""
Metrics Schemas — response models for financial health indicators.
"""

from pydantic import BaseModel
from typing import Optional


class SavingsRateResponse(BaseModel):
    """Monthly savings rate = (income - expenses) / income × 100."""
    total_monthly_income: float
    total_monthly_expenses: float
    monthly_savings: float
    savings_rate_pct: float
    rating: str  # "excellent", "good", "fair", "poor"


class DebtToIncomeResponse(BaseModel):
    """DTI ratio = total monthly debt payments / gross monthly income × 100."""
    total_monthly_emi: float
    total_monthly_income: float
    dti_ratio_pct: float
    rating: str  # "low_risk", "moderate", "high_risk", "critical"


class DiversificationResponse(BaseModel):
    """How well-diversified the portfolio is across asset types."""
    unique_asset_types: int
    total_holdings: int
    largest_allocation_pct: float
    diversification_score: float  # 0 – 100
    rating: str  # "well_diversified", "moderate", "concentrated"


class RiskLevelResponse(BaseModel):
    """Composite risk assessment based on multiple factors."""
    equity_pct: float
    debt_pct: float
    dti_ratio: float
    savings_rate: float
    risk_score: float  # 0 – 100 (higher = riskier)
    risk_level: str  # "conservative", "moderate", "aggressive", "very_aggressive"


class FullFinancialReport(BaseModel):
    """Complete financial health snapshot."""
    savings: SavingsRateResponse
    debt_to_income: DebtToIncomeResponse
    diversification: DiversificationResponse
    risk: RiskLevelResponse
    ai_ready: bool = True  # flag indicating this data is structured for LLM consumption
    ai_summary_placeholder: Optional[str] = "Connect an LLM to generate personalised insights."
