# Simple Setup Guide - OpenAI/OpenRouter

## What Changed

Removed all the complex stuff. Now it's simple:

```
User Question + Complete Financial Data → OpenAI → Smart Response
```

That's it. No intent detection, no templates, no fallbacks. Just AI analyzing your real data.

---

## Setup (2 Minutes)

### Step 1: Get API Key

**Option A: OpenRouter (Recommended)**
1. Go to https://openrouter.ai/keys
2. Sign up (free)
3. Create an API key
4. Copy it

**Option B: OpenAI Direct**
1. Go to https://platform.openai.com/api-keys
2. Sign up (requires payment method)
3. Create an API key
4. Copy it

---

### Step 2: Configure `.env`

**For OpenRouter:**
```env
OPENAI_API_KEY=sk-or-v1-your-key-here
OPENAI_MODEL=openai/gpt-4o-mini
```

**For OpenAI Direct:**
```env
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini
```

---

### Step 3: Restart Server

```bash
python -m uvicorn app.main:app --reload
```

Done! 🎉

---

## How It Works

### What Gets Sent to OpenAI

**Your complete financial profile:**
- ✅ ALL income sources with amounts
- ✅ ALL expense categories with amounts
- ✅ ALL investments with current values and P/L
- ✅ ALL loans with EMI and interest rates
- ✅ Calculated metrics (savings rate, DTI, risk score, diversification)
- ✅ Asset allocation breakdown
- ✅ User's question

**Example:**
```
USER'S COMPLETE FINANCIAL PROFILE:

Income: ₹1,20,000/month
Expenses: ₹55,000/month
Savings: ₹65,000/month (54.2%)

Loans:
• Home Loan: ₹50,00,000 @ 8.5% (EMI: ₹40,000)
• Car Loan: ₹5,00,000 @ 9% (EMI: ₹12,000)

Portfolio: ₹5,00,000
• Stocks: ₹2,00,000 (40%)
• Mutual Funds: ₹2,00,000 (40%)
• Gold: ₹1,00,000 (20%)

Risk: Moderate (45/100)
Diversification: 65/100

User Question: "Where should I invest my ₹65,000 monthly savings?"
```

**OpenAI analyzes everything and responds with personalized advice.**

---

## Available Models

### OpenRouter (Recommended)

**Budget:**
- `openai/gpt-4o-mini` - $0.15/1M tokens (~$0.0001 per chat)
- `google/gemini-2.0-flash-exp` - Free tier available

**Premium:**
- `openai/gpt-4o` - $2.50/1M tokens (~$0.002 per chat)
- `anthropic/claude-3.5-sonnet` - $3/1M tokens (~$0.003 per chat)

**To change model:**
```env
OPENAI_MODEL=openai/gpt-4o-mini
# or
OPENAI_MODEL=anthropic/claude-3.5-sonnet
```

---

### OpenAI Direct

**Budget:**
- `gpt-4o-mini` - $0.15/1M tokens

**Premium:**
- `gpt-4o` - $2.50/1M tokens
- `gpt-4-turbo` - $10/1M tokens

**To change model:**
```env
OPENAI_MODEL=gpt-4o-mini
# or
OPENAI_MODEL=gpt-4o
```

---

## Testing

```bash
curl -X POST http://localhost:8000/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "Where should I invest?"
  }'
```

**Expected Response:**
```json
{
  "response": "Based on your financial profile...",
  "provider": "openai",
  "model": "openai/gpt-4o-mini",
  "context_summary": "Complete financial data analyzed by AI"
}
```

---

## Example Conversations

### Example 1: Investment Advice

**User:** "Where should I invest my ₹65,000 monthly savings?"

**AI Response:**
```
💰 Investment Recommendation

Based on your excellent savings rate of 54.2% and moderate risk 
profile (45/100), here's how to invest your ₹65,000:

1. Equity (₹32,500 - 50%)
   • Nifty 50 Index Fund: ₹15,000
   • Large-cap stocks: ₹10,000
   • Mid-cap mutual funds: ₹7,500

2. Debt (₹26,000 - 40%)
   • PPF: ₹12,500 (tax saving)
   • Debt mutual funds: ₹8,000
   • FD: ₹5,500 (emergency fund)

3. Gold (₹6,500 - 10%)
   • Gold ETF or Sovereign Gold Bonds

Your current portfolio is well-diversified (65/100), so this 
allocation maintains balance while building wealth.

⚠️ Note: Your home loan EMI (₹40,000) is manageable at 33% of 
income. Consider prepaying ₹10,000/month to reduce interest.

Next Steps:
1. Set up SIPs for equity funds (₹32,500)
2. Open PPF account if not already done
3. Keep 6-month emergency fund (₹3,30,000) in liquid funds

Consult a SEBI-registered advisor for personalized guidance.
```

