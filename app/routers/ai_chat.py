"""
ai_chat.py — AI Chat Router with persistent session history (GPT-style)

Endpoints:
  GET    /ai/sessions              — list all sessions for current user
  POST   /ai/sessions              — create a new session
  GET    /ai/sessions/{id}         — get session with full message history
  DELETE /ai/sessions/{id}         — delete a session
  PATCH  /ai/sessions/{id}/title   — rename a session
  POST   /ai/sessions/{id}/chat    — send a message in a session
"""

from pydantic import BaseModel
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.models.user import User
from app.models.chat_session import ChatSession, ChatMessage
from app.services.ai_advisor import chat_with_advisor
from app.utils.dependencies import get_current_user

router = APIRouter()

WELCOME = (
    "Hello! I'm your **Virtual CFO** — an AI financial advisor grounded in your real data.\n\n"
    "Ask me anything about your finances."
)


# ── Schemas ───────────────────────────────────────────────

class SessionOut(BaseModel):
    id: int
    title: str
    created_at: str
    updated_at: str
    message_count: int

    class Config:
        from_attributes = True


class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: str

    class Config:
        from_attributes = True


class SessionDetail(BaseModel):
    id: int
    title: str
    created_at: str
    updated_at: str
    messages: list[MessageOut]

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    message: MessageOut
    session_title: str = ""
    verified: bool = False
    confidence_score: int = 0
    attempts: int = 1
    verification_note: str = ""


class TitleUpdate(BaseModel):
    title: str


# ── Helpers ───────────────────────────────────────────────

def _fmt(dt) -> str:
    return dt.isoformat() if dt else ""


def _get_session_or_404(session_id: int, user_id: int, db: DBSession) -> ChatSession:
    s = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == user_id,
    ).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return s


# ── Endpoints ─────────────────────────────────────────────

@router.get("/sessions", response_model=list[SessionOut])
def list_sessions(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all chat sessions for the current user, newest first."""
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )
    return [
        SessionOut(
            id=s.id,
            title=s.title,
            created_at=_fmt(s.created_at),
            updated_at=_fmt(s.updated_at),
            message_count=len(s.messages),
        )
        for s in sessions
    ]


@router.post("/sessions", response_model=SessionDetail, status_code=status.HTTP_201_CREATED)
def create_session(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new chat session with a welcome message."""
    session = ChatSession(user_id=current_user.id, title="New Chat")
    db.add(session)
    db.flush()

    welcome = ChatMessage(session_id=session.id, role="assistant", content=WELCOME)
    db.add(welcome)
    db.commit()
    db.refresh(session)

    return SessionDetail(
        id=session.id,
        title=session.title,
        created_at=_fmt(session.created_at),
        updated_at=_fmt(session.updated_at),
        messages=[MessageOut(id=welcome.id, role=welcome.role, content=welcome.content, created_at=_fmt(welcome.created_at))],
    )


@router.get("/sessions/{session_id}", response_model=SessionDetail)
def get_session(
    session_id: int,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a session with its full message history."""
    s = _get_session_or_404(session_id, current_user.id, db)
    return SessionDetail(
        id=s.id,
        title=s.title,
        created_at=_fmt(s.created_at),
        updated_at=_fmt(s.updated_at),
        messages=[
            MessageOut(id=m.id, role=m.role, content=m.content, created_at=_fmt(m.created_at))
            for m in s.messages
        ],
    )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: int,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a session and all its messages."""
    s = _get_session_or_404(session_id, current_user.id, db)
    db.delete(s)
    db.commit()


@router.patch("/sessions/{session_id}/title", response_model=SessionOut)
def rename_session(
    session_id: int,
    payload: TitleUpdate,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Rename a session."""
    s = _get_session_or_404(session_id, current_user.id, db)
    s.title = payload.title[:100]
    db.commit()
    db.refresh(s)
    return SessionOut(
        id=s.id, title=s.title,
        created_at=_fmt(s.created_at), updated_at=_fmt(s.updated_at),
        message_count=len(s.messages),
    )


@router.post("/sessions/{session_id}/chat", response_model=ChatResponse)
def chat_in_session(
    session_id: int,
    payload: ChatRequest,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send a message in a session.
    Persists both the user message and AI response.
    Auto-titles the session from the first user message.
    """
    s = _get_session_or_404(session_id, current_user.id, db)

    # Save user message
    user_msg = ChatMessage(session_id=s.id, role="user", content=payload.message)
    db.add(user_msg)
    db.flush()

    # Auto-title from first real user message — pick meaningful words, save to DB
    existing_user_msgs = db.query(ChatMessage).filter(
        ChatMessage.session_id == s.id,
        ChatMessage.role == "user",
    ).count()
    if existing_user_msgs == 1 and s.title == "New Chat":
        words = [w for w in payload.message.strip().split() if len(w) > 2]
        s.title = " ".join(words[:5]) + ("..." if len(words) > 5 else "")

    # Build history for AI (exclude welcome, last 20 messages)
    history = [
        {"role": m.role, "content": m.content}
        for m in s.messages
        if m.role in ("user", "assistant") and m.content != WELCOME
    ][-20:]

    # Call AI
    result = chat_with_advisor(
        db=db,
        user_id=current_user.id,
        user_message=payload.message,
        conversation_history=history,
    )

    # Save AI response
    ai_msg = ChatMessage(session_id=s.id, role="assistant", content=result["response"])
    db.add(ai_msg)
    db.commit()
    db.refresh(ai_msg)
    db.refresh(s)

    return ChatResponse(
        message=MessageOut(id=ai_msg.id, role=ai_msg.role, content=ai_msg.content, created_at=_fmt(ai_msg.created_at)),
        session_title=s.title,
        verified=result.get("verified", False),
        confidence_score=result.get("confidence_score", 0),
        attempts=result.get("attempts", 1),
        verification_note=result.get("verification_note", ""),
    )
