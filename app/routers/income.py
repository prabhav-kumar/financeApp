"""
income.py — Income CRUD Router

Endpoints:
  POST   /income/       — add an income source
  GET    /income/       — list all income sources
  DELETE /income/{id}   — remove an income source
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.income import Income
from app.models.user import User
from app.schemas.income import IncomeCreate, IncomeUpdate, IncomeResponse
from app.utils.dependencies import get_current_user

router = APIRouter()


@router.post("/", response_model=IncomeResponse, status_code=status.HTTP_201_CREATED)
def add_income(
    payload: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a new income source for the authenticated user."""
    income = Income(
        user_id=current_user.id,
        source_name=payload.source_name,
        category=payload.category,
        amount=payload.amount,
        frequency=payload.frequency,
    )
    db.add(income)
    db.commit()
    db.refresh(income)
    return income


@router.get("/", response_model=List[IncomeResponse])
def list_incomes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all income sources for the authenticated user."""
    return db.query(Income).filter(Income.user_id == current_user.id).all()


@router.put("/{income_id}", response_model=IncomeResponse)
def update_income(
    income_id: int,
    payload: IncomeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update an existing income source (partial update).
    Only fields provided in the payload will be updated.
    """
    income = db.query(Income).filter(
        Income.id == income_id, Income.user_id == current_user.id
    ).first()
    if not income:
        raise HTTPException(status_code=404, detail="Income source not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(income, field, value)

    db.commit()
    db.refresh(income)
    return income


@router.delete("/{income_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_income(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an income source by ID (must belong to the current user)."""
    income = db.query(Income).filter(
        Income.id == income_id, Income.user_id == current_user.id
    ).first()
    if not income:
        raise HTTPException(status_code=404, detail="Income source not found.")
    db.delete(income)
    db.commit()
