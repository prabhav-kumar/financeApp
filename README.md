# FinanceIQ — AI-Powered Personal Finance Intelligence System

A full-stack platform for **portfolio tracking, financial analysis, simulation, and AI-powered advice**. Think Groww + Virtual CFO.

> **Note:** Users cannot invest through the app — only tracking, analysis, and intelligent recommendations.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | FastAPI (Python 3.11+) |
| **Frontend** | Next.js 16, Tailwind CSS, Recharts |
| **Database** | PostgreSQL |
| **ORM** | SQLAlchemy 2.0 |
| **Auth** | JWT (python-jose) + bcrypt |
| **Market Data** | Yahoo Finance (yfinance) |
| **AI Advisor** | Google Gemini / OpenAI GPT-4 |

---

## Prerequisites

Before you start, make sure you have these installed:

| Tool | Version | Check Command |
|------|---------|--------------|
| **Python** | 3.11+ | `python --version` |
| **Node.js** | 18+ | `node --version` |
| **npm** | 9+ | `npm --version` |
| **PostgreSQL** | 14+ | `psql --version` |

---

## Step-by-Step Setup

### STEP 1 — Clone & Enter the Project

```bash
cd designathon
```

---

### STEP 2 — Set Up PostgreSQL Database

Open a terminal and create the database:

```bash
# Windows (if psql is in PATH)
psql -U postgres -c "CREATE DATABASE financeiq;"

# Or use pgAdmin / any PostgreSQL GUI to create a database named "financeiq"
```

---

### STEP 3 — Configure Environment Variables

Edit the `.env` file in the project root:

```env
# --- Database ---
# Replace with your actual PostgreSQL credentials
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/financeiq

# --- JWT ---
# Change this to a random secret string (min 32 chars)
SECRET_KEY=your-super-secret-key-change-in-production-min-32-chars

# --- AI Advisor (choose one) ---
# Option A: Google Gemini (recommended — free tier available)
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
# Get a free key at: https://aistudio.google.com/apikey

# Option B: OpenAI
# AI_PROVIDER=openai
# OPENAI_API_KEY=your_openai_api_key_here
```

> **Important:** At minimum, update `DATABASE_URL` with your PostgreSQL password and set a `SECRET_KEY`.

---

### STEP 4 — Set Up the Backend (Python)

```bash
# Create a virtual environment
python -m venv venv

# Activate it
venv\Scripts\activate          # Windows (Command Prompt)
# venv\Scripts\Activate.ps1    # Windows (PowerShell)
# source venv/bin/activate     # macOS / Linux

# Install all Python dependencies
pip install -r requirements.txt

# Start the backend server
uvicorn app.main:app --reload --port 8000
```

If everything works, you should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

**Verify:** Open http://localhost:8000/docs to see the Swagger API documentation.

> **Note:** The database tables are created automatically when the server starts — no need to run Alembic migrations manually for local development.

---

### STEP 5 — Set Up the Frontend (Next.js)

Open a **new terminal** (keep the backend running in the first one):

```bash
# Go to the frontend directory
cd frontend

# Install Node.js dependencies
npm install

# Start the development server
npm run dev
```

If everything works, you should see:
```
▲ Next.js 16.x.x
- Local:   http://localhost:3000
```

**Verify:** Open http://localhost:3000 — you should see the login page.

---

### STEP 6 — Use the App

1. **Sign Up** — Create an account at http://localhost:3000/auth
2. **Add Data** — Start adding your income, expenses, investments, and loans
3. **Dashboard** — View your portfolio summary, charts, and financial health metrics
4. **Simulate** — Run SIP, compound growth, and loan payoff projections
5. **AI Advisor** — Ask the Virtual CFO questions about your finances at /ai-chat

---

## Running (Day-to-Day)

Every time you want to work on or use the app:

```bash
# Terminal 1 — Backend
cd designathon
venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd designathon\frontend
npm run dev
```

Then open http://localhost:3000 in your browser.

---

## Project Structure

