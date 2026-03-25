"""
User Schemas — request/response models for authentication & profile.
"""

from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


# ── Request Schemas ──────────────────────────────────────

class UserCreate(BaseModel):
    """Registration payload."""
    email: EmailStr
    full_name: str
    password: str  # plain text — hashed before storage


class UserLogin(BaseModel):
    """Login payload."""
    email: EmailStr
    password: str


# ── Response Schemas ─────────────────────────────────────

class UserResponse(BaseModel):
    """Public user profile (never exposes password)."""
    id: int
    email: str
    full_name: str
    is_active: bool
    oauth_provider: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    """JWT token returned after login/signup."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
