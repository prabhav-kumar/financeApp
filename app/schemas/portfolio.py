"""
Portfolio Schemas — response models for portfolio analysis.
"""

from pydantic import BaseModel
from typing import List, Optional


class HoldingDetail(BaseModel):
    """Single investment holding with live market data."""
    investment_id: int
    name: str
    ticker_symbol: Optional[str]
    investment_type: str
    quantity: float
    buy_price: float
    current_price: float
    invested_value: float
    current_value: float
    profit_loss: float
    profit_loss_pct: float


class PortfolioSummary(BaseModel):
    """Aggregate portfolio summary."""
    total_invested: float
    total_current_value: float
    total_profit_loss: float
    total_profit_loss_pct: float
    holdings_count: int
    holdings: List[HoldingDetail]


class AllocationItem(BaseModel):
    """Single slice of the asset allocation pie."""
    asset_type: str
    invested_value: float
    current_value: float
    allocation_pct: float  # percentage of total portfolio


class AssetAllocation(BaseModel):
    """Full asset allocation breakdown."""
    total_value: float
    allocations: List[AllocationItem]
