# 🏹 DhanSathi — Your AI-Powered Personal Finance Companion

DhanSathi is a full-stack personal finance platform built for Indian users. It's part portfolio tracker, part financial health monitor, part Virtual CFO — all in one place. You add your income, expenses, investments, and loans, and DhanSathi gives you a clear picture of where you stand and what to do next.

The AI advisor isn't a generic chatbot. It reads your actual financial data before answering — your savings rate, your EMIs, your portfolio P&L — and gives you advice that's specific to your situation. Under the hood it uses a GAN-style dual-LLM system where one model generates the advice and a second model verifies it for accuracy before it reaches you.

---

## What you can do with it

- Track income from multiple sources (salary, freelance, rental, etc.)
- Monitor monthly expenses by category
- Manage your investment portfolio with live market prices from Yahoo Finance
- Track loans and EMIs, see your debt-to-income ratio
- Plan and track a monthly budget
- Set up and monitor an emergency fund
- Track insurance policies and coverage
- Set financial goals and track progress
- Plan for retirement across multiple accounts
- Manage tax records and deductions
- Run financial simulations — SIP projections, compound growth, loan payoff
- Chat with an AI Virtual CFO that knows your actual numbers
- Full chat history that persists across sessions, GPT-style sidebar

---

## Tech stack

**Backend** — FastAPI + SQLAlchemy + PostgreSQL + JWT auth

**Frontend** — Next.js 16 + React 19 + Recharts + TypeScript

**AI** — OpenAI / OpenRouter with a GAN-style dual-LLM verification loop

**Market data** — Yahoo Finance (yfinance) for live stock and mutual fund prices

---

## Getting started

### What you need installed

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

### 1. Create the database

```bash
psql -U postgres -c "CREATE DATABASE financeiq;"
```

### 2. Set up your environment

Copy `.env.example` to `.env` and fill in your values:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/financeiq
SECRET_KEY=some-long-random-string-at-least-32-chars
OPENAI_API_KEY=your-openrouter-or-openai-key
OPENAI_MODEL=openai/gpt-4o-mini
```

Get an OpenRouter key at https://openrouter.ai/keys — it gives you access to multiple models with one key.

### 3. Start the backend

```bash
# Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

You should see `Application startup complete.` — the database tables are created automatically on first run.

Check the API docs at http://localhost:8000/docs

### 4. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 — you'll land on the login page.

### 5. Sign up and start adding data

Create an account, then add your income sources, expenses, and investments. The more data you add, the more useful the AI advisor becomes.

---

## Project structure

```
DhanSathi/
├── app/                        # FastAPI backend
│   ├── main.py                 # Entry point, CORS, router registration
│   ├── config.py               # Settings loaded from .env
│   ├── database.py             # SQLAlchemy engine and session
│   ├── models/                 # ORM models
│   │   ├── user.py
│   │   ├── income.py
│   │   ├── expense.py
│   │   ├── investment.py
│   │   ├── loan.py
│   │   ├── chat_session.py     # Persistent AI chat history
│   │   ├── budget.py
│   │   ├── emergency_fund.py
│   │   ├── goal.py
│   │   ├── insurance.py
│   │   ├── retirement.py
│   │   └── tax.py
│   ├── routers/                # API endpoints
│   ├── schemas/                # Pydantic request/response models
│   ├── services/
│   │   ├── ai_advisor.py       # GAN dual-LLM system
│   │   ├── portfolio_engine.py # Live portfolio calculations
│   │   ├── metrics_engine.py   # Financial health metrics
│   │   ├── simulation_engine.py
│   │   └── market_data.py      # Yahoo Finance integration
│   └── utils/
│       └── dependencies.py     # JWT auth middleware
│
├── frontend/
│   └── src/
│       ├── app/                # Next.js pages
│       │   ├── dashboard/
│       │   ├── income/
│       │   ├── expenses/
│       │   ├── budget/
│       │   ├── portfolio/
│       │   ├── loans/
│       │   ├── goals/
│       │   ├── emergency-fund/
│       │   ├── insurance/
│       │   ├── retirement/
│       │   ├── tax/
│       │   ├── simulation/
│       │   └── ai-chat/        # GPT-style chat with session history
│       ├── components/
│       │   ├── AppShell.tsx    # Layout wrapper with auth guard
│       │   ├── Sidebar.tsx     # Navigation
│       │   ├── StatCard.tsx
│       │   └── Modal.tsx
│       └── lib/
│           ├── api.ts          # Typed API client
│           ├── auth-context.tsx
│           └── helpers.ts
│
├── requirements.txt
├── .env.example
└── alembic/                    # DB migrations (optional for local dev)
```

---

## How the AI advisor works

When you send a message, DhanSathi doesn't just forward it to an LLM. It first builds a complete snapshot of your finances — income, expenses, savings rate, portfolio value, loans, risk profile, diversification score — and sends that along with your question.

The response goes through a two-model loop:

1. **Generator** produces personalised advice grounded in your actual numbers
2. **Discriminator** scores it 0–100 for factual accuracy, hallucinations, and financial soundness
3. If the score is below 80, the generator retries with the discriminator's feedback (up to 3 times, with temperature dropping each round)
4. If it still doesn't pass, the discriminator directly refines the best attempt
5. The final response is cleaned and formatted before it reaches you

Every response includes a confidence score and verification note so you know how many attempts it took.

Chat history is saved per session in the database. Sessions are named from the first prompt you send, and the full history loads back when you return — works the same way as ChatGPT.

---

## API overview

| Area | Prefix | What it covers |
|------|--------|----------------|
| Auth | `/auth` | Signup, login, profile |
| Income | `/income` | CRUD for income sources |
| Expenses | `/expense` | CRUD + monthly summary |
| Budget | `/budget` | Monthly budget tracking |
| Investments | `/investment` | CRUD + ticker search |
| Loans | `/loan` | CRUD for loans and EMIs |
| Portfolio | `/portfolio` | Live summary and allocation |
| Metrics | `/metrics` | Savings rate, DTI, risk, diversification |
| Simulation | `/simulation` | Compound growth, SIP, loan payoff |
| Emergency Fund | `/emergency-fund` | Fund tracking and progress |
| Insurance | `/insurance` | Policy management |
| Goals | `/goals` | Financial goal tracking |
| Retirement | `/retirement` | Retirement planning |
| Tax | `/tax` | Tax records and deductions |
| AI Chat | `/ai` | Session management and chat |

---

## Common issues

**DB connection fails** — check PostgreSQL is running and your `DATABASE_URL` password is correct

**AI advisor says key not configured** — add `OPENAI_API_KEY` to `.env` and restart the backend

**Port 8000 in use** — run `uvicorn app.main:app --port 8001` and update `NEXT_PUBLIC_API_URL` in the frontend

**Port 3000 in use** — run `npx next dev -p 3001`

**psycopg2 install fails** — use `pip install psycopg2-binary` instead

---

## License

MIT
