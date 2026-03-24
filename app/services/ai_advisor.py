"""
ai_advisor.py — Virtual CFO / AI Financial Advisor

SIMPLE ARCHITECTURE:
- Fetch user's complete financial data
- Send to OpenAI (via OpenRouter) with the question
- Get intelligent response

No complex logic, no intent detection, no templates.
Just AI analyzing real financial data.
"""

import logging
from typing import Optional
from sqlalchemy.orm import Session

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
from app.models.budget import Budget
from app.models.emergency_fund import EmergencyFund
from app.models.insurance import InsurancePolicy
from app.models.goal import FinancialGoal
from app.models.retirement import RetirementPlan
from app.models.tax import TaxRecord

logger = logging.getLogger(__name__)
settings = get_settings()


# ─────────────────────────────────────────────────────────
# BUILD FINANCIAL CONTEXT
# ─────────────────────────────────────────────────────────

def _build_financial_context(db: Session, user_id: int) -> str:
    """
    Build complete financial context from user's data.
    This is sent to OpenAI along with the user's question.
    """
    try:
        # Get all metrics
        savings = calculate_savings_rate(db, user_id)
        dti = calculate_debt_to_income(db, user_id)
        diversification = calculate_diversification(db, user_id)
        risk = calculate_risk_level(db, user_id)
        portfolio = calculate_portfolio_summary(db, user_id)
        allocation = calculate_asset_allocation(db, user_id)
        
        # Get detailed data
        investments = db.query(Investment).filter(Investment.user_id == user_id).all()
        loans = db.query(Loan).filter(Loan.user_id == user_id, Loan.is_active == 1).all()
        incomes = db.query(Income).filter(Income.user_id == user_id, Income.is_active == 1).all()
        expenses = db.query(Expense).filter(Expense.user_id == user_id, Expense.is_active == 1).all()
        budgets = db.query(Budget).filter(Budget.user_id == user_id).order_by(Budget.month.desc()).limit(30).all()
        emergency_funds = db.query(EmergencyFund).filter(EmergencyFund.user_id == user_id).all()
        insurance_policies = db.query(InsurancePolicy).filter(InsurancePolicy.user_id == user_id, InsurancePolicy.is_active == 1).all()
        goals = db.query(FinancialGoal).filter(FinancialGoal.user_id == user_id).all()
        retirement_plans = db.query(RetirementPlan).filter(RetirementPlan.user_id == user_id).all()
        tax_records = db.query(TaxRecord).filter(TaxRecord.user_id == user_id).order_by(TaxRecord.financial_year.desc()).limit(20).all()
        
        # Build comprehensive context
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

        # ── Emergency Fund ──────────────────────────────
        context += "\nEMERGENCY FUND\n" + "═" * 55 + "\n"
        if emergency_funds:
            for ef in emergency_funds:
                progress = min(ef.current_amount / ef.target_amount * 100, 100) if ef.target_amount > 0 else 0
                context += f"  • {ef.fund_name}: ₹{ef.current_amount:,.0f} / ₹{ef.target_amount:,.0f} ({progress:.0f}% funded, {ef.months_of_expenses}-month target)\n"
        else:
            context += "  • No emergency fund set up\n"

        # ── Insurance ───────────────────────────────────
        context += "\nINSURANCE COVERAGE\n" + "═" * 55 + "\n"
        if insurance_policies:
            total_coverage = sum(p.coverage_amount for p in insurance_policies)
            total_premium = sum(p.annual_premium for p in insurance_policies)
            context += f"  Total Coverage: ₹{total_coverage:,.0f} | Annual Premium: ₹{total_premium:,.0f}\n"
            for p in insurance_policies:
                context += f"  • {p.policy_name} ({p.insurance_type.value}): ₹{p.coverage_amount:,.0f} cover @ ₹{p.annual_premium:,.0f}/yr\n"
        else:
            context += "  • No insurance policies recorded\n"

        # ── Financial Goals ─────────────────────────────
        context += "\nFINANCIAL GOALS\n" + "═" * 55 + "\n"
        if goals:
            for g in goals:
                progress = min(g.current_amount / g.target_amount * 100, 100) if g.target_amount > 0 else 0
                context += f"  • {g.goal_name} ({g.category.value}): ₹{g.current_amount:,.0f} / ₹{g.target_amount:,.0f} ({progress:.0f}%)"
                if g.target_date:
                    context += f" — target: {g.target_date}"
                context += "\n"
        else:
            context += "  • No financial goals set\n"

        # ── Retirement ──────────────────────────────────
        context += "\nRETIREMENT PLANNING\n" + "═" * 55 + "\n"
        if retirement_plans:
            total_corpus = sum(p.current_value for p in retirement_plans)
            total_monthly = sum(p.monthly_contribution for p in retirement_plans)
            context += f"  Total Current Corpus: ₹{total_corpus:,.0f} | Monthly Contribution: ₹{total_monthly:,.0f}\n"
            for p in retirement_plans:
                years = (p.retirement_age - p.current_age) if p.current_age and p.retirement_age else None
                context += f"  • {p.plan_name} ({p.account_type.value}): ₹{p.current_value:,.0f} corpus"
                if years:
                    context += f", {years} years to retirement @ {p.expected_return_rate}% return"
                if p.desired_monthly_income:
                    context += f", desired ₹{p.desired_monthly_income:,.0f}/month post-retirement"
                context += "\n"
        else:
            context += "  • No retirement plans recorded\n"

        # ── Tax ─────────────────────────────────────────
        context += "\nTAX PLANNING\n" + "═" * 55 + "\n"
        if tax_records:
            fy_groups: dict = {}
            for r in tax_records:
                fy_groups.setdefault(r.financial_year, []).append(r)
            for fy, records in list(fy_groups.items())[:2]:
                total_deductions = sum(r.deduction_amount for r in records)
                total_paid = sum(r.tax_paid or 0 for r in records)
                context += f"  FY {fy} ({records[0].regime.value} regime): Gross ₹{records[0].gross_income:,.0f}, Deductions ₹{total_deductions:,.0f}, Tax Paid ₹{total_paid:,.0f}\n"
        else:
            context += "  • No tax records added\n"

        # ── Budgeting ───────────────────────────────────
        context += "\nBUDGETING\n" + "═" * 55 + "\n"
        if budgets:
            months_seen = list(dict.fromkeys(b.month for b in budgets))[:2]
            for month in months_seen:
                month_items = [b for b in budgets if b.month == month]
                total_b = sum(b.budgeted_amount for b in month_items)
                total_a = sum(b.actual_amount for b in month_items)
                variance = total_b - total_a
                status_str = "under budget" if variance >= 0 else "over budget"
                context += f"  {month}: Budgeted ₹{total_b:,.0f} | Actual ₹{total_a:,.0f} | {status_str} by ₹{abs(variance):,.0f}\n"
        else:
            context += "  • No budget data recorded\n"

        return context
    
    except Exception as e:
        logger.error(f"Error building financial context: {e}")
        return "Error: Unable to fetch complete financial data. Please ensure you have added income, expenses, and investments."


