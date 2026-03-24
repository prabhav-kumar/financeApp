# FinanceIQ - Project Structure

## Clean & Simple Architecture

This project now uses a simple, effective architecture with OpenAI for the AI chatbot.

---

## Root Files

### Configuration
- `.env` - Environment variables (API keys, database URL)
- `.env.example` - Template for environment configuration
- `.gitignore` - Git ignore rules
- `alembic.ini` - Database migration configuration
- `requirements.txt` - Python dependencies

### Documentation
- `README.md` - Main project documentation
- `SIMPLE_SETUP.md` - Quick setup guide for AI chatbot
- `FINAL_SIMPLE_ARCHITECTURE.md` - Architecture explanation
- `PROJECT_STRUCTURE.md` - This file

---

## Backend Structure (`app/`)

### Core Files
- `app/main.py` - FastAPI application entry point
- `app/config.py` - Configuration management
- `app/database.py` - Database connection setup

### Models (`app/models/`)
Database models (SQLAlchemy ORM):
- `user.py` - User authentication
- `income.py` - Income sources
- `expense.py` - Expense tracking
- `investment.py` - Investment portfolio
- `loan.py` - Loan management

### Schemas (`app/schemas/`)
Pydantic schemas for API validation:
- `user.py` - User data validation
- `income.py` - Income data validation
- `expense.py` - Expense data validation
- `investment.py` - Investment data validation
- `loan.py` - Loan data validation
- `portfolio.py` - Portfolio response schemas
- `metrics.py` - Financial metrics schemas
- `simulation.py` - Simulation schemas

### Routers (`app/routers/`)
API endpoints:
- `auth.py` - Authentication (login, register)
- `income.py` - Income CRUD operations
- `expense.py` - Expense CRUD operations
- `investment.py` - Investment CRUD operations
- `loan.py` - Loan CRUD operations
- `portfolio.py` - Portfolio analysis
- `metrics.py` - Financial metrics
- `simulation.py` - Financial simulations
- `ai_chat.py` - AI chatbot endpoint

### Services (`app/services/`)
Business logic:
- `ai_advisor.py` - **AI chatbot (OpenAI integration)**
- `auth_service.py` - Authentication logic
- `metrics_engine.py` - Financial calculations
- `portfolio_engine.py` - Portfolio analysis
- `market_data.py` - Live market prices (Yahoo Finance)
- `simulation_engine.py` - Financial simulations

### Utils (`app/utils/`)
Utilities:
- `dependencies.py` - FastAPI dependencies (auth, DB)

---

## Frontend Structure (`frontend/`)

Next.js application with TypeScript and Tailwind CSS.

### Pages (`frontend/src/app/`)
- `/` - Landing page
- `/auth` - Login/Register
- `/dashboard` - Main dashboard
- `/income` - Income management
- `/expenses` - Expense management
- `/loans` - Loan management
- `/portfolio` - Portfolio analysis
- `/simulation` - Financial simulations
- `/ai-chat` - AI chatbot interface

### Components (`frontend/src/components/`)
- `AppShell.tsx` - Main layout wrapper
- `TopNavbar.tsx` - Navigation bar
- `StatCard.tsx` - Metric display cards
- `Modal.tsx` - Modal dialogs

### Libraries (`frontend/src/lib/`)
- `api.ts` - API client (axios)
- `auth-context.tsx` - Authentication context
- `helpers.ts` - Utility functions

---

## Database Migrations (`alembic/`)

Database version control using Alembic:
- `alembic/versions/` - Migration scripts
- `alembic/env.py` - Alembic environment configuration

---

## Key Features

### 1. Financial Tracking
- Income management (multiple sources)
- Expense tracking (categorized)
- Investment portfolio (stocks, MFs, gold, etc.)
- Loan management (EMI tracking)

### 2. Financial Analysis
- Savings rate calculation
- Debt-to-income ratio
- Risk profile assessment
- Portfolio diversification score
- Asset allocation analysis

### 3. AI Financial Advisor
- **Simple OpenAI integration**
- Analyzes complete financial data
- Personalized advice
- Natural conversation
- Conversation history support

### 4. Portfolio Management
- Live market prices (Yahoo Finance)
- Profit/loss tracking
- Asset allocation breakdown
- Performance analysis

### 5. Financial Simulations
- Retirement planning
- Goal-based planning
- What-if scenarios

---

## Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database
- **PostgreSQL** - Database
- **Alembic** - Database migrations
- **Pydantic** - Data validation
- **OpenAI** - AI chatbot (via OpenRouter)
- **yfinance** - Market data

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Axios** - API client

### AI
- **OpenRouter** - AI model gateway
- **OpenAI GPT-4o-mini** - Language model

---

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user

### Financial Data
- `GET/POST/PUT/DELETE /income` - Income management
- `GET/POST/PUT/DELETE /expense` - Expense management
- `GET/POST/PUT/DELETE /investment` - Investment management
- `GET/POST/PUT/DELETE /loan` - Loan management

### Analysis
- `GET /portfolio/summary` - Portfolio summary
- `GET /portfolio/allocation` - Asset allocation
- `GET /metrics/savings-rate` - Savings rate
- `GET /metrics/debt-to-income` - DTI ratio
- `GET /metrics/diversification` - Diversification score
- `GET /metrics/risk-level` - Risk assessment
- `GET /metrics/full-report` - Complete report

### AI Chatbot
- `POST /ai/chat` - Chat with AI advisor

### Simulations
- `POST /simulation/retirement` - Retirement planning
- `POST /simulation/goal` - Goal-based planning

---

## Environment Variables

Required in `.env`:

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/financeiq

# JWT
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# CORS
ALLOWED_ORIGINS=http://localhost:3000

# AI (OpenRouter)
OPENAI_API_KEY=sk-or-v1-your-key-here
OPENAI_MODEL=openai/gpt-4o-mini
```

---

## Setup Instructions

### 1. Backend Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Setup database
alembic upgrade head

# Run server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. AI Chatbot Setup
1. Get OpenRouter API key: https://openrouter.ai/keys
2. Add to `.env`: `OPENAI_API_KEY=your-key-here`
3. Restart backend

---

## File Count Summary

### Backend
- Models: 5 files
- Schemas: 8 files
- Routers: 9 files
- Services: 6 files
- Utils: 1 file

### Frontend
- Pages: 9 routes
- Components: 4 files
- Libraries: 3 files

### Total
- Backend Python files: ~30
- Frontend TypeScript files: ~20
- Documentation: 3 files
- Configuration: 5 files

**Clean, organized, and maintainable!** ✨
