"""
investment.py — Investment CRUD Router

Endpoints:
  POST   /investment/       — add an investment holding
  GET    /investment/       — list all investments
  PUT    /investment/{id}   — update an investment
  DELETE /investment/{id}   — remove an investment
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.investment import Investment
from app.models.user import User
from app.schemas.investment import InvestmentCreate, InvestmentUpdate, InvestmentResponse
from app.utils.dependencies import get_current_user
import httpx

router = APIRouter()

@router.get("/search")
async def search_investments(
    q: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Search for investment tickers using Yahoo Finance public autocomplete API.
    Returns matched symbols, names, and types (e.g. EQUITY, MUTUALFUND, ETF).
    """
    if len(q) < 2:
        return []
    
    url = f"https://query2.finance.yahoo.com/v1/finance/search?q={q}&quotesCount=8&newsCount=0"
    # Yahoo Finance rejects automated User-Agents, so we spoof a standard browser
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                print("Failed YF search", resp.status_code)
                return []
            data = resp.json()
            quotes = data.get("quotes", [])
            results = []
            for quote in quotes:
                # Filter out pure indices or unknown types if needed, or just return them
                if quote.get("quoteType") not in ["INDEX", "CURRENCY"]:
                    results.append({
                        "symbol": quote.get("symbol", ""),
                        "name": quote.get("shortname") or quote.get("longname") or quote.get("symbol"),
                        "type": quote.get("quoteType", "OTHER"),
                        "exchange": quote.get("exchange", "")
                    })
            return results
        except Exception as e:
            print("Error YF search:", e)
            return []


@router.post("/", response_model=InvestmentResponse, status_code=status.HTTP_201_CREATED)
def add_investment(
    payload: InvestmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a new investment holding for the authenticated user."""
    investment = Investment(
        user_id=current_user.id,
        name=payload.name,
        ticker_symbol=payload.ticker_symbol,
        investment_type=payload.investment_type,
        quantity=payload.quantity,
        buy_price=payload.buy_price,
        buy_date=payload.buy_date,
        interest_rate=payload.interest_rate,
        maturity_date=payload.maturity_date,
    )
    db.add(investment)
    db.commit()
    db.refresh(investment)
    return investment


@router.get("/", response_model=List[InvestmentResponse])
def list_investments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all investment holdings for the authenticated user."""
    return db.query(Investment).filter(Investment.user_id == current_user.id).all()


@router.put("/{investment_id}", response_model=InvestmentResponse)
def update_investment(
    investment_id: int,
    payload: InvestmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update an existing investment (partial update).
    Only fields provided in the payload will be updated.
    """
    investment = db.query(Investment).filter(
        Investment.id == investment_id, Investment.user_id == current_user.id
    ).first()
    if not investment:
        raise HTTPException(status_code=404, detail="Investment not found.")

    # Apply only non-None fields from the update payload
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(investment, field, value)

    db.commit()
    db.refresh(investment)
    return investment


@router.delete("/{investment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_investment(
    investment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an investment by ID (must belong to the current user)."""
    investment = db.query(Investment).filter(
        Investment.id == investment_id, Investment.user_id == current_user.id
    ).first()
    if not investment:
        raise HTTPException(status_code=404, detail="Investment not found.")
    db.delete(investment)
    db.commit()
