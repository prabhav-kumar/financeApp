"use client";

import React, { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  Wallet, TrendingUp, TrendingDown, PieChart as PieIcon, Activity,
  DollarSign, ShieldCheck, Shield, Target, Umbrella, PiggyBank, BarChart2,
} from "lucide-react";
import StatCard from "@/components/StatCard";
import {
  portfolio as portfolioApi, metrics as metricsApi, expense as expenseApi,
  emergencyFund as efApi, goals as goalsApi, retirement as retirementApi,
  insurance as insuranceApi, budget as budgetApi,
  type PortfolioSummary, type AssetAllocation, type FullReport, type Expense,
  type EmergencyFund, type FinancialGoal, type RetirementSummary, type InsuranceSummary, type BudgetSummary,
} from "@/lib/api";
import { formatCurrency, CHART_COLORS, ratingBadge, investmentTypeLabel } from "@/lib/helpers";
import { useAuth } from "@/lib/auth-context";

const TOOLTIP_STYLE = {
  background: "var(--bg-card)", border: "1px solid var(--border)",
  borderRadius: "var(--r-md)", color: "var(--text-primary)", fontSize: 13,
};

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [allocation, setAllocation] = useState<AssetAllocation | null>(null);
  const [report, setReport] = useState<FullReport | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [emergencyFunds, setEmergencyFunds] = useState<EmergencyFund[]>([]);
  const [activeGoals, setActiveGoals] = useState<FinancialGoal[]>([]);
  const [retirementSummary, setRetirementSummary] = useState<RetirementSummary | null>(null);
  const [insuranceSummary, setInsuranceSummary] = useState<InsuranceSummary | null>(null);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const month = currentMonth();
    Promise.allSettled([
      portfolioApi.summary(), portfolioApi.allocation(),
      metricsApi.fullReport(), expenseApi.list(),
      efApi.list(), goalsApi.list(),
      retirementApi.summary(), insuranceApi.summary(),
      budgetApi.summary(month),
    ]).then(([p, a, r, e, ef, g, ret, ins, bud]) => {
      if (p.status === "fulfilled") setPortfolio(p.value);
      if (a.status === "fulfilled") setAllocation(a.value);
      if (r.status === "fulfilled") setReport(r.value);
      if (e.status === "fulfilled") setExpenses(e.value);
      if (ef.status === "fulfilled") setEmergencyFunds(ef.value);
      if (g.status === "fulfilled") setActiveGoals((g.value as FinancialGoal[]).filter((x) => x.status === "active"));
      if (ret.status === "fulfilled") setRetirementSummary(ret.value);
      if (ins.status === "fulfilled") setInsuranceSummary(ins.value);
      if (bud.status === "fulfilled") setBudgetSummary(bud.value);
      setLoading(false);
    });
  }, []);

  const expenseByCategory = expenses.reduce((acc, e) => {
    if (e.is_active === 1) acc[e.category] = (acc[e.category] || 0) + e.monthly_amount;
    return acc;
  }, {} as Record<string, number>);

  const expenseChartData = Object.entries(expenseByCategory).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1), value: Math.round(value),
  }));

  const allocationChartData = allocation?.allocations.map((a) => ({
    name: investmentTypeLabel(a.asset_type), value: Math.round(a.current_value),
  })) || [];

  const budgetChartData = budgetSummary
    ? Object.entries(budgetSummary.category_breakdown).slice(0, 6).map(([cat, data]) => ({
        name: cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, " "),
        Budgeted: Math.round(data.budgeted),
        Actual: Math.round(data.actual),
      }))
    : [];

  const goalsChartData = activeGoals.slice(0, 5).map((g) => ({
    name: g.goal_name.length > 12 ? g.goal_name.slice(0, 12) + "…" : g.goal_name,
    Progress: Math.round(g.progress_pct),
  }));

  const totalEfCurrent = emergencyFunds.reduce((s, f) => s + f.current_amount, 0);
  const totalEfTarget = emergencyFunds.reduce((s, f) => s + f.target_amount, 0);
  const efProgress = totalEfTarget > 0 ? Math.min(totalEfCurrent / totalEfTarget * 100, 100) : 0;

  const pl = portfolio?.total_profit_loss ?? 0;
  const isProfit = pl >= 0;

  const Sk = ({ h = 20, w = "100%" }: { h?: number; w?: string }) => (
    <div className="skeleton" style={{ height: h, width: w }} />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div className="fade-up">
        <h1 className="page-title">
          Welcome back, <span className="gradient-text">{user?.full_name?.split(" ")[0]}</span>
        </h1>
        <p className="page-subtitle">Here&apos;s your complete financial overview</p>
      </div>

      {/* Top stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card card-p" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Sk h={36} w="40px" /><Sk h={28} w="60%" /><Sk h={14} w="40%" />
            </div>
          ))
        ) : (
          <>
            <StatCard label="Portfolio Value" value={formatCurrency(portfolio?.total_current_value ?? 0)}
              icon={Wallet} iconColor="#6366f1" delay={0} />
            <StatCard label="Total Invested" value={formatCurrency(portfolio?.total_invested ?? 0)}
              icon={DollarSign} iconColor="#14b8a6" delay={60} />
            <StatCard
              label="Profit / Loss"
              value={`${isProfit ? "+" : ""}${formatCurrency(pl)}`}
              icon={isProfit ? TrendingUp : TrendingDown}
              trend={`${isProfit ? "+" : ""}${portfolio?.total_profit_loss_pct?.toFixed(1) ?? 0}%`}
              trendUp={isProfit}
              iconColor={isProfit ? "#10b981" : "#ef4444"}
              delay={120}
            />
            <StatCard
              label="Risk Level"
              value={report?.risk.risk_level?.replace("_", " ").toUpperCase() ?? "—"}
              icon={ShieldCheck}
              trend={`Score: ${report?.risk.risk_score ?? 0}`}
              trendUp={(report?.risk.risk_score ?? 50) < 50}
              iconColor="#a855f7"
              delay={180}
            />
          </>
        )}
      </div>

      {/* Charts row 1 — Portfolio + Expenses */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        <div className="card card-p fade-up" style={{ animationDelay: "200ms", animationFillMode: "both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div className="icon-box" style={{ width: 34, height: 34, background: "rgba(99,102,241,0.1)" }}>
              <PieIcon size={16} style={{ color: "var(--indigo)" }} />
            </div>
            <h3 style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>Asset Allocation</h3>
          </div>
          {allocationChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={allocationChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value" stroke="none">
                  {allocationChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ color: "var(--text-secondary)", fontSize: 12, paddingTop: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: "40px 0" }}>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Add investments to see allocation</p>
            </div>
          )}
        </div>

        <div className="card card-p fade-up" style={{ animationDelay: "260ms", animationFillMode: "both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div className="icon-box" style={{ width: 34, height: 34, background: "rgba(239,68,68,0.1)" }}>
              <Activity size={16} style={{ color: "var(--red)" }} />
            </div>
            <h3 style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>Expense Breakdown</h3>
          </div>
          {expenseChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={expenseChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value" stroke="none">
                  {expenseChartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ color: "var(--text-secondary)", fontSize: 12, paddingTop: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: "40px 0" }}>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Add expenses to see breakdown</p>
            </div>
          )}
        </div>
      </div>

      {/* Metrics row */}
      {report && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }} className="fade-up">
          <div className="card card-p">
            <p className="stat-lbl" style={{ marginBottom: 8 }}>Savings Rate</p>
            <p className="stat-val" style={{ marginBottom: 10 }}>{report.savings.savings_rate_pct.toFixed(1)}%</p>
            <span className={ratingBadge(report.savings.rating)}>{report.savings.rating}</span>
          </div>
          <div className="card card-p">
            <p className="stat-lbl" style={{ marginBottom: 8 }}>Debt-to-Income</p>
            <p className="stat-val" style={{ marginBottom: 10 }}>{report.debt_to_income.dti_ratio_pct.toFixed(1)}%</p>
            <span className={ratingBadge(report.debt_to_income.rating)}>{report.debt_to_income.rating.replace("_", " ")}</span>
          </div>
          <div className="card card-p">
            <p className="stat-lbl" style={{ marginBottom: 8 }}>Diversification</p>
            <p className="stat-val" style={{ marginBottom: 10 }}>{report.diversification.diversification_score.toFixed(0)}/100</p>
            <span className={ratingBadge(report.diversification.rating)}>{report.diversification.rating.replace("_", " ")}</span>
          </div>
          <div className="card card-p">
            <p className="stat-lbl" style={{ marginBottom: 12 }}>Monthly Overview</p>
            <ResponsiveContainer width="100%" height={90}>
              <BarChart data={[{ name: "Monthly", Income: Math.round(report.savings.total_monthly_income), Expenses: Math.round(report.savings.total_monthly_expenses) }]} barGap={6}>
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={TOOLTIP_STYLE} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* New modules row — Emergency Fund + Insurance + Retirement */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }} className="fade-up">
        {/* Emergency Fund */}
        <div className="card card-p">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div className="icon-box" style={{ width: 34, height: 34, background: "rgba(16,185,129,0.1)" }}>
              <Shield size={16} style={{ color: "var(--green)" }} />
            </div>
            <h3 style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>Emergency Fund</h3>
          </div>
          {emergencyFunds.length > 0 ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{formatCurrency(totalEfCurrent)} saved</span>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Goal: {formatCurrency(totalEfTarget)}</span>
              </div>
              <div style={{ height: 8, background: "var(--bg-hover)", borderRadius: 4, overflow: "hidden", marginBottom: 6 }}>
                <div style={{ width: `${efProgress}%`, height: "100%", background: efProgress >= 100 ? "var(--green)" : "var(--indigo-light)", borderRadius: 4, transition: "width 0.5s" }} />
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{efProgress.toFixed(0)}% funded · {emergencyFunds.length} fund{emergencyFunds.length > 1 ? "s" : ""}</p>
            </>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No emergency fund set up yet</p>
          )}
        </div>

        {/* Insurance */}
        <div className="card card-p">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div className="icon-box" style={{ width: 34, height: 34, background: "rgba(168,85,247,0.1)" }}>
              <Umbrella size={16} style={{ color: "#a855f7" }} />
            </div>
            <h3 style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>Insurance</h3>
          </div>
          {insuranceSummary && insuranceSummary.active_policies > 0 ? (
            <>
              <p className="stat-val" style={{ marginBottom: 4 }}>{formatCurrency(insuranceSummary.total_coverage)}</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>total coverage</p>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-secondary)" }}>
                <span>{insuranceSummary.active_policies} active policies</span>
                <span>{formatCurrency(insuranceSummary.total_monthly_premium)}/mo premium</span>
              </div>
            </>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No insurance policies added</p>
          )}
        </div>

        {/* Retirement */}
        <div className="card card-p">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div className="icon-box" style={{ width: 34, height: 34, background: "rgba(20,184,166,0.1)" }}>
              <PiggyBank size={16} style={{ color: "var(--teal)" }} />
            </div>
            <h3 style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>Retirement</h3>
          </div>
          {retirementSummary && retirementSummary.total_current_corpus > 0 ? (
            <>
              <p className="stat-val" style={{ marginBottom: 4 }}>{formatCurrency(retirementSummary.total_current_corpus)}</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>current corpus</p>
              {retirementSummary.readiness_pct != null && (
                <>
                  <div style={{ height: 6, background: "var(--bg-hover)", borderRadius: 3, overflow: "hidden", marginBottom: 4 }}>
                    <div style={{ width: `${retirementSummary.readiness_pct}%`, height: "100%", background: retirementSummary.readiness_pct >= 80 ? "var(--green)" : retirementSummary.readiness_pct >= 50 ? "var(--amber)" : "var(--red)", borderRadius: 3 }} />
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{retirementSummary.readiness_pct.toFixed(0)}% retirement readiness</p>
                </>
              )}
              <p style={{ fontSize: 12, color: "var(--indigo-light)", marginTop: 4 }}>
                Projected: {formatCurrency(retirementSummary.projected_total_corpus)}
              </p>
            </>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No retirement plans added</p>
          )}
        </div>
      </div>

      {/* Charts row 2 — Budget vs Actual + Goals Progress */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }} className="fade-up">
        {/* Budget vs Actual */}
        <div className="card card-p">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div className="icon-box" style={{ width: 34, height: 34, background: "rgba(99,102,241,0.1)" }}>
              <BarChart2 size={16} style={{ color: "var(--indigo-light)" }} />
            </div>
            <div>
              <h3 style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>Budget vs Actual</h3>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{currentMonth()}</p>
            </div>
          </div>
          {budgetChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={budgetChartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--text-muted)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ color: "var(--text-secondary)", fontSize: 11 }} />
                <Bar dataKey="Budgeted" fill={CHART_COLORS[0]} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Actual" fill={CHART_COLORS[2]} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: "30px 0" }}>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No budget data for this month</p>
            </div>
          )}
        </div>

        {/* Financial Goals */}
        <div className="card card-p">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div className="icon-box" style={{ width: 34, height: 34, background: "rgba(245,158,11,0.1)" }}>
              <Target size={16} style={{ color: "var(--amber)" }} />
            </div>
            <h3 style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>Financial Goals</h3>
          </div>
          {activeGoals.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activeGoals.slice(0, 4).map((g) => (
                <div key={g.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{g.goal_name}</span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{g.progress_pct.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: 6, background: "var(--bg-hover)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${g.progress_pct}%`, height: "100%", background: g.progress_pct >= 100 ? "var(--green)" : "var(--indigo-light)", borderRadius: 3, transition: "width 0.5s" }} />
                  </div>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {formatCurrency(g.current_amount)} of {formatCurrency(g.target_amount)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "30px 0" }}>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No active goals yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