# ─────────────────────────────────────────────────────────
# SYSTEM PROMPT
# ─────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a smart and practical personal financial advisor for Indian users, acting like a friendly Virtual CFO.

Your role:
- Analyze the user's financial data provided below
- Give personalized, actionable advice
- Be clear, practical, and realistic
- Speak naturally like a human advisor (not like a report)

Guidelines:
1. Use the user's financial data to guide your advice, but you can also apply general financial knowledge where needed
2. Be specific when useful, but do not sound overly technical or robotic
3. Focus on what the user should actually do next
4. Avoid overly rigid formatting or too many bullet points

Investment Suggestions:
- You ARE allowed to suggest examples of:
  - well-known large-cap stocks (e.g., Reliance, TCS, HDFC Bank)
  - index funds (e.g., Nifty 50 index fund)
  - common instruments (FDs, bonds, gold ETFs)
- Present them as options, not guarantees (e.g., “you can consider…”)

Response style:
- Start with a direct answer
- Then briefly explain why
- Keep it conversational and easy to understand

Safety:
- Avoid absolute claims or guarantees
- Add a light disclaimer only when necessary (not in every response)

The user's financial data is provided below. Use it to answer their question in a helpful and practical way."""


# ─────────────────────────────────────────────────────────
# CALL OPENAI (via OpenRouter)
# ─────────────────────────────────────────────────────────

