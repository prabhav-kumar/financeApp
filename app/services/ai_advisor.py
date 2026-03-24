"""
ai_advisor.py — Virtual CFO / AI Financial Advisor (GAN Architecture)

DUAL-LLM GAN ARCHITECTURE:
  Generator LLM  — produces personalised financial advice
  Discriminator LLM — verifies the response for accuracy,
                      hallucinations, and financial soundness

Flow:
  1. Build user's complete financial context
  2. Generator produces an answer
  3. Discriminator scores it (0-100) and flags issues
  4. If score < threshold → Generator retries with discriminator feedback
  5. After max retries → Discriminator refines the best attempt
  6. Return verified response with confidence metadata

Both LLMs use the same OPENAI_API_KEY via OpenRouter.
"""

import logging
from typing import Optional
from sqlalchemy.orm import Session
from openai import OpenAI

from app.config import get_settings
from app.services.metrics_engine import (
    calculate_savings_rate,
    calculate_debt_to_income,
    calculate_diversification,
    calculate_risk_level,
)
from app.services.portfolio_engine import (
    calculate_portfolio_summary,
    calculate_asset_allocation,
)
from app.models.investment import Investment
from app.models.loan import Loan
from app.models.income import Income
from app.models.expense import Expense

logger = logging.getLogger(__name__)
settings = get_settings()

# ── GAN Config ───────────────────────────────────────────
MAX_RETRIES = 3               # max generator retries on rejection
DISCRIMINATOR_THRESHOLD = 80  # min score (0-100) to accept response


# ─────────────────────────────────────────────────────────
# SHARED OPENAI CLIENT
# ─────────────────────────────────────────────────────────

def _get_client() -> OpenAI:
    return OpenAI(
        api_key=settings.OPENAI_API_KEY,
        base_url="https://openrouter.ai/api/v1",
    )


# ─────────────────────────────────────────────────────────
# BUILD FINANCIAL CONTEXT
# ─────────────────────────────────────────────────────────

