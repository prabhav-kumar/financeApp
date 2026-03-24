"""
main.py — FastAPI Application Entry Point

Sets up the app, CORS middleware, and registers all routers.
Run with: uvicorn app.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import engine, Base

# ── Import all models so Base.metadata knows about them ──
from app.models import user, income, expense, investment, loan  # noqa: F401
from app.models import budget, emergency_fund, insurance, goal, retirement, tax  # noqa: F401

# ── Import routers ───────────────────────────────────────
from app.routers import (
    auth,
    income as income_router,
    expense as expense_router,
    investment as investment_router,
    loan as loan_router,
    portfolio,
    metrics,
    simulation,
    ai_chat,
    budget as budget_router,
    emergency_fund as emergency_fund_router,
    insurance as insurance_router,
    goal as goal_router,
    retirement as retirement_router,
    tax as tax_router,
)

settings = get_settings()

# ── Create FastAPI App ───────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "AI-Powered Personal Finance Intelligence System. "
        "Track portfolios, analyse financial health, and run simulations."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS Middleware ──────────────────────────────────────
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Create Tables (dev convenience — use Alembic in prod) ─
@app.on_event("startup")
def on_startup():
    """Create all tables that don't yet exist."""
    Base.metadata.create_all(bind=engine)


# ── Register Routers ────────────────────────────────────
app.include_router(auth.router,                  prefix="/auth",           tags=["Authentication"])
app.include_router(income_router.router,         prefix="/income",         tags=["Income"])
app.include_router(expense_router.router,        prefix="/expense",        tags=["Expenses"])
app.include_router(investment_router.router,     prefix="/investment",     tags=["Investments"])
app.include_router(loan_router.router,           prefix="/loan",           tags=["Loans"])
app.include_router(portfolio.router,             prefix="/portfolio",      tags=["Portfolio"])
app.include_router(metrics.router,               prefix="/metrics",        tags=["Financial Metrics"])
app.include_router(simulation.router,            prefix="/simulation",     tags=["Simulation Engine"])
app.include_router(ai_chat.router,               prefix="/ai",             tags=["AI Advisor"])
app.include_router(budget_router.router,         prefix="/budget",         tags=["Budgeting"])
app.include_router(emergency_fund_router.router, prefix="/emergency-fund", tags=["Emergency Fund"])
app.include_router(insurance_router.router,      prefix="/insurance",      tags=["Insurance"])
app.include_router(goal_router.router,           prefix="/goals",          tags=["Financial Goals"])
app.include_router(retirement_router.router,     prefix="/retirement",     tags=["Retirement"])
app.include_router(tax_router.router,            prefix="/tax",            tags=["Tax"])


# ── Health Check ─────────────────────────────────────────
@app.get("/", tags=["Health"])
def health_check():
    """Root endpoint — confirms the API is running."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
    }
