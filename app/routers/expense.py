"""
expense.py — Monthly Expense Budget Router

Endpoints:
  POST   /expense/          — add a monthly expense line item
  GET    /expense/          — list all monthly expense items
  GET    /expense/summary   — aggregated monthly expense breakdown
  PUT    /expense/{id}      — update an expense item
  DELETE /expense/{id}      — remove an expense item
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.expense import Expense
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseSummaryResponse
from app.utils.dependencies import get_current_user

router = APIRouter()


@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def add_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a new monthly expense item (e.g. 'Rent → ₹15,000/mo')."""
    expense = Expense(
        user_id=current_user.id,
        category=payload.category,
        label=payload.label,
        monthly_amount=payload.monthly_amount,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.get("/", response_model=List[ExpenseResponse])
def list_expenses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all monthly expense items for the authenticated user."""
    return (
        db.query(Expense)
        .filter(Expense.user_id == current_user.id)
        .order_by(Expense.category, Expense.label)
        .all()
    )


@router.get("/summary", response_model=ExpenseSummaryResponse)
def expense_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get aggregated monthly expense breakdown by category."""
    expenses = (
        db.query(Expense)
        .filter(Expense.user_id == current_user.id, Expense.is_active == 1)
        .all()
    )

    total = sum(e.monthly_amount for e in expenses)
    breakdown: dict = {}
    for e in expenses:
        cat = e.category.value
        breakdown[cat] = breakdown.get(cat, 0) + e.monthly_amount

    return ExpenseSummaryResponse(
        total_monthly_expenses=round(total, 2),
        category_breakdown=breakdown,
        active_items=len(expenses),
    )


@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: int,
    payload: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing expense item."""
    expense = db.query(Expense).filter(
        Expense.id == expense_id, Expense.user_id == current_user.id
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found.")

    if payload.category is not None:
        expense.category = payload.category
    if payload.label is not None:
        expense.label = payload.label
    if payload.monthly_amount is not None:
        expense.monthly_amount = payload.monthly_amount
    if payload.is_active is not None:
        expense.is_active = payload.is_active

    db.commit()
    db.refresh(expense)
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an expense by ID (must belong to the current user)."""
    expense = db.query(Expense).filter(
        Expense.id == expense_id, Expense.user_id == current_user.id
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found.")
    db.delete(expense)
    db.commit()
