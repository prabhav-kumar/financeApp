"use client";
/**
 * Simulation Page — Compound growth, SIP projection, loan payoff
 */

import React, { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Legend,
} from "recharts";
import { TrendingUp, Calculator, Landmark, Play } from "lucide-react";
import {
  simulation as simApi,
  type CompoundGrowthResult,
  type MonthlyInvestmentResult,
  type LoanPayoffResult,
} from "@/lib/api";
import { formatCurrency } from "@/lib/helpers";

type Tab = "sip" | "compound" | "loan";

export default function SimulationPage() {
  const [tab, setTab] = useState<Tab>("sip");

  // SIP form
  const [sipForm, setSipForm] = useState({ monthly: "10000", rate: "12", years: "15", initial: "0" });
  const [sipResult, setSipResult] = useState<MonthlyInvestmentResult | null>(null);

  // Compound form
  const [compForm, setCompForm] = useState({ principal: "100000", rate: "12", years: "10", freq: "12" });
  const [compResult, setCompResult] = useState<CompoundGrowthResult | null>(null);

  // Loan form
  const [loanForm, setLoanForm] = useState({ principal: "5000000", rate: "8.5", months: "240", extra: "0" });
  const [loanResult, setLoanResult] = useState<LoanPayoffResult | null>(null);

  const [loading, setLoading] = useState(false);

  const runSIP = async () => {
    setLoading(true);
    try {
      const res = await simApi.monthlyInvestment({
        monthly_amount: parseFloat(sipForm.monthly),
        annual_return: parseFloat(sipForm.rate),
        years: parseInt(sipForm.years),
        initial_investment: parseFloat(sipForm.initial) || 0,
      });
      setSipResult(res);
    } catch { /* empty */ }
    setLoading(false);
  };

  const runCompound = async () => {
    setLoading(true);
    try {
      const res = await simApi.compoundGrowth({
        principal: parseFloat(compForm.principal),
        annual_rate: parseFloat(compForm.rate),
        years: parseInt(compForm.years),
        compounding_frequency: parseInt(compForm.freq),
      });
      setCompResult(res);
    } catch { /* empty */ }
    setLoading(false);
  };

  const runLoan = async () => {
    setLoading(true);
    try {
      const res = await simApi.loanPayoff({
        principal: parseFloat(loanForm.principal),
        annual_rate: parseFloat(loanForm.rate),
        tenure_months: parseInt(loanForm.months),
        extra_monthly_payment: parseFloat(loanForm.extra) || 0,
      });
      setLoanResult(res);
    } catch { /* empty */ }
    setLoading(false);
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "sip", label: "SIP / Monthly Investment", icon: TrendingUp },
    { key: "compound", label: "Compound Growth", icon: Calculator },
    { key: "loan", label: "Loan Payoff", icon: Landmark },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
          Simulation Engine
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Project your financial future with powerful calculators
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2 animate-fade-in" style={{ animationDelay: "100ms" }}>
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
              style={{
                background: active ? "rgba(99,102,241,0.15)" : "transparent",
                color: active ? "var(--accent-primary-light)" : "var(--text-secondary)",
                border: `1px solid ${active ? "var(--border-glow)" : "var(--border-color)"}`,
              }}>
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── SIP Tab ────────────────────────────────────── */}
      {tab === "sip" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-5" style={{ color: "var(--text-primary)" }}>
              SIP Parameters
            </h3>
            <div className="space-y-4">
              <div>
                <label className="label">Monthly Investment (₹)</label>
                <input type="number" className="input-field" value={sipForm.monthly}
                  onChange={(e) => setSipForm({ ...sipForm, monthly: e.target.value })} />
              </div>
              <div>
                <label className="label">Expected Annual Return (%)</label>
                <input type="number" step="0.1" className="input-field" value={sipForm.rate}
                  onChange={(e) => setSipForm({ ...sipForm, rate: e.target.value })} />
              </div>
              <div>
                <label className="label">Investment Period (Years)</label>
                <input type="number" className="input-field" value={sipForm.years}
                  onChange={(e) => setSipForm({ ...sipForm, years: e.target.value })} />
              </div>
              <div>
                <label className="label">Initial Lump Sum (₹)</label>
                <input type="number" className="input-field" value={sipForm.initial}
                  onChange={(e) => setSipForm({ ...sipForm, initial: e.target.value })} />
              </div>
              <button onClick={runSIP} disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2">
                <Play size={16} /> Run Simulation
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {sipResult && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="glass-card p-4 text-center">
                    <p className="stat-label">Total Invested</p>
                    <p className="text-lg font-bold mt-1" style={{ color: "var(--text-primary)" }}>
                      {formatCurrency(sipResult.total_invested)}
                    </p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="stat-label">Future Value</p>
                    <p className="text-lg font-bold mt-1 positive">
                      {formatCurrency(sipResult.future_value)}
                    </p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="stat-label">Wealth Gained</p>
                    <p className="text-lg font-bold mt-1 gradient-text">
                      {formatCurrency(sipResult.total_returns)}
                    </p>
                  </div>
                </div>
                <div className="glass-card p-6">
                  <h4 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                    Growth Projection
                  </h4>
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={sipResult.yearly_breakdown}>
                      <defs>
                        <linearGradient id="sipInvested" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="sipValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                      <XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 12 }}
                        axisLine={{ stroke: "rgba(148,163,184,0.1)" }} label={{ value: "Year", position: "insideBottom", offset: -5, fill: "#64748b" }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }}
                        axisLine={{ stroke: "rgba(148,163,184,0.1)" }}
                        tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                      <Tooltip
                        formatter={(v) => formatCurrency(Number(v))}
                        contentStyle={{
                          background: "var(--bg-card)", border: "1px solid var(--border-color)",
                          borderRadius: "12px", color: "var(--text-primary)",
                        }} />
                      <Area type="monotone" dataKey="invested" name="Invested"
                        stroke="#22d3ee" fill="url(#sipInvested)" strokeWidth={2} />
                      <Area type="monotone" dataKey="value" name="Value"
                        stroke="#6366f1" fill="url(#sipValue)" strokeWidth={2} />
                      <Legend wrapperStyle={{ color: "var(--text-secondary)" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
            {!sipResult && (
              <div className="glass-card p-16 text-center">
                <TrendingUp size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
                <p style={{ color: "var(--text-secondary)" }}>Configure parameters and run the simulation</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Compound Tab ───────────────────────────────── */}
      {tab === "compound" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-5" style={{ color: "var(--text-primary)" }}>
              Compound Growth Parameters
            </h3>
            <div className="space-y-4">
              <div>
                <label className="label">Principal (₹)</label>
                <input type="number" className="input-field" value={compForm.principal}
                  onChange={(e) => setCompForm({ ...compForm, principal: e.target.value })} />
              </div>
              <div>
                <label className="label">Annual Rate (%)</label>
                <input type="number" step="0.1" className="input-field" value={compForm.rate}
                  onChange={(e) => setCompForm({ ...compForm, rate: e.target.value })} />
              </div>
              <div>
                <label className="label">Period (Years)</label>
                <input type="number" className="input-field" value={compForm.years}
                  onChange={(e) => setCompForm({ ...compForm, years: e.target.value })} />
              </div>
              <div>
                <label className="label">Compounding Frequency</label>
                <select className="input-field" value={compForm.freq}
                  onChange={(e) => setCompForm({ ...compForm, freq: e.target.value })}>
                  <option value="1">Yearly</option>
                  <option value="4">Quarterly</option>
                  <option value="12">Monthly</option>
                  <option value="365">Daily</option>
                </select>
              </div>
              <button onClick={runCompound} disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2">
                <Play size={16} /> Calculate
              </button>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            {compResult && (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="glass-card p-4 text-center">
                    <p className="stat-label">Principal</p>
                    <p className="text-lg font-bold mt-1" style={{ color: "var(--text-primary)" }}>
                      {formatCurrency(compResult.principal)}
                    </p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="stat-label">Future Value</p>
                    <p className="text-lg font-bold mt-1 positive">{formatCurrency(compResult.future_value)}</p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="stat-label">Interest Earned</p>
                    <p className="text-lg font-bold mt-1 gradient-text">
                      {formatCurrency(compResult.total_interest_earned)}
                    </p>
                  </div>
                </div>
                <div className="glass-card p-6">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={compResult.yearly_breakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                      <XAxis dataKey="year" tick={{ fill: "#94a3b8", fontSize: 12 }}
                        axisLine={{ stroke: "rgba(148,163,184,0.1)" }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }}
                        axisLine={{ stroke: "rgba(148,163,184,0.1)" }}
                        tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                      <Tooltip formatter={(v) => formatCurrency(Number(v))}
                        contentStyle={{
                          background: "var(--bg-card)", border: "1px solid var(--border-color)",
                          borderRadius: "12px", color: "var(--text-primary)",
                        }} />
                      <Bar dataKey="value" name="Value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Legend wrapperStyle={{ color: "var(--text-secondary)" }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
            {!compResult && (
              <div className="glass-card p-16 text-center">
                <Calculator size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
                <p style={{ color: "var(--text-secondary)" }}>Set parameters and calculate</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Loan Payoff Tab ────────────────────────────── */}
      {tab === "loan" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="glass-card p-6">
            <h3 className="font-semibold mb-5" style={{ color: "var(--text-primary)" }}>
              Loan Payoff Parameters
            </h3>
            <div className="space-y-4">
              <div>
                <label className="label">Loan Amount (₹)</label>
                <input type="number" className="input-field" value={loanForm.principal}
                  onChange={(e) => setLoanForm({ ...loanForm, principal: e.target.value })} />
              </div>
              <div>
                <label className="label">Annual Rate (%)</label>
                <input type="number" step="0.01" className="input-field" value={loanForm.rate}
                  onChange={(e) => setLoanForm({ ...loanForm, rate: e.target.value })} />
              </div>
              <div>
                <label className="label">Tenure (Months)</label>
                <input type="number" className="input-field" value={loanForm.months}
                  onChange={(e) => setLoanForm({ ...loanForm, months: e.target.value })} />
              </div>
              <div>
                <label className="label">Extra Payment / Month (₹)</label>
                <input type="number" className="input-field" value={loanForm.extra}
                  onChange={(e) => setLoanForm({ ...loanForm, extra: e.target.value })} />
              </div>
              <button onClick={runLoan} disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2">
                <Play size={16} /> Analyse
              </button>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-6">
            {loanResult && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="glass-card p-4 text-center">
                    <p className="stat-label">EMI</p>
                    <p className="text-base font-bold mt-1" style={{ color: "var(--text-primary)" }}>
                      {formatCurrency(loanResult.calculated_emi)}
                    </p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="stat-label">Total Interest</p>
                    <p className="text-base font-bold mt-1 negative">
                      {formatCurrency(loanResult.total_interest)}
                    </p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="stat-label">Months Saved</p>
                    <p className="text-base font-bold mt-1 positive">{loanResult.months_saved}</p>
                  </div>
                  <div className="glass-card p-4 text-center">
                    <p className="stat-label">Interest Saved</p>
                    <p className="text-base font-bold mt-1 positive">
                      {formatCurrency(loanResult.interest_saved)}
                    </p>
                  </div>
                </div>
                <div className="glass-card p-6">
                  <h4 className="font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                    Amortization Overview
                  </h4>
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={loanResult.schedule.filter((_, i) => i % 3 === 0)}>
                      <defs>
                        <linearGradient id="loanBal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                      <XAxis dataKey="month" tick={{ fill: "#94a3b8", fontSize: 12 }}
                        axisLine={{ stroke: "rgba(148,163,184,0.1)" }}
                        label={{ value: "Month", position: "insideBottom", offset: -5, fill: "#64748b" }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }}
                        axisLine={{ stroke: "rgba(148,163,184,0.1)" }}
                        tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                      <Tooltip formatter={(v) => formatCurrency(Number(v))}
                        contentStyle={{
                          background: "var(--bg-card)", border: "1px solid var(--border-color)",
                          borderRadius: "12px", color: "var(--text-primary)",
                        }} />
                      <Area type="monotone" dataKey="remaining_balance" name="Balance"
                        stroke="#ef4444" fill="url(#loanBal)" strokeWidth={2} />
                      <Legend wrapperStyle={{ color: "var(--text-secondary)" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
            {!loanResult && (
              <div className="glass-card p-16 text-center">
                <Landmark size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
                <p style={{ color: "var(--text-secondary)" }}>Enter loan details and analyse payoff</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