```
designathon/
├── .env                             # Environment config (DB, keys)
├── requirements.txt                 # Python dependencies
├── README.md                        # This file
│
├── app/                             # Backend (FastAPI)
│   ├── main.py                      # App entry point, CORS, routers
│   ├── config.py                    # Settings from .env
│   ├── database.py                  # DB engine & session
│   │
│   ├── models/                      # SQLAlchemy ORM models
│   │   ├── user.py, income.py, expense.py, investment.py, loan.py
│   │
│   ├── schemas/                     # Pydantic request/response schemas
│   │   ├── user.py, income.py, expense.py, investment.py, loan.py
│   │   ├── portfolio.py, metrics.py, simulation.py
│   │
│   ├── routers/                     # API route handlers
│   │   ├── auth.py                  # /auth — signup, login
│   │   ├── income.py                # /income — CRUD
│   │   ├── expense.py               # /expense — CRUD
│   │   ├── investment.py            # /investment — CRUD
│   │   ├── loan.py                  # /loan — CRUD
│   │   ├── portfolio.py             # /portfolio — tracking
│   │   ├── metrics.py               # /metrics — financial health
│   │   ├── simulation.py            # /simulation — projections
│   │   └── ai_chat.py               # /ai/chat — Virtual CFO
│   │
│   ├── services/                    # Business logic
│   │   ├── auth_service.py          # Password hashing, JWT
│   │   ├── market_data.py           # Yahoo Finance API
│   │   ├── portfolio_engine.py      # Portfolio calculations
│   │   ├── metrics_engine.py        # Financial metrics
│   │   ├── simulation_engine.py     # Growth & loan projections
│   │   ├── context_builder.py       # AI data gatherer
│   │   └── ai_advisor.py            # LLM integration (Gemini/OpenAI)
│   │
│   └── utils/
│       └── dependencies.py          # Auth middleware
│
├── alembic/                         # DB migrations (optional)
│
└── frontend/                        # Frontend (Next.js)
    ├── .env.local                   # Frontend env (API URL)
    ├── package.json                 # Node.js dependencies
    │
    └── src/
        ├── app/                     # Pages (App Router)
        │   ├── auth/page.tsx        # Login / Signup
        │   ├── dashboard/page.tsx   # Main dashboard
        │   ├── portfolio/page.tsx   # Investment management
        │   ├── loans/page.tsx       # Loan & EMI tracking
        │   ├── simulation/page.tsx  # Financial calculators
        │   └── ai-chat/page.tsx     # Virtual CFO chat
        │
        ├── components/              # Reusable UI
        │   ├── AppShell.tsx, Sidebar.tsx, Modal.tsx, StatCard.tsx
        │
        └── lib/                     # Core logic
            ├── api.ts               # Backend API client
            ├── auth-context.tsx     # Auth state management
            └── helpers.ts           # Formatting utilities
```

---

## API Endpoints

### Auth (`/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Register new user |
| POST | `/auth/login` | Login → JWT token |
| GET | `/auth/me` | Get current user profile |

### Financial Data (`/income`, `/expense`, `/investment`, `/loan`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/income/` | Add income source |
| GET | `/income/` | List all income |
| POST | `/expense/` | Add expense |
| GET | `/expense/` | List expenses |
| POST | `/investment/` | Add investment |
| GET | `/investment/` | List investments |
| PUT | `/investment/{id}` | Update investment |
| POST | `/loan/` | Add loan |
| GET | `/loan/` | List loans |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/portfolio/summary` | Total value + P&L |
| GET | `/portfolio/allocation` | Asset allocation breakdown |
| GET | `/metrics/full-report` | Complete financial health |
| POST | `/simulation/compound-growth` | Compound interest calculator |
| POST | `/simulation/monthly-investment` | SIP projection |
| POST | `/simulation/loan-payoff` | Loan amortization |

### AI Advisor (`/ai`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ai/chat` | Chat with Virtual CFO |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `psycopg2` install fails | Install PostgreSQL dev headers: `pip install psycopg2-binary` |
| Port 8000 in use | Use `uvicorn app.main:app --port 8001` and update `.env.local` |
| Port 3000 in use | Use `npx next dev -p 3001` |
| DB connection refused | Check PostgreSQL is running and `.env` has correct credentials |
| AI advisor says "key not configured" | Add your Gemini/OpenAI API key to `.env` |
| Frontend shows "API error" | Make sure backend is running on port 8000 |

---

## License
MIT
