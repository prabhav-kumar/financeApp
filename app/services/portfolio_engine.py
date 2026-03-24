"""
portfolio_engine.py — Portfolio Analysis Engine

Calculates:
  - Total portfolio value (invested vs. current market value)
  - Per-holding profit/loss
  - Asset allocation breakdown by investment type
"""

from typing import List
from sqlalchemy.orm import Session
from datetime import date

from app.models.investment import Investment
from app.services.market_data import get_current_price
from app.schemas.portfolio import (
    HoldingDetail,
    PortfolioSummary,
    AllocationItem,
    AssetAllocation,
)


def _resolve_current_price(inv: Investment) -> float:
    """
    Determine the current price for an investment.
    
    For market-traded assets (stocks, ETFs, MFs with a ticker),
    we fetch live data from Yahoo Finance.
    
    For non-traded assets (FD, PPF, gold without ticker),
    we fall back to the buy_price as a conservative estimate.
    """
    if inv.investment_type.value in ["fixed_deposit", "ppf"]:
        if inv.interest_rate:
            days = (date.today() - inv.buy_date).days
            if days > 0:
                years = days / 365.25
                # Using continuous compounding or simple annual compounding
                # P * (1 + r)^t
                current_price = inv.buy_price * ((1 + inv.interest_rate / 100) ** years)
                return current_price
        return inv.buy_price

    if inv.ticker_symbol:
        live_price = get_current_price(inv.ticker_symbol)
        if live_price is not None:
            return live_price
            
    # Fallback: use buy price (no market data available)
    return inv.buy_price


def calculate_portfolio_summary(db: Session, user_id: int) -> PortfolioSummary:
    """
    Build a complete portfolio summary with live pricing.

    Steps:
      1. Load all user investments from DB
      2. Fetch current market prices
      3. Compute per-holding and aggregate P&L
    """
    investments = db.query(Investment).filter(Investment.user_id == user_id).all()

    holdings: List[HoldingDetail] = []
    total_invested = 0.0
    total_current = 0.0

    for inv in investments:
        current_price = _resolve_current_price(inv)
        invested = inv.quantity * inv.buy_price
        current_val = inv.quantity * current_price
        pl = current_val - invested
        pl_pct = (pl / invested * 100) if invested > 0 else 0.0

        holdings.append(HoldingDetail(
            investment_id=inv.id,
            name=inv.name,
            ticker_symbol=inv.ticker_symbol,
            investment_type=inv.investment_type.value,
            quantity=inv.quantity,
            buy_price=inv.buy_price,
            current_price=round(current_price, 2),
            invested_value=round(invested, 2),
            current_value=round(current_val, 2),
            profit_loss=round(pl, 2),
            profit_loss_pct=round(pl_pct, 2),
        ))

        total_invested += invested
        total_current += current_val

    total_pl = total_current - total_invested
    total_pl_pct = (total_pl / total_invested * 100) if total_invested > 0 else 0.0

    return PortfolioSummary(
        total_invested=round(total_invested, 2),
        total_current_value=round(total_current, 2),
        total_profit_loss=round(total_pl, 2),
        total_profit_loss_pct=round(total_pl_pct, 2),
        holdings_count=len(holdings),
        holdings=holdings,
    )


def calculate_asset_allocation(db: Session, user_id: int) -> AssetAllocation:
    """
    Break down the portfolio by asset type (stock, MF, gold, etc.)
    and compute each type's percentage of the total.
    """
    investments = db.query(Investment).filter(Investment.user_id == user_id).all()

    # Group by investment type
    type_buckets: dict = {}  # type_name → {invested, current}

    for inv in investments:
        current_price = _resolve_current_price(inv)
        invested = inv.quantity * inv.buy_price
        current_val = inv.quantity * current_price
        type_name = inv.investment_type.value

        if type_name not in type_buckets:
            type_buckets[type_name] = {"invested": 0.0, "current": 0.0}
        type_buckets[type_name]["invested"] += invested
        type_buckets[type_name]["current"] += current_val

    total_value = sum(b["current"] for b in type_buckets.values())

    allocations = [
        AllocationItem(
            asset_type=asset_type,
            invested_value=round(data["invested"], 2),
            current_value=round(data["current"], 2),
            allocation_pct=round(
                (data["current"] / total_value * 100) if total_value > 0 else 0, 2
            ),
        )
        for asset_type, data in type_buckets.items()
    ]

    return AssetAllocation(
        total_value=round(total_value, 2),
        allocations=allocations,
    )
