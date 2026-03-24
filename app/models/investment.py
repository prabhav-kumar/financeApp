"""
Investment Model

Stores user holdings — stocks, mutual funds, ETFs, crypto, gold, etc.
Tracks purchase price so we can calculate P&L against live market data.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.database import Base


class InvestmentType(str, enum.Enum):
    STOCK = "stock"
    MUTUAL_FUND = "mutual_fund"
    ETF = "etf"
    CRYPTO = "crypto"
    GOLD = "gold"
    SILVER = "silver"
    FIXED_DEPOSIT = "fixed_deposit"
    PPF = "ppf"


class Investment(Base):
    __tablename__ = "investments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(255), nullable=False)            # e.g. "Reliance Industries"
    ticker_symbol = Column(String(50), nullable=True)     # e.g. "RELIANCE.NS" (Yahoo format)
    investment_type = Column(Enum(InvestmentType), nullable=False)

    quantity = Column(Float, nullable=False)               # number of shares/units
    buy_price = Column(Float, nullable=False)              # price per unit at purchase
    buy_date = Column(Date, nullable=False)

    # For fixed-return instruments (FD, PPF)
    interest_rate = Column(Float, nullable=True)           # annual rate (e.g. 7.5)
    maturity_date = Column(Date, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # ── Relationship ─────────────────────────────────────
    owner = relationship("User", back_populates="investments")

    @property
    def invested_value(self) -> float:
        """Total capital deployed = quantity × buy_price."""
        return self.quantity * self.buy_price

    def __repr__(self):
        return f"<Investment id={self.id} name={self.name} qty={self.quantity}>"