def _call_openai(
    financial_context: str,
    user_message: str,
    conversation_history: list[dict]
) -> str:
    """
    Call OpenAI API (via OpenRouter) with financial context.
    
    OpenRouter allows using OpenAI models with a single API key.
    """
    try:
        from openai import OpenAI
        
        # OpenRouter uses OpenAI-compatible API
        # Just change the base_url to use OpenRouter
        client = OpenAI(
            api_key=settings.OPENAI_API_KEY,
            base_url="https://openrouter.ai/api/v1"  # OpenRouter endpoint
        )
        
        # Build messages
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "system", "content": f"USER'S FINANCIAL DATA:\n\n{financial_context}"}
        ]
        
        # Add conversation history
        messages.extend(conversation_history)
        
        # Add current question
        messages.append({"role": "user", "content": user_message})
        
        # Call OpenAI via OpenRouter
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,  # e.g., "gpt-4o-mini" or "gpt-4"
            messages=messages,
            temperature=0.7,
            max_tokens=2048,
        )
        
        return response.choices[0].message.content or "No response generated."
    
    except ImportError:
        return "⚠️ OpenAI SDK not installed. Run: `pip install openai`"
    except Exception as e:
        logger.error(f"OpenAI API error: {e}")
        error_str = str(e).lower()
        
        if "api key" in error_str or "unauthorized" in error_str or "401" in error_str:
            return (
                "🔑 **Invalid or Missing OpenAI API Key**\n\n"
                "Please check your configuration:\n\n"
                "1. Make sure `OPENAI_API_KEY` is set in your `.env` file\n"
                "2. If using OpenRouter, get your key at https://openrouter.ai/keys\n"
                "3. Set in `.env`: `OPENAI_API_KEY=your_openrouter_key_here`\n"
                "4. Restart the server\n\n"
                "**OpenRouter Benefits:**\n"
                "• Access to multiple AI models with one key\n"
                "• Pay-as-you-go pricing\n"
                "• No rate limits on paid tier"
            )
        elif "rate limit" in error_str or "429" in error_str:
            return (
                "🚫 **Rate Limit Reached**\n\n"
                "You've hit the API rate limit.\n\n"
                "**Solutions:**\n"
                "1. Wait a minute and try again\n"
                "2. Upgrade your OpenRouter plan at https://openrouter.ai/\n"
                "3. Use a different model with higher limits"
            )
        else:
            return f"⚠️ AI service error: {str(e)}\n\nPlease try again in a moment."


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
    Send a message to the Virtual CFO and get a personalized response.
    
    Simple flow:
    1. Fetch user's complete financial data
    2. Send to OpenAI (via OpenRouter) with the question
    3. Return AI response
    
    Args:
        db: Database session
        user_id: Authenticated user's ID
        user_message: The user's question or message
        conversation_history: Previous messages for context

    Returns:
        dict with response and metadata
    """
    # Check if API key is configured
    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.startswith("your_"):
        return {
            "response": (
                "🔑 **OpenAI API key not configured.**\n\n"
                "To enable the AI advisor:\n\n"
                "**Option 1: Using OpenRouter (Recommended)**\n"
                "1. Get an API key at https://openrouter.ai/keys\n"
                "2. Add to `.env`: `OPENAI_API_KEY=your_openrouter_key_here`\n"
                "3. Set model: `OPENAI_MODEL=openai/gpt-4o-mini`\n"
                "4. Restart the server\n\n"
                "**Option 2: Using OpenAI Directly**\n"
                "1. Get an API key at https://platform.openai.com/api-keys\n"
                "2. Add to `.env`: `OPENAI_API_KEY=your_openai_key_here`\n"
                "3. Set model: `OPENAI_MODEL=gpt-4o-mini`\n"
                "4. Restart the server\n\n"
                "**Why OpenRouter?**\n"
                "• Access multiple AI models with one key\n"
                "• Competitive pricing\n"
                "• Easy to switch between models\n"
                "• No complex setup"
            ),
            "provider": "none",
            "model": "none",
            "context_summary": "API key required",
        }
    
    # Step 1: Build complete financial context
    logger.info(f"Building financial context for user {user_id}")
    financial_context = _build_financial_context(db, user_id)
    
    # Step 2: Format conversation history
    history = []
    if conversation_history:
        for msg in conversation_history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ("user", "assistant") and content.strip():
                history.append({"role": role, "content": content})
    
    # Step 3: Call OpenAI
    logger.info(f"Calling OpenAI for user {user_id}: {user_message[:50]}...")
    ai_response = _call_openai(financial_context, user_message, history)
    
    # Step 4: Return response
    return {
        "response": ai_response,
        "provider": "openai",
        "model": settings.OPENAI_MODEL,
        "context_summary": "Complete financial data analyzed by AI",
    }


# ─────────────────────────────────────────────────────────
# LEGACY FUNCTION
# ─────────────────────────────────────────────────────────

def generate_advice(report) -> dict:
    """Legacy stub for the /metrics/ai-advice endpoint."""
    return {
        "status": "upgraded",
        "message": "Use the /ai/chat endpoint for AI-powered financial advice.",
        "redirect": "/ai/chat",
    }
