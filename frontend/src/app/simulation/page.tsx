"use client";

import React, { useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Legend,
} from "recharts";
import { TrendingUp, Calculator, Landmark, Play } from "lucide-react";
import {
  simulation as simApi,
  type CompoundGrowthResult, type MonthlyInvestmentResult, type LoanPayoffResult,
} from "@/lib/api";
import { formatCurrency } from "@/lib/helpers";

type Tab = "sip" | "compound" | "loan";

const TOOLTIP_STYLE = {
  background: "var(--bg-card)", border: "1px solid var(--border)",
  borderRadius: "var(--r-md)", color: "var(--text-primary)", fontSize: 13,
};

export default function SimulationPage() {
  const [tab, setTab] = useState<Tab>("sip");
  const [loading, setLoading] = useState(false);

  const [sipForm, setSipForm] = useState({ monthly: "10000", rate: "12", years: "15", initial: "0" });
  const [sipResult, setSipResult] = useState<MonthlyInvestmentResult | null>(null);

  const [compForm, setCompForm] = useState({ principal: "100000", rate: "12", years: "10", freq: "12" });
  const [compResult, setCompResult] = useState<CompoundGrowthResult | null>(null);

  const [loanForm, setLoanForm] = useState({ principal: "5000000", rate: "8.5", months: "240", extra: "0" });
  const [loanResult, setLoanResult] = useState<LoanPayoffResult | null>(null);

  const runSIP = async () => {
    setLoading(true);
    try {
      setSipResult(await simApi.monthlyInvestment({
        monthly_amount: parseFloat(sipForm.monthly), annual_return: parseFloat(sipForm.rate),
        years: parseInt(sipForm.years), initial_investment: parseFloat(sipForm.initial) || 0,
      }));
    } catch { /* empty */ }
    setLoading(false);
  };

  const runCompound = async () => {
    setLoading(true);
    try {
      setCompResult(await simApi.compoundGrowth({
        principal: parseFloat(compForm.principal), annual_rate: parseFloat(compForm.rate),
        years: parseInt(compForm.years), compounding_frequency: parseInt(compForm.freq),
      }));
    } catch { /* empty */ }
    setLoading(false);
  };

  const runLoan = async () => {
    setLoading(true);
    try {
      setLoanResult(await simApi.loanPayoff({
        principal: parseFloat(loanForm.principal), annual_rate: parseFloat(loanForm.rate),
        tenure_months: parseInt(loanForm.months), extra_monthly_payment: parseFloat(loanForm.extra) || 0,
      }));
    } catch { /* empty */ }
    setLoading(false);
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "sip", label: "SIP / Monthly Investment", icon: TrendingUp },
    { key: "compound", label: "Compound Growth", icon: Calculator },
    { key: "loan", label: "Loan Payoff", icon: Landmark },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div className="fade-up">
        <h1 className="page-title">Simulation Engine</h1>
        <p className="page-subtitle">Project your financial future with powerful calculators</p>
      </div>

      {/* Tab bar */}
      <div style={{ overflowX: "auto", paddingBottom: 4 }} className="fade-up">
        <div className="tab-bar" style={{ width: "fit-content" }}>
          {tabs.map(({ key, label, icon: Icon }) => (
            <button key={key} className={`tab-item ${tab === key ? "active" : ""}`} onClick={() => setTab(key)}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* SIP Tab */}
      {tab === "sip" && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }} className="fade-in sim-grid">
          <div className="card card-p" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", marginBottom: 4 }}>SIP Parameters</h3>
            <div>
              <label className="label">Monthly Investment (₹)</label>
              <input type="number" className="input" value={sipForm.monthly}
                onChange={(e) => setSipForm({ ...sipForm, monthly: e.target.value })} />
            </div>
            <div>
              <label className="label">Expected Annual Return (%)</label>
              <input type="number" step="0.1" className="input" value={sipForm.rate}
                onChange={(e) => setSipForm({ ...sipForm, rate: e.target.value })} />
            </div>
            <div>
              <label className="label">Investment Period (Years)</label>
              <input type="number" className="input" value={sipForm.years}
                onChange={(e) => setSipForm({ ...sipForm, years: e.target.value })} />
            </div>
            <div>
              <label className="label">Initial Lump Sum (₹)</label>
              <input type="number" className="input" value={sipForm.initial}
                onChange={(e) => setSipForm({ ...sipForm, initial: e.target.value })} />
            </div>
            <button className="btn btn-primary" onClick={runSIP} disabled={loading} style={{ marginTop: 4 }}>
              <Play size={14} /> Run Simulation
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {sipResult ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {[
                    { label: "Total Invested", val: formatCurrency(sipResult.total_invested), cls: "" },
                    { label: "Future Value", val: formatCurrency(sipResult.future_value), cls: "positive" },
                    { label: "Wealth Gained", val: formatCurrency(sipResult.total_returns), cls: "gradient-text" },
                  ].map(({ label, val, cls }) => (
                    <div key={label} className="card card-p" style={{ textAlign: "center" }}>
                      <p className="stat-lbl" style={{ marginBottom: 6 }}>{label}</p>
                      <p className={`stat-val ${cls}`} style={{ fontSize: 16 }}>{val}</p>
                    </div>
                  ))}
                </div>
                <div className="card card-p">
                  <h4 style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", marginBottom: 16 }}>Growth Projection</h4>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={sipResult.yearly_breakdown}>
                      <defs>
                        <linearGradient id="sipInv" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#14b8a6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="sipVal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false}
                        tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={TOOLTIP_STYLE} />
                      <Area type="monotone" dataKey="invested" name="Invested" stroke="#14b8a6" fill="url(#sipInv)" strokeWidth={2} />
                      <Area type="monotone" dataKey="value" name="Value" stroke="#6366f1" fill="url(#sipVal)" strokeWidth={2} />
                      <Legend wrapperStyle={{ color: "var(--text-secondary)", fontSize: 12 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="card empty-state">
                <TrendingUp size={40} style={{ color: "var(--text-muted)" }} />
                <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Configure parameters and run the simulation</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compound Tab */}
      {tab === "compound" && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }} className="fade-in sim-grid">
          <div className="card card-p" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", marginBottom: 4 }}>Compound Parameters</h3>
            <div>
              <label className="label">Principal (₹)</label>
              <input type="number" className="input" value={compForm.principal}
                onChange={(e) => setCompForm({ ...compForm, principal: e.target.value })} />
            </div>
            <div>
              <label className="label">Annual Rate (%)</label>
              <input type="number" step="0.1" className="input" value={compForm.rate}
                onChange={(e) => setCompForm({ ...compForm, rate: e.target.value })} />
            </div>
            <div>
              <label className="label">Period (Years)</label>
              <input type="number" className="input" value={compForm.years}
                onChange={(e) => setCompForm({ ...compForm, years: e.target.value })} />
            </div>
            <div>
              <label className="label">Compounding Frequency</label>
              <select className="input" value={compForm.freq}
                onChange={(e) => setCompForm({ ...compForm, freq: e.target.value })}>
                <option value="1">Yearly</option>
                <option value="4">Quarterly</option>
                <option value="12">Monthly</option>
                <option value="365">Daily</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={runCompound} disabled={loading} style={{ marginTop: 4 }}>
              <Play size={14} /> Calculate
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {compResult ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                  {[
                    { label: "Principal", val: formatCurrency(compResult.principal), cls: "" },
                    { label: "Future Value", val: formatCurrency(compResult.future_value), cls: "positive" },
                    { label: "Interest Earned", val: formatCurrency(compResult.total_interest_earned), cls: "gradient-text" },
                  ].map(({ label, val, cls }) => (
                    <div key={label} className="card card-p" style={{ textAlign: "center" }}>
                      <p className="stat-lbl" style={{ marginBottom: 6 }}>{label}</p>
                      <p className={`stat-val ${cls}`} style={{ fontSize: 16 }}>{val}</p>
                    </div>
                  ))}
                </div>
                <div className="card card-p">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={compResult.yearly_breakdown}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false}
                        tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="value" name="Value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Legend wrapperStyle={{ color: "var(--text-secondary)", fontSize: 12 }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="card empty-state">
                <Calculator size={40} style={{ color: "var(--text-muted)" }} />
                <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Set parameters and calculate</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loan Payoff Tab */}
      {tab === "loan" && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }} className="fade-in sim-grid">
          <div className="card card-p" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <h3 style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", marginBottom: 4 }}>Loan Parameters</h3>
            <div>
              <label className="label">Loan Amount (₹)</label>
              <input type="number" className="input" value={loanForm.principal}
                onChange={(e) => setLoanForm({ ...loanForm, principal: e.target.value })} />
            </div>
            <div>
              <label className="label">Annual Rate (%)</label>
              <input type="number" step="0.01" className="input" value={loanForm.rate}
                onChange={(e) => setLoanForm({ ...loanForm, rate: e.target.value })} />
            </div>
            <div>
              <label className="label">Tenure (Months)</label>
              <input type="number" className="input" value={loanForm.months}
                onChange={(e) => setLoanForm({ ...loanForm, months: e.target.value })} />
            </div>
            <div>
              <label className="label">Extra Payment / Month (₹)</label>
              <input type="number" className="input" value={loanForm.extra}
                onChange={(e) => setLoanForm({ ...loanForm, extra: e.target.value })} />
            </div>
            <button className="btn btn-primary" onClick={runLoan} disabled={loading} style={{ marginTop: 4 }}>
              <Play size={14} /> Analyse
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {loanResult ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
                  {[
                    { label: "EMI", val: formatCurrency(loanResult.calculated_emi), cls: "" },
                    { label: "Total Interest", val: formatCurrency(loanResult.total_interest), cls: "negative" },
                    { label: "Months Saved", val: String(loanResult.months_saved), cls: "positive" },
                    { label: "Interest Saved", val: formatCurrency(loanResult.interest_saved), cls: "positive" },
                  ].map(({ label, val, cls }) => (
                    <div key={label} className="card card-p" style={{ textAlign: "center" }}>
                      <p className="stat-lbl" style={{ marginBottom: 6 }}>{label}</p>
                      <p className={`stat-val ${cls}`} style={{ fontSize: 16 }}>{val}</p>
                    </div>
                  ))}
                </div>
                <div className="card card-p">
                  <h4 style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", marginBottom: 16 }}>Amortization Overview</h4>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={loanResult.schedule.filter((_, i) => i % 3 === 0)}>
                      <defs>
                        <linearGradient id="loanBal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                          <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false}
                        tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={TOOLTIP_STYLE} />
                      <Area type="monotone" dataKey="remaining_balance" name="Balance"
                        stroke="#ef4444" fill="url(#loanBal)" strokeWidth={2} />
                      <Legend wrapperStyle={{ color: "var(--text-secondary)", fontSize: 12 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="card empty-state">
                <Landmark size={40} style={{ color: "var(--text-muted)" }} />
                <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Enter loan details and analyse payoff</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .sim-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
