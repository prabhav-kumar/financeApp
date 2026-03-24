"""
portfolio.py — Portfolio Analysis Router

Endpoints:
  GET /portfolio/summary      — total value, P&L, all holdings with live prices
  GET /portfolio/allocation   — asset allocation breakdown
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.schemas.portfolio import PortfolioSummary, AssetAllocation
from app.services.portfolio_engine import calculate_portfolio_summary, calculate_asset_allocation
from app.utils.dependencies import get_current_user

router = APIRouter()


@router.get("/summary", response_model=PortfolioSummary)
def portfolio_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a complete portfolio summary with live market prices.

    Returns:
      - Total invested value
      - Total current market value
      - Overall profit/loss (absolute & percentage)
      - Per-holding breakdown with individual P&L
    """
    return calculate_portfolio_summary(db, current_user.id)


@router.get("/allocation", response_model=AssetAllocation)
def asset_allocation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get asset allocation breakdown by investment type.

    Returns each type's invested value, current value,
    and percentage of the total portfolio.
    """
    return calculate_asset_allocation(db, current_user.id)
