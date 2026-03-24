"""
Investment Schemas — request/response models for investment CRUD.
"""

from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional
from app.models.investment import InvestmentType


class InvestmentCreate(BaseModel):
    """Payload to add an investment holding."""
    name: str
    ticker_symbol: Optional[str] = None
    investment_type: InvestmentType
    quantity: float
    buy_price: float
    buy_date: date
    interest_rate: Optional[float] = None
    maturity_date: Optional[date] = None


class InvestmentUpdate(BaseModel):
    """Payload to update an existing investment (partial update)."""
    name: Optional[str] = None
    ticker_symbol: Optional[str] = None
    investment_type: Optional[InvestmentType] = None
    quantity: Optional[float] = None
    buy_price: Optional[float] = None
    buy_date: Optional[date] = None
    interest_rate: Optional[float] = None
    maturity_date: Optional[date] = None


class InvestmentResponse(BaseModel):
    """Investment record returned from the API."""
    id: int
    name: str
    ticker_symbol: Optional[str]
    investment_type: InvestmentType
    quantity: float
    buy_price: float
    buy_date: date
    interest_rate: Optional[float]
    maturity_date: Optional[date]
    invested_value: float
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
