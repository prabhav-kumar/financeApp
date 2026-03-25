"""
auth.py — Authentication Router

Endpoints:
  POST /auth/signup          — register with email/password
  POST /auth/login           — login with email/password → JWT
  GET  /auth/me              — get current user profile (protected)
  GET  /auth/google          — redirect to Google OAuth consent screen
  GET  /auth/google/callback — exchange Google code → JWT
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from httpx import AsyncClient

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse
from app.services.auth_service import hash_password, verify_password, create_access_token
from app.utils.dependencies import get_current_user
from app.config import get_settings

router = APIRouter()
settings = get_settings()

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


# ── Email / Password ─────────────────────────────────────

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    new_user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": new_user.email})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(new_user))


@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(data={"sub": user.email})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.get("/me", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)


# ── Google OAuth ─────────────────────────────────────────

@router.get("/google")
def google_login():
    """Redirect the user to Google's OAuth consent screen."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured.")

    params = (
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
        f"&access_type=offline"
        f"&prompt=select_account"
    )
    return RedirectResponse(url=GOOGLE_AUTH_URL + params)


@router.get("/google/callback", response_model=TokenResponse)
async def google_callback(code: str, db: Session = Depends(get_db)):
    """
    Exchange the Google authorization code for user info,
    then create or log in the user and return a JWT.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google OAuth is not configured.")

    async with AsyncClient() as client:
        # Exchange code for tokens
        token_res = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        })
        if token_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange Google code.")

        access_token = token_res.json().get("access_token")

        # Fetch user info from Google
        userinfo_res = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if userinfo_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch Google user info.")

        info = userinfo_res.json()

    google_id = info.get("sub")
    email = info.get("email")
    full_name = info.get("name") or email.split("@")[0]
    avatar_url = info.get("picture")

    if not email or not google_id:
        raise HTTPException(status_code=400, detail="Google did not return email or user ID.")

    # Find existing user by oauth_id or email
    user = db.query(User).filter(User.oauth_id == google_id).first()
    if not user:
        user = db.query(User).filter(User.email == email).first()

    if user:
        # Update OAuth fields if signing in via Google for the first time
        if not user.oauth_provider:
            user.oauth_provider = "google"
            user.oauth_id = google_id
        if avatar_url:
            user.avatar_url = avatar_url
        db.commit()
        db.refresh(user)
    else:
        # Create new user from Google profile
        user = User(
            email=email,
            full_name=full_name,
            hashed_password=None,
            oauth_provider="google",
            oauth_id=google_id,
            avatar_url=avatar_url,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    jwt_token = create_access_token(data={"sub": user.email})
    return TokenResponse(access_token=jwt_token, user=UserResponse.model_validate(user))
