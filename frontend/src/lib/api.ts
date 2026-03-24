/**
 * api.ts — Centralized API client for the DhanSathi backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ── Token helpers ─────────────────────────────────────── */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("dhansathi_token");
}
export function setToken(token: string) { localStorage.setItem("dhansathi_token", token); }
export function clearToken() { localStorage.removeItem("dhansathi_token"); }

/* ── Generic fetch wrapper ─────────────────────────────── */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/* ── Auth ──────────────────────────────────────────────── */
export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: { id: number; email: string; full_name: string; is_active: boolean; created_at: string };
}

export const auth = {
  signup: (email: string, full_name: string, password: string) =>
    request<AuthResponse>("/auth/signup", { method: "POST", body: JSON.stringify({ email, full_name, password }) }),
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request<AuthResponse["user"]>("/auth/me"),
};

/* ── Income ────────────────────────────────────────────── */
export interface Income {
  id: number; source_name: string; category: string;
  amount: number; frequency: string; is_active: number; created_at: string;
}

export const income = {
  list: () => request<Income[]>("/income/"),
  add: (data: { source_name: string; category: string; amount: number; frequency: string }) =>
    request<Income>("/income/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Income>) =>
    request<Income>(`/income/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: number) => request<void>(`/income/${id}`, { method: "DELETE" }),
};

/* ── Expense ───────────────────────────────────────────── */
export interface Expense {
  id: number; category: string; label: string;
  monthly_amount: number; is_active: number; created_at: string;
}

export interface ExpenseSummary {
  total_monthly_expenses: number;
  category_breakdown: Record<string, number>;
  active_items: number;
}

export const expense = {
  list: () => request<Expense[]>("/expense/"),
  summary: () => request<ExpenseSummary>("/expense/summary"),
  add: (data: { category: string; label: string; monthly_amount: number }) =>
    request<Expense>("/expense/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Expense>) =>
    request<Expense>(`/expense/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: number) => request<void>(`/expense/${id}`, { method: "DELETE" }),
};

/* ── Investment ────────────────────────────────────────── */
export interface Investment {
  id: number; name: string; ticker_symbol: string | null;
  investment_type: string; quantity: number; buy_price: number;
  buy_date: string; interest_rate: number | null; maturity_date: string | null;
  invested_value: number; created_at: string;
}

export interface InvestmentSearchResult {
  symbol: string; name: string; type: string; exchange: string;
}

export const investment = {
  search: (q: string) => request<InvestmentSearchResult[]>(`/investment/search?q=${encodeURIComponent(q)}`),
  list: () => request<Investment[]>("/investment/"),
  add: (data: Partial<Investment>) => request<Investment>("/investment/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Investment>) =>
    request<Investment>(`/investment/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: number) => request<void>(`/investment/${id}`, { method: "DELETE" }),
};

/* ── Loan ──────────────────────────────────────────────── */
export interface Loan {
  id: number; loan_name: string; loan_type: string;
  principal_amount: number; outstanding_balance: number;
  interest_rate: number; tenure_months: number; emi_amount: number;
  start_date: string; is_active: number; created_at: string;
}

export const loan = {
  list: () => request<Loan[]>("/loan/"),
  add: (data: Partial<Loan>) => request<Loan>("/loan/", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Loan>) =>
    request<Loan>(`/loan/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: number) => request<void>(`/loan/${id}`, { method: "DELETE" }),
};

/* ── Portfolio ─────────────────────────────────────────── */
export interface HoldingDetail {
  investment_id: number; name: string; ticker_symbol: string | null;
  investment_type: string; quantity: number; buy_price: number;
  current_price: number; invested_value: number; current_value: number;
  profit_loss: number; profit_loss_pct: number;
}

export interface PortfolioSummary {
  total_invested: number; total_current_value: number;
  total_profit_loss: number; total_profit_loss_pct: number;
  holdings_count: number; holdings: HoldingDetail[];
}

export interface AllocationItem {
  asset_type: string; invested_value: number;
  current_value: number; allocation_pct: number;
}

export interface AssetAllocation {
  total_value: number; allocations: AllocationItem[];
}

export const portfolio = {
  summary: () => request<PortfolioSummary>("/portfolio/summary"),
  allocation: () => request<AssetAllocation>("/portfolio/allocation"),
};

/* ── Metrics ───────────────────────────────────────────── */
export interface SavingsRate {
  total_monthly_income: number; total_monthly_expenses: number;
  monthly_savings: number; savings_rate_pct: number; rating: string;
}

export interface DebtToIncome {
  total_monthly_emi: number; total_monthly_income: number;
  dti_ratio_pct: number; rating: string;
}

export interface Diversification {
  unique_asset_types: number; total_holdings: number;
  largest_allocation_pct: number; diversification_score: number; rating: string;
}

export interface RiskLevel {
  equity_pct: number; debt_pct: number; dti_ratio: number;
  savings_rate: number; risk_score: number; risk_level: string;
}

export interface FullReport {
  savings: SavingsRate; debt_to_income: DebtToIncome;
  diversification: Diversification; risk: RiskLevel;
  ai_ready: boolean; ai_summary_placeholder: string;
}

export const metrics = {
  savingsRate: () => request<SavingsRate>("/metrics/savings-rate"),
  debtToIncome: () => request<DebtToIncome>("/metrics/debt-to-income"),
  diversification: () => request<Diversification>("/metrics/diversification"),
  riskLevel: () => request<RiskLevel>("/metrics/risk-level"),
  fullReport: () => request<FullReport>("/metrics/full-report"),
  aiAdvice: () => request<{ status: string; message: string; generated_prompt: string }>("/metrics/ai-advice"),
};

/* ── Simulation ────────────────────────────────────────── */
export interface CompoundGrowthResult {
  principal: number; annual_rate: number; years: number;
  compounding_frequency: number; future_value: number;
  total_interest_earned: number;
  yearly_breakdown: { year: number; value: number; interest_earned: number }[];
}

export interface MonthlyInvestmentResult {
  monthly_amount: number; annual_return: number; years: number;
  initial_investment: number; total_invested: number;
  future_value: number; total_returns: number;
  yearly_breakdown: { year: number; invested: number; value: number; returns: number }[];
}

export interface LoanPayoffResult {
  principal: number; annual_rate: number; tenure_months: number;
  calculated_emi: number; total_payment: number; total_interest: number;
  extra_monthly_payment: number; months_saved: number; interest_saved: number;
  schedule: { month: number; emi: number; principal_component: number; interest_component: number; remaining_balance: number }[];
}

export const simulation = {
  compoundGrowth: (data: { principal: number; annual_rate: number; years: number; compounding_frequency?: number }) =>
    request<CompoundGrowthResult>("/simulation/compound-growth", { method: "POST", body: JSON.stringify(data) }),
  monthlyInvestment: (data: { monthly_amount: number; annual_return: number; years: number; initial_investment?: number }) =>
    request<MonthlyInvestmentResult>("/simulation/monthly-investment", { method: "POST", body: JSON.stringify(data) }),
  loanPayoff: (data: { principal: number; annual_rate: number; tenure_months: number; extra_monthly_payment?: number }) =>
    request<LoanPayoffResult>("/simulation/loan-payoff", { method: "POST", body: JSON.stringify(data) }),
};

/* ── AI Chat ───────────────────────────────────────────── */
export interface AiChatMessage { role: "user" | "assistant"; content: string; }

export interface AiChatResponse {
  response: string; provider: string; model: string | null; context_summary: string;
}

export const ai = {
  chat: (message: string, history: AiChatMessage[] = []) =>
    request<AiChatResponse>("/ai/chat", { method: "POST", body: JSON.stringify({ message, history }) }),
};
