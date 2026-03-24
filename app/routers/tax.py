"""Tax Router — CRUD + tax liability estimation."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.tax import TaxRecord, TaxRegime, DeductionSection
from app.models.user import User
from app.schemas.tax import TaxRecordCreate, TaxRecordUpdate, TaxRecordResponse, TaxSummaryResponse
from app.utils.dependencies import get_current_user

router = APIRouter()


def _calc_tax_new_regime(taxable: float) -> float:
    """New tax regime slabs (FY 2024-25)."""
    slabs = [(300000, 0), (300000, 0.05), (300000, 0.10), (300000, 0.15), (300000, 0.20), (float("inf"), 0.30)]
    tax = 0.0
    for slab, rate in slabs:
        if taxable <= 0:
            break
        chunk = min(taxable, slab)
        tax += chunk * rate
        taxable -= chunk
    return round(tax * 1.04, 2)  # +4% cess


def _calc_tax_old_regime(taxable: float) -> float:
    """Old tax regime slabs."""
    slabs = [(250000, 0), (250000, 0.05), (500000, 0.20), (float("inf"), 0.30)]
    tax = 0.0
    for slab, rate in slabs:
        if taxable <= 0:
            break
        chunk = min(taxable, slab)
        tax += chunk * rate
        taxable -= chunk
    return round(tax * 1.04, 2)


@router.post("/", response_model=TaxRecordResponse, status_code=status.HTTP_201_CREATED)
def add_record(payload: TaxRecordCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    record = TaxRecord(user_id=current_user.id, **payload.model_dump())
    db.add(record); db.commit(); db.refresh(record)
    return record


@router.get("/summary", response_model=TaxSummaryResponse)
def tax_summary(financial_year: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    records = db.query(TaxRecord).filter(
        TaxRecord.user_id == current_user.id, TaxRecord.financial_year == financial_year
    ).all()

    if not records:
        return TaxSummaryResponse(
            financial_year=financial_year, regime="new", gross_income=0,
            total_deductions=0, taxable_income=0, estimated_tax=0, tax_paid=0,
            tax_remaining=0, deductions_by_section={},
        )

    gross = records[0].gross_income
    regime = records[0].regime.value
    total_paid = sum(r.tax_paid or 0 for r in records)

    # Cap deductions per section limits
    section_limits = {
        "80c": 150000, "80d": 100000, "nps_80ccd": 50000,
        "home_loan": 200000, "80e": float("inf"), "80g": float("inf"),
        "80tta": 10000, "hra": float("inf"), "other": float("inf"),
    }
    deductions_by_section: dict = {}
    for r in records:
        sec = r.deduction_section.value
        deductions_by_section[sec] = deductions_by_section.get(sec, 0) + r.deduction_amount

    # Apply caps
    total_deductions = 0.0
    if regime == "old":
        for sec, amt in deductions_by_section.items():
            capped = min(amt, section_limits.get(sec, float("inf")))
            total_deductions += capped
            deductions_by_section[sec] = round(capped, 2)
    # New regime: no deductions (except standard deduction 75k)
    else:
        total_deductions = 75000  # standard deduction FY 2024-25

    taxable = max(gross - total_deductions, 0)
    estimated_tax = _calc_tax_new_regime(taxable) if regime == "new" else _calc_tax_old_regime(taxable)

    return TaxSummaryResponse(
        financial_year=financial_year, regime=regime, gross_income=round(gross, 2),
        total_deductions=round(total_deductions, 2), taxable_income=round(taxable, 2),
        estimated_tax=estimated_tax, tax_paid=round(total_paid, 2),
        tax_remaining=round(max(estimated_tax - total_paid, 0), 2),
        deductions_by_section=deductions_by_section,
    )


@router.get("/", response_model=List[TaxRecordResponse])
def list_records(financial_year: str = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(TaxRecord).filter(TaxRecord.user_id == current_user.id)
    if financial_year:
        q = q.filter(TaxRecord.financial_year == financial_year)
    return q.order_by(TaxRecord.financial_year.desc()).all()


@router.put("/{record_id}", response_model=TaxRecordResponse)
def update_record(record_id: int, payload: TaxRecordUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    record = db.query(TaxRecord).filter(TaxRecord.id == record_id, TaxRecord.user_id == current_user.id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Tax record not found.")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    db.commit(); db.refresh(record)
    return record


@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(record_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    record = db.query(TaxRecord).filter(TaxRecord.id == record_id, TaxRecord.user_id == current_user.id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Tax record not found.")
    db.delete(record); db.commit()
