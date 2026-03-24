"""Models package — import all models here so Alembic & Base.metadata can discover them."""

from app.models.user import User
from app.models.income import Income
from app.models.expense import Expense
from app.models.investment import Investment
from app.models.loan import Loan
from app.models.budget import Budget
from app.models.emergency_fund import EmergencyFund
from app.models.insurance import InsurancePolicy
from app.models.goal import FinancialGoal
from app.models.retirement import RetirementPlan
from app.models.tax import TaxRecord

__all__ = [
    "User", "Income", "Expense", "Investment", "Loan",
    "Budget", "EmergencyFund", "InsurancePolicy", "FinancialGoal", "RetirementPlan", "TaxRecord",
]