def _build_financial_context(db: Session, user_id: int) -> str:
    """Build complete financial context from user's data."""
    try:
        savings = calculate_savings_rate(db, user_id)
        dti = calculate_debt_to_income(db, user_id)
        diversification = calculate_diversification(db, user_id)
        risk = calculate_risk_level(db, user_id)
        portfolio = calculate_portfolio_summary(db, user_id)
        allocation = calculate_asset_allocation(db, user_id)

        investments = db.query(Investment).filter(Investment.user_id == user_id).all()
        loans = db.query(Loan).filter(Loan.user_id == user_id, Loan.is_active == 1).all()
        incomes = db.query(Income).filter(Income.user_id == user_id, Income.is_active == 1).all()
        expenses = db.query(Expense).filter(Expense.user_id == user_id, Expense.is_active == 1).all()

        context = f"""USER'S COMPLETE FINANCIAL PROFILE:

═══════════════════════════════════════════════════════════
INCOME & EXPENSES
═══════════════════════════════════════════════════════════

Monthly Income: ₹{savings.total_monthly_income:,.0f}
Monthly Expenses: ₹{savings.total_monthly_expenses:,.0f}
Monthly Savings: ₹{savings.monthly_savings:,.0f}
Savings Rate: {savings.savings_rate_pct:.1f}%
Rating: {savings.rating.title()}

Income Sources:"""

        for inc in incomes:
            freq_multiplier = {"monthly": 1, "quarterly": 1/3, "yearly": 1/12, "one_time": 0}
            monthly_amt = inc.amount * freq_multiplier.get(inc.frequency.value, 1)
            context += f"\n  • {inc.source_name}: ₹{monthly_amt:,.0f}/month ({inc.frequency.value})"

        context += "\n\nExpense Categories:"
        for exp in expenses:
            context += f"\n  • {exp.category.value.replace('_', ' ').title()}: ₹{exp.monthly_amount:,.0f}/month"

        context += f"""

═══════════════════════════════════════════════════════════
DEBT & LOANS
═══════════════════════════════════════════════════════════

Total Monthly EMI: ₹{dti.total_monthly_emi:,.0f}
Debt-to-Income Ratio: {dti.dti_ratio_pct:.1f}%
Risk Rating: {dti.rating.replace('_', ' ').title()}

Active Loans:"""

        if loans:
            for loan in loans:
                context += f"\n  • {loan.loan_name}: ₹{loan.outstanding_balance:,.0f} outstanding @ {loan.interest_rate}% (EMI: ₹{loan.emi_amount:,.0f})"
        else:
            context += "\n  • No active loans"

        context += f"""

═══════════════════════════════════════════════════════════
INVESTMENT PORTFOLIO
═══════════════════════════════════════════════════════════

Total Invested: ₹{portfolio.total_invested:,.0f}
Current Value: ₹{portfolio.total_current_value:,.0f}
Profit/Loss: ₹{portfolio.total_profit_loss:,.0f} ({portfolio.total_profit_loss_pct:+.2f}%)
Total Holdings: {portfolio.holdings_count}

Asset Allocation:"""

        for alloc in allocation.allocations:
            context += f"\n  • {alloc.asset_type.replace('_', ' ').title()}: ₹{alloc.current_value:,.0f} ({alloc.allocation_pct:.1f}%)"

        context += "\n\nDetailed Holdings:"
        for holding in portfolio.holdings:
            context += f"\n  • {holding.name} ({holding.investment_type}): {holding.quantity} units @ ₹{holding.current_price:,.2f}"
            context += f"\n    Invested: ₹{holding.invested_value:,.0f} | Current: ₹{holding.current_value:,.0f} | P/L: {holding.profit_loss_pct:+.1f}%"

        context += f"""

═══════════════════════════════════════════════════════════
RISK PROFILE
═══════════════════════════════════════════════════════════

Risk Level: {risk.risk_level.replace('_', ' ').title()}
Risk Score: {risk.risk_score:.0f}/100
Equity Allocation: {risk.equity_pct:.1f}%
Debt Allocation: {risk.debt_pct:.1f}%

═══════════════════════════════════════════════════════════
DIVERSIFICATION
═══════════════════════════════════════════════════════════

Diversification Score: {diversification.diversification_score:.0f}/100
Asset Types: {diversification.unique_asset_types}
Largest Allocation: {diversification.largest_allocation_pct:.1f}%
Rating: {diversification.rating.replace('_', ' ').title()}

═══════════════════════════════════════════════════════════
"""
        return context

    except Exception as e:
        logger.error(f"Error building financial context: {e}")
        return "Error: Unable to fetch complete financial data."


# ─────────────────────────────────────────────────────────
# GENERATOR SYSTEM PROMPT
# ─────────────────────────────────────────────────────────

GENERATOR_SYSTEM_PROMPT = """You are a Virtual CFO — a sharp, data-driven personal financial advisor for Indian users.

CRITICAL RULES:
1. You MUST use the exact numbers from the user's financial data — income, expenses, savings rate, portfolio value, loan EMIs, etc.
2. NEVER invent or assume any figures. If a number isn't in the data, say so.
3. Every insight must follow this format:
   - State the problem with the actual number (e.g. "Your EMI is ₹18,000/month — 42% of income")
   - State the impact (e.g. "This leaves only ₹8,000 for savings — below the 20% recommended minimum")
   - Give a specific action (e.g. "Prepay ₹50,000 on your home loan to reduce EMI by ~₹800/month")

RESPONSE FORMAT — always structure your response like this:

## Summary
One sentence direct answer to the question.

## Key Insights
For each insight (2-4 max):
**[Problem title]**
Problem: [specific issue with actual ₹ or % from user data]
Impact: [what this means financially]
Action: [specific step with numbers]

## Metrics Snapshot
List 3-5 key numbers relevant to the question:
- Savings Rate: X%
- Debt-to-Income: X%
- Portfolio Value: ₹X
(only include what's relevant)

## Recommendation
One clear, specific action the user should take next, with amounts and timeframe.

## Why This Works
2-3 bullet points explaining the financial reasoning behind the recommendation.

TONE: Direct, specific, human. No generic advice. Every sentence must reference the user's actual data."""


