# DhanSathi - Your Personal Finance Command Centre

Managing personal finances in India usually means juggling multiple apps — one for investments, one for loans, a spreadsheet for budget, another tool for tax. And when you want AI-powered advice, you end up pasting your entire financial situation into ChatGPT every single time, only for it to forget everything once the context fills up.

DhanSathi solves both problems. It's a single platform where you track everything — income, expenses, investments, loans, budget, insurance, goals, retirement, tax — and it comes with an AI advisor that already knows your numbers before you even ask a question.

---

## The problem it solves

When you use a general-purpose AI like ChatGPT for financial advice, you have to manually provide all your data every time. Your salary, your EMIs, your portfolio, your savings rate — none of it is there by default. And even if you use memory features, they fill up fast and the AI still doesn't have a structured, up-to-date picture of your finances.

DhanSathi's AI advisor is different. Before it responds to anything, it pulls a live snapshot of your actual data — your current savings rate, your debt-to-income ratio, your portfolio P&L, your monthly cash flow — and uses that as context. You just ask your question. The AI already knows the rest.

---

## What you can do

- Track income from multiple sources — salary, freelance, rental, business
- Log monthly expenses by category and see where your money goes
- Manage your investment portfolio with live market prices from Yahoo Finance
- Track loans and EMIs, monitor your debt-to-income ratio
- Plan and track a monthly budget with category-level variance
- Set up and monitor an emergency fund with progress tracking
- Track insurance policies and total coverage
- Set financial goals and track progress toward each one
- Plan for retirement across multiple account types
- Manage tax records, deductions, and estimated liability
- Run financial simulations — SIP projections, compound growth, loan payoff scenarios
- Chat with an AI Virtual CFO that reads your actual financial data before answering

---

## The AI advisor

The AI doesn't just forward your message to a language model. It first builds a complete financial snapshot — income, expenses, savings rate, portfolio value and P&L, outstanding loans, risk profile, diversification score — and sends all of that as context along with your question.

Chat history is saved per session in the database. Sessions are named from your first message, and the full history reloads when you return — same experience as ChatGPT, but with your finances already loaded in.

---

## Tech stack

- Backend — FastAPI + SQLAlchemy + PostgreSQL + JWT auth
- Frontend — Next.js 16 + React 19 + Recharts + TypeScript
- AI — OpenAI / OpenRouter (context-aware, finance-grounded)
- Market data — Yahoo Finance (yfinance) for live stock and mutual fund prices

---

## Getting started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

### 1. Create the database

```bash
psql -U postgres -c "CREATE DATABASE financeiq;"
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/financeiq

# JWT
SECRET_KEY=some-long-random-string-at-least-32-chars

# AI (get a key at https://openrouter.ai/keys)
OPENAI_API_KEY=your-openrouter-or-openai-key
OPENAI_MODEL=openai/gpt-4o-mini

# Google OAuth (optional — see below)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# Email / SMTP (for OTP verification and password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=your-gmail-app-password
```

For the Gmail app password: go to myaccount.google.com/apppasswords, create one for "Mail", and use the 16-character code. Requires 2FA to be enabled on the account.

For Google OAuth: go to console.cloud.google.com → APIs & Services → Credentials → Create OAuth 2.0 Client ID (Web application) → add `http://localhost:3000/auth/callback` as an authorised redirect URI.

### 3. Start the backend

```bash
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Tables are created automatically on first run. API docs at http://localhost:8000/docs.

### 4. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000.

### 5. Sign up and add your data

Create an account (email signup requires OTP verification), then start adding income sources, expenses, and investments. The more data you add, the more useful the AI advisor becomes.

---

## Authentication

- Email/password signup with OTP email verification
- Google OAuth sign-in
- Forgot password — OTP-based reset, works for all accounts including Google-only accounts
- Change password — available from the sidebar after logging in (Google-only accounts can set a password this way to enable manual login while keeping Google OAuth working)

---

## Common issues

**DB connection fails** — check PostgreSQL is running and your `DATABASE_URL` password is correct

**`oauth_provider` column missing** — if you created the DB before OAuth was added, run:
```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(50),
  ADD COLUMN IF NOT EXISTS oauth_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
```

**AI advisor says key not configured** — add `OPENAI_API_KEY` to `.env` and restart the backend

**OTP emails not sending** — make sure `SMTP_USER` and `SMTP_PASSWORD` are set and you're using a Gmail App Password, not your regular Gmail password

**bcrypt version warning on startup** — harmless, fix with `pip install bcrypt==4.0.1`

**Port 8000 in use** — run `uvicorn app.main:app --port 8001` and set `NEXT_PUBLIC_API_URL=http://localhost:8001` in `frontend/.env.local`

**Port 3000 in use** — run `npx next dev -p 3001`

---

## Project structure

```
DhanSathi/
├── app/                        # FastAPI backend
│   ├── main.py                 # Entry point, CORS, router registration
│   ├── config.py               # Settings loaded from .env
│   ├── database.py             # SQLAlchemy engine and session
│   ├── models/                 # ORM models (user, income, expense, ...)
│   ├── routers/                # API route handlers
│   ├── schemas/                # Pydantic request/response models
│   ├── services/
│   │   ├── ai_advisor.py       # AI chat with financial context
│   │   ├── portfolio_engine.py # Live portfolio calculations
│   │   ├── metrics_engine.py   # Financial health metrics
│   │   ├── simulation_engine.py
│   │   └── market_data.py      # Yahoo Finance integration
│   └── utils/
│       └── dependencies.py     # JWT auth middleware
│
├── frontend/
│   └── src/
│       ├── app/                # Next.js pages (one per feature)
│       ├── components/
│       │   ├── AppShell.tsx    # Layout wrapper with auth guard
│       │   ├── Sidebar.tsx     # Navigation + change password
│       │   ├── StatCard.tsx
│       │   └── Modal.tsx
│       └── lib/
│           ├── api.ts          # Typed API client
│           ├── auth-context.tsx
│           └── helpers.ts
│
├── alembic/                    # DB migrations
├── requirements.txt
└── .env                        # Your local config (never commit this)
```

---

## API overview

| Area | Prefix | What it covers |
|------|--------|----------------|
| Auth | `/auth` | Signup with OTP, login, Google OAuth, forgot/reset/change password |
| Income | `/income` | CRUD for income sources |
| Expenses | `/expense` | CRUD + monthly summary |
| Budget | `/budget` | Monthly budget tracking |
| Investments | `/investment` | CRUD + ticker search |
| Loans | `/loan` | CRUD for loans and EMIs |
| Portfolio | `/portfolio` | Live summary and asset allocation |
| Metrics | `/metrics` | Savings rate, DTI, risk, diversification |
| Simulation | `/simulation` | Compound growth, SIP, loan payoff |
| Emergency Fund | `/emergency-fund` | Fund tracking and progress |
| Insurance | `/insurance` | Policy management |
| Goals | `/goals` | Financial goal tracking |
| Retirement | `/retirement` | Retirement planning |
| Tax | `/tax` | Tax records and deductions |
| AI Chat | `/ai` | Session management and chat |