---

### Example 2: Debt Management

**User:** "My EMI is ₹52,000. How can I reduce it?"

**AI Response:**
```
💳 Debt Reduction Strategy

Your EMI of ₹52,000 is 43% of your ₹1,20,000 income - this is 
high (recommended: <36%).

Current Loans:
• Home Loan: ₹50L @ 8.5% (EMI: ₹40,000)
• Car Loan: ₹5L @ 9% (EMI: ₹12,000)

Priority Action Plan:

1. Pay off Car Loan FIRST (higher interest)
   • Extra payment: ₹10,000/month
   • Payoff time: ~40 months → 25 months
   • Interest saved: ~₹80,000

2. After car loan is cleared:
   • Redirect ₹22,000 to home loan prepayment
   • Reduces tenure by 5+ years
   • Saves ₹15+ lakhs in interest

3. Immediate steps:
   • Stop new borrowing
   • Allocate 30% of savings (₹3,900) to extra payments
   • Maintain emergency fund

Your savings rate of 10.8% will improve to 20%+ once car loan 
is cleared.

Timeline:
• Month 1-25: Focus on car loan
• Month 26+: Aggressive home loan prepayment
• Target DTI: <30% within 2 years

Consult a financial advisor for debt consolidation options.
```

---

### Example 3: General Question

**User:** "Am I doing okay financially?"

**AI Response:**
```
📊 Financial Health Check

Overall: You're doing WELL, but there's room for improvement.

✅ Strengths:
• Excellent savings rate: 54.2% (benchmark: 20%)
• Diversified portfolio: 65/100 score
• Multiple income streams
• Manageable debt: DTI 33%

⚠️ Areas to Improve:
• Emergency fund: Need 6 months (₹3.3L) - check if you have this
• Insurance: Ensure adequate life and health coverage
• Tax planning: Maximize 80C, 80D deductions

💡 Recommendations:

1. Emergency Fund (Priority 1)
   • Target: ₹3,30,000 (6 months expenses)
   • Keep in liquid funds or savings account

2. Insurance Check
   • Life: 10x annual income (₹1.2 Cr)
   • Health: ₹10L family floater minimum

3. Tax Optimization
   • PPF: ₹1.5L/year (80C)
   • Health insurance: ₹25K premium (80D)
   • NPS: ₹50K additional (80CCD)

4. Wealth Building
   • Continue current investment strategy
   • Review portfolio quarterly
   • Rebalance if equity >60% or <40%

You're on the right track! Focus on emergency fund and insurance 
next.

Consult a SEBI-registered advisor for comprehensive planning.
```

---

## Pricing

### OpenRouter (Recommended)

**Typical chat cost:**
- Input: ~1,500 tokens (your financial data)
- Output: ~500 tokens (AI response)
- Total: ~2,000 tokens

**Cost per chat:**
- GPT-4o-mini: ~$0.0003 (₹0.025)
- GPT-4o: ~$0.005 (₹0.42)
- Claude 3.5 Sonnet: ~$0.006 (₹0.50)

**Monthly cost (100 chats):**
- GPT-4o-mini: ~$0.03 (₹2.50)
- GPT-4o: ~$0.50 (₹42)
- Claude 3.5 Sonnet: ~$0.60 (₹50)

**Extremely affordable!**

---

## Troubleshooting

### Issue: "Invalid API Key"

**Solution:**
1. Check `.env` file has correct key
2. For OpenRouter: Key starts with `sk-or-v1-`
3. For OpenAI: Key starts with `sk-`
4. Restart server after changing `.env`

---

### Issue: "Rate Limit"

**Solution:**
1. Wait 1 minute and retry
2. Upgrade OpenRouter plan
3. Use different model

---

### Issue: Slow responses

**Cause:** AI is analyzing your complete financial data

**Normal response time:** 2-5 seconds

**To speed up:**
- Use faster model (gpt-4o-mini)
- OpenRouter is usually faster than OpenAI direct

---

## Summary

**What you get:**
- ✅ AI analyzes ALL your financial data
- ✅ Personalized advice for every question
- ✅ Natural conversation
- ✅ Extremely affordable (~₹0.025 per chat)
- ✅ No rate limits (on paid tier)
- ✅ Simple setup (2 minutes)

**What you need:**
- OpenRouter or OpenAI API key
- 2 lines in `.env` file
- That's it!

**Cost:**
- ~₹2.50 per month for 100 chats
- Cheaper than a cup of chai ☕

---

## Next Steps

1. Get API key from https://openrouter.ai/keys
2. Add to `.env`:
   ```env
   OPENAI_API_KEY=your-key-here
   OPENAI_MODEL=openai/gpt-4o-mini
   ```
3. Restart server
4. Start chatting!

That's it. Simple and effective. 🚀