# ─────────────────────────────────────────────────────────
# DISCRIMINATOR SYSTEM PROMPT
# ─────────────────────────────────────────────────────────

DISCRIMINATOR_SYSTEM_PROMPT = """You are a strict financial fact-checker and quality verifier for an AI financial advisor system.

Your job is to evaluate a generated financial advice response against the user's actual financial data.

Check for:
1. FACTUAL ACCURACY — Does the advice correctly reference the user's actual numbers (income, savings rate, portfolio value, loans)?
2. HALLUCINATIONS — Does it invent figures, assets, or facts not present in the user's data?
3. FINANCIAL SOUNDNESS — Is the advice logically sound and appropriate for the user's financial situation?
4. HARMFUL ADVICE — Does it make dangerous guarantees, recommend illegal activity, or give reckless suggestions?
5. RELEVANCE — Does it actually answer the user's question?

Respond ONLY in this exact JSON format:
{
  "score": <integer 0-100>,
  "verdict": "<PASS|FAIL>",
  "issues": ["<issue1>", "<issue2>"],
  "feedback": "<one sentence of specific feedback for the generator to improve>"
}

Scoring guide:
- 80-100: Excellent, accurate, helpful
- 60-79: Acceptable with minor issues
- 40-59: Significant issues, needs revision
- 0-39: Reject, major hallucinations or harmful content

verdict = PASS if score >= 60, else FAIL"""


# ─────────────────────────────────────────────────────────
# GENERATOR LLM
# ─────────────────────────────────────────────────────────

def _generator(
    financial_context: str,
    user_message: str,
    conversation_history: list[dict],
    feedback_history: Optional[list[str]] = None,
) -> str:
    """
    Generator LLM — produces financial advice.
    feedback_history contains all discriminator rejections so far,
    so the generator learns from every past attempt in this session.
    """
    client = _get_client()

    messages = [
        {"role": "system", "content": GENERATOR_SYSTEM_PROMPT},
        {"role": "system", "content": f"USER'S FINANCIAL DATA:\n\n{financial_context}"},
    ]

    if feedback_history:
        accumulated = "\n".join(
            f"Attempt {i+1} rejection: {fb}" for i, fb in enumerate(feedback_history)
        )
        messages.append({
            "role": "system",
            "content": (
                f"LEARNING FROM PREVIOUS REJECTIONS ({len(feedback_history)} so far):\n"
                f"{accumulated}\n\n"
                f"Address ALL of the above issues in your new response."
            ),
        })

    messages.extend(conversation_history)
    messages.append({"role": "user", "content": user_message})

    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=messages,
        temperature=max(0.3, 0.7 - len(feedback_history or []) * 0.1),  # lower temp each retry
        max_tokens=2048,
    )
    return response.choices[0].message.content or ""


# ─────────────────────────────────────────────────────────
# DISCRIMINATOR LLM
# ─────────────────────────────────────────────────────────

def _discriminator(
    financial_context: str,
    user_message: str,
    generated_response: str,
) -> dict:
    """
    Discriminator LLM — verifies the generated response.
    Returns a dict with score, verdict, issues, and feedback.
    """
    import json

    client = _get_client()

    messages = [
        {"role": "system", "content": DISCRIMINATOR_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"USER'S FINANCIAL DATA:\n{financial_context}\n\n"
                f"USER'S QUESTION: {user_message}\n\n"
                f"GENERATED RESPONSE TO EVALUATE:\n{generated_response}"
            ),
        },
    ]

    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=messages,
        temperature=0.1,   # low temp for consistent evaluation
        max_tokens=512,
    )

    raw = response.choices[0].message.content or "{}"

    # Strip markdown code fences if present
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        result = json.loads(raw)
        return {
            "score": int(result.get("score", 50)),
            "verdict": result.get("verdict", "FAIL"),
            "issues": result.get("issues", []),
            "feedback": result.get("feedback", ""),
        }
    except (json.JSONDecodeError, ValueError):
        logger.warning(f"Discriminator returned non-JSON: {raw}")
        return {"score": 70, "verdict": "PASS", "issues": [], "feedback": ""}


# ─────────────────────────────────────────────────────────
# DISCRIMINATOR REFINEMENT
# ─────────────────────────────────────────────────────────

