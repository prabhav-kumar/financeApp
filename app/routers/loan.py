"""
loan.py — Loan CRUD Router

Endpoints:
  POST   /loan/       — add a loan
  GET    /loan/       — list all loans
  DELETE /loan/{id}   — remove a loan
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.loan import Loan
from app.models.user import User
from app.schemas.loan import LoanCreate, LoanUpdate, LoanResponse
from app.utils.dependencies import get_current_user

router = APIRouter()


@router.post("/", response_model=LoanResponse, status_code=status.HTTP_201_CREATED)
def add_loan(
    payload: LoanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a new loan for the authenticated user."""
    loan = Loan(
        user_id=current_user.id,
        loan_name=payload.loan_name,
        loan_type=payload.loan_type,
        principal_amount=payload.principal_amount,
        outstanding_balance=payload.outstanding_balance,
        interest_rate=payload.interest_rate,
        tenure_months=payload.tenure_months,
        emi_amount=payload.emi_amount,
        start_date=payload.start_date,
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return loan


@router.get("/", response_model=List[LoanResponse])
def list_loans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all loans for the authenticated user."""
    return db.query(Loan).filter(Loan.user_id == current_user.id).all()


@router.put("/{loan_id}", response_model=LoanResponse)
def update_loan(
    loan_id: int,
    payload: LoanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update an existing loan (partial update).
    Only fields provided in the payload will be updated.
    """
    loan = db.query(Loan).filter(
        Loan.id == loan_id, Loan.user_id == current_user.id
    ).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(loan, field, value)

    db.commit()
    db.refresh(loan)
    return loan


@router.delete("/{loan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_loan(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a loan by ID (must belong to the current user)."""
    loan = db.query(Loan).filter(
        Loan.id == loan_id, Loan.user_id == current_user.id
    ).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found.")
    db.delete(loan)
    db.commit()
