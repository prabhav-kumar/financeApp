"""
database.py — Database Engine & Session Factory

Creates the SQLAlchemy async-compatible engine and provides a
dependency-injectable session generator for FastAPI routes.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import get_settings

settings = get_settings()

# ── Engine ───────────────────────────────────────────────
# pool_pre_ping keeps connections alive across idle periods
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=settings.DEBUG,  # SQL logging in debug mode
)

# ── Session Factory ──────────────────────────────────────
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# ── Declarative Base ─────────────────────────────────────
# All ORM models inherit from this
Base = declarative_base()


def get_db():
    """
    FastAPI dependency that yields a database session.
    Automatically closes the session when the request finishes.
    
    Usage in routes:
        db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