def _discriminator_refine(
    financial_context: str,
    user_message: str,
    best_response: str,
    issues: list[str],
) -> str:
    """
    When generator exhausts retries, discriminator directly refines
    the best attempt by fixing the identified issues.
    """
    client = _get_client()

    issues_text = "\n".join(f"- {i}" for i in issues) if issues else "- General quality improvement needed"

    messages = [
        {
            "role": "system",
            "content": (
                "You are a financial advice editor. You will be given a draft financial advice response "
                "and a list of issues. Fix ONLY the identified issues while preserving the helpful content. "
                "Return the corrected response directly without any preamble."
            ),
        },
        {
            "role": "user",
            "content": (
                f"USER'S FINANCIAL DATA:\n{financial_context}\n\n"
                f"USER'S QUESTION: {user_message}\n\n"
                f"DRAFT RESPONSE:\n{best_response}\n\n"
                f"ISSUES TO FIX:\n{issues_text}\n\n"
                "Return the corrected response:"
            ),
        },
    ]

    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=messages,
        temperature=0.3,
        max_tokens=2048,
    )
    return response.choices[0].message.content or best_response


# ─────────────────────────────────────────────────────────
# RESPONSE CLEANER
# ─────────────────────────────────────────────────────────

def _clean_response(verified_response: str, financial_context: str, user_message: str) -> str:
    """
    Final pass: ensures the response is clean, well-structured markdown
    and actually references the user's real data.
    Strips any accidental JSON, code fences, or raw data dumps.
    """
    client = _get_client()

    messages = [
        {
            "role": "system",
            "content": (
                "You are a financial response formatter. Your job is to take a financial advice response "
                "and return it as clean, readable markdown — nothing else.\n\n"
                "Rules:\n"
                "- Keep ALL the financial insights, numbers, and recommendations intact\n"
                "- Remove any JSON, code blocks, or raw data\n"
                "- Ensure the response uses these sections if present: ## Summary, ## Key Insights, ## Metrics Snapshot, ## Recommendation, ## Why This Works\n"
                "- Bold important numbers and terms using **text**\n"
                "- Use bullet points (•) for lists\n"
                "- Keep it concise — no padding, no repetition\n"
                "- Return ONLY the formatted response, nothing else"
            ),
        },
        {
            "role": "user",
            "content": f"Format this financial advice response:\n\n{verified_response}",
        },
    ]

    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=messages,
        temperature=0.1,
        max_tokens=1500,
    )
    cleaned = response.choices[0].message.content or verified_response
    # Safety: if it still looks like JSON, return the original
    stripped = cleaned.strip()
    if stripped.startswith("{") or stripped.startswith("["):
        return verified_response
    return cleaned


# ─────────────────────────────────────────────────────────
# GAN ORCHESTRATOR
# ─────────────────────────────────────────────────────────

def _gan_chat(
    financial_context: str,
    user_message: str,
    conversation_history: list[dict],
) -> dict:
    """
    GAN-style adversarial loop:
      1. Generator produces response
      2. Discriminator evaluates it (score 0-100)
      3. If score < 80 → Generator retries with ALL accumulated feedback
      4. Temperature drops each retry (more focused/conservative)
      5. If still failing after MAX_RETRIES → Discriminator refines best attempt
      6. Return final response with verification metadata
    """
    best_response = ""
    best_score = 0
    best_issues: list[str] = []
    feedback_history: list[str] = []   # accumulates all rejection feedback
    attempts = 0

    for attempt in range(MAX_RETRIES + 1):
        attempts = attempt + 1
        logger.info(f"GAN attempt {attempts}/{MAX_RETRIES + 1} | feedbacks so far: {len(feedback_history)}")

        # Generator produces response, learning from all past rejections
        generated = _generator(financial_context, user_message, conversation_history, feedback_history)

        # Discriminator evaluates
        evaluation = _discriminator(financial_context, user_message, generated)
        score = evaluation["score"]
        verdict = evaluation["verdict"]
        feedback = evaluation.get("feedback", "")
        issues = evaluation.get("issues", [])

        logger.info(f"Discriminator verdict: {verdict} (score={score}/100)")

        # Track best response across all attempts
        if score > best_score:
            best_score = score
            best_response = generated
            best_issues = issues

        # Accept if passes threshold (80)
        if score >= DISCRIMINATOR_THRESHOLD:
            cleaned = _clean_response(generated, financial_context, user_message)
            return {
                "response": cleaned,
                "verified": True,
                "confidence_score": score,
                "attempts": attempts,
                "verification_note": f"Verified by discriminator (score: {score}/100, attempts: {attempts})",
            }

        # Accumulate feedback for next generator attempt
        if feedback:
            feedback_history.append(feedback)

    # All retries exhausted — discriminator refines the best attempt
    logger.info(f"Generator exhausted {attempts} attempts (best score={best_score}). Discriminator refining...")
    refined = _discriminator_refine(financial_context, user_message, best_response, best_issues)
    cleaned = _clean_response(refined, financial_context, user_message)

    return {
        "response": cleaned,
        "verified": True,
        "confidence_score": best_score,
        "attempts": attempts,
        "verification_note": f"Discriminator-refined after {attempts} generation attempts (best score: {best_score}/100)",
    }


