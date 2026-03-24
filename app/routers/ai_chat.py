"""
ai_chat.py — AI Chat Router (Virtual CFO)

Endpoints:
  POST /ai/chat  — Send a message to the AI financial advisor
                    Accepts user question + conversation history
                    Returns personalised advice grounded in user data

This is the main AI interface. It:
  1. Gathers all user financial data (context_builder)
  2. Injects it into a carefully engineered system prompt
  3. Sends the user's question to the configured LLM
  4. Returns a grounded, personalised response

Sample queries:
  - "Am I saving enough?"
  - "Where should I invest?"
  - "Can I retire early?"
  - "How to reduce my debt?"
  - "What is my financial health?"
"""

from pydantic import BaseModel
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.services.ai_advisor import chat_with_advisor
from app.utils.dependencies import get_current_user

router = APIRouter()


# ── Request / Response Schemas ───────────────────────────

class ChatMessage(BaseModel):
    """Single message in conversation history."""
    role: str       # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """
    Chat request payload.

    Args:
        message: The user's current question or message
        history: Previous messages for multi-turn context (optional)
                 Send the last 10-20 messages for best results
    """
    message: str
    history: Optional[list[ChatMessage]] = None


class ChatResponse(BaseModel):
    """
    Chat response payload.

    Contains:
        response: The AI advisor's answer (markdown formatted)
        provider: Which LLM provider was used (gemini/openai/none)
        model: Specific model name used
        context_summary: Brief note about what data was analysed
    """
    response: str
    provider: str
    model: Optional[str] = None
    context_summary: str


# ── Endpoint ─────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
def ai_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Chat with the AI Financial Advisor (Virtual CFO).

    Send your question along with optional conversation history.
    The AI will analyse your complete financial data (income, expenses,
    investments, loans, and computed metrics) and respond with
    personalised, data-grounded advice.

    **Example request:**
    ```json
    {
      "message": "Am I saving enough for retirement?",
      "history": [
        {"role": "user", "content": "What is my savings rate?"},
        {"role": "assistant", "content": "Your savings rate is 28%..."}
      ]
    }
    ```

    **Important:**
    - Responses are grounded in your actual financial data
    - The AI won't recommend specific stocks or mutual fund schemes
    - For major decisions, consult a SEBI-registered advisor
    """
    # Convert Pydantic models to dicts for the service layer
    history = [{"role": m.role, "content": m.content}
               for m in (payload.history or [])]

    result = chat_with_advisor(
        db=db,
        user_id=current_user.id,
        user_message=payload.message,
        conversation_history=history,
    )

    return ChatResponse(
        response=result["response"],
        provider=result["provider"],
        model=result.get("model"),
        context_summary=result["context_summary"],
    )
