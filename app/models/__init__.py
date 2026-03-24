"""Models package — import all models here so Alembic & Base.metadata can discover them."""

from app.models.user import User
from app.models.income import Income
from app.models.expense import Expense
from app.models.investment import Investment
from app.models.loan import Loan

__all__ = ["User", "Income", "Expense", "Investment", "Loan"]