# ─────────────────────────────────────────────────────────
# MAIN CHAT FUNCTION
# ─────────────────────────────────────────────────────────

def chat_with_advisor(
    db: Session,
    user_id: int,
    user_message: str,
    conversation_history: Optional[list[dict]] = None,
) -> dict:
    """
    Entry point for the Virtual CFO chat.

    Uses GAN architecture:
      - Generator LLM produces the advice
      - Discriminator LLM verifies and optionally refines it
    Both use the same OPENAI_API_KEY.
    """
    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "sk-or-v1-your-openrouter-key-here":
        return {
            "response": (
                "🔑 **OpenAI API key not configured.**\n\n"
                "Add your key to `.env`:\n"
                "```\nOPENAI_API_KEY=your_key_here\n```\n"
                "Then restart the server."
            ),
            "provider": "none",
            "model": "none",
            "context_summary": "API key required",
            "verified": False,
            "confidence_score": 0,
            "attempts": 0,
            "verification_note": "API key not configured",
        }

    try:
        # Build financial context
        logger.info(f"Building financial context for user {user_id}")
        financial_context = _build_financial_context(db, user_id)

        # Format conversation history
        history = []
        if conversation_history:
            for msg in conversation_history:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role in ("user", "assistant") and content.strip():
                    history.append({"role": role, "content": content})

        # Run GAN loop
        result = _gan_chat(financial_context, user_message, history)

        return {
            "response": result["response"],
            "provider": "openai",
            "model": settings.OPENAI_MODEL,
            "context_summary": "Complete financial data analyzed and verified by dual-LLM system",
            "verified": result["verified"],
            "confidence_score": result["confidence_score"],
            "attempts": result["attempts"],
            "verification_note": result["verification_note"],
        }

    except Exception as e:
        logger.error(f"GAN chat error for user {user_id}: {e}")
        error_str = str(e).lower()

        if "api key" in error_str or "unauthorized" in error_str or "401" in error_str:
            msg = (
                "🔑 **Invalid API Key**\n\n"
                "Check your `OPENAI_API_KEY` in `.env` and restart the server."
            )
        elif "rate limit" in error_str or "429" in error_str:
            msg = "🚫 **Rate limit reached.** Please wait a moment and try again."
        else:
            msg = f"⚠️ AI service error: {str(e)}\n\nPlease try again in a moment."

        return {
            "response": msg,
            "provider": "openai",
            "model": settings.OPENAI_MODEL,
            "context_summary": "Error occurred",
            "verified": False,
            "confidence_score": 0,
            "attempts": 0,
            "verification_note": "Error during processing",
        }


# ─────────────────────────────────────────────────────────
# LEGACY STUB
# ─────────────────────────────────────────────────────────

def generate_advice(report) -> dict:
    """Legacy stub for the /metrics/ai-advice endpoint."""
    return {
        "status": "upgraded",
        "message": "Use the /ai/chat endpoint for AI-powered financial advice.",
        "redirect": "/ai/chat",
    }
