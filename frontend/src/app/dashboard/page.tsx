"use client";

import React, { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { Wallet, TrendingUp, TrendingDown, PieChart as PieIcon, Activity, DollarSign, ShieldCheck } from "lucide-react";
import StatCard from "@/components/StatCard";
import {
  portfolio as portfolioApi, metrics as metricsApi, expense as expenseApi,
  type PortfolioSummary, type AssetAllocation, type FullReport, type Expense,
} from "@/lib/api";
import { formatCurrency, CHART_COLORS, ratingBadge, investmentTypeLabel } from "@/lib/helpers";
import { useAuth } from "@/lib/auth-context";

const TOOLTIP_STYLE = {
  background: "var(--bg-card)", border: "1px solid var(--border)",
  borderRadius: "var(--r-md)", color: "var(--text-primary)", fontSize: 13,
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [allocation, setAllocation] = useState<AssetAllocation | null>(null);
  const [report, setReport] = useState<FullReport | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      portfolioApi.summary(), portfolioApi.allocation(),
      metricsApi.fullReport(), expenseApi.list(),
    ]).then(([p, a, r, e]) => {
      if (p.status === "fulfilled") setPortfolio(p.value);
      if (a.status === "fulfilled") setAllocation(a.value);
      if (r.status === "fulfilled") setReport(r.value);
      if (e.status === "fulfilled") setExpenses(e.value);
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

  const Sk = ({ h = 20, w = "100%" }: { h?: number; w?: string }) => (
    <div className="skeleton" style={{ height: h, width: w }} />
  );

  const pl = portfolio?.total_profit_loss ?? 0;
  const isProfit = pl >= 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div className="fade-up">
        <h1 className="page-title">
          Welcome back, <span className="gradient-text">{user?.full_name?.split(" ")[0]}</span>
        </h1>
        <p className="page-subtitle">Here&apos;s your financial overview</p>
      </div>

      {/* Stat cards */}
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

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        {/* Asset Allocation */}
        <div className="card card-p fade-up" style={{ animationDelay: "200ms", animationFillMode: "both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div className="icon-box" style={{ width: 34, height: 34, background: "rgba(99,102,241,0.1)" }}>
              <PieIcon size={16} style={{ color: "var(--indigo)" }} />
            </div>
            <h3 style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>Asset Allocation</h3>
          </div>
          {allocationChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={allocationChartData} cx="50%" cy="50%"
                  innerRadius={65} outerRadius={100} paddingAngle={3}
                  dataKey="value" stroke="none">
                  {allocationChartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
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

        {/* Expense Breakdown */}
        <div className="card card-p fade-up" style={{ animationDelay: "260ms", animationFillMode: "both" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div className="icon-box" style={{ width: 34, height: 34, background: "rgba(239,68,68,0.1)" }}>
              <Activity size={16} style={{ color: "var(--red)" }} />
            </div>
            <h3 style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>Expense Breakdown</h3>
          </div>
          {expenseChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={expenseChartData} cx="50%" cy="50%"
                  innerRadius={65} outerRadius={100} paddingAngle={3}
                  dataKey="value" stroke="none">
                  {expenseChartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]} />
                  ))}
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}
          className="fade-up">
          {/* Savings Rate */}
          <div className="card card-p">
            <p className="stat-lbl" style={{ marginBottom: 8 }}>Savings Rate</p>
            <p className="stat-val" style={{ marginBottom: 10 }}>{report.savings.savings_rate_pct.toFixed(1)}%</p>
            <span className={ratingBadge(report.savings.rating)}>{report.savings.rating}</span>
          </div>

          {/* DTI */}
          <div className="card card-p">
            <p className="stat-lbl" style={{ marginBottom: 8 }}>Debt-to-Income</p>
            <p className="stat-val" style={{ marginBottom: 10 }}>{report.debt_to_income.dti_ratio_pct.toFixed(1)}%</p>
            <span className={ratingBadge(report.debt_to_income.rating)}>
              {report.debt_to_income.rating.replace("_", " ")}
            </span>
          </div>

          {/* Diversification */}
          <div className="card card-p">
            <p className="stat-lbl" style={{ marginBottom: 8 }}>Diversification</p>
            <p className="stat-val" style={{ marginBottom: 10 }}>{report.diversification.diversification_score.toFixed(0)}/100</p>
            <span className={ratingBadge(report.diversification.rating)}>
              {report.diversification.rating.replace("_", " ")}
            </span>
          </div>

          {/* Monthly overview bar */}
          <div className="card card-p">
            <p className="stat-lbl" style={{ marginBottom: 12 }}>Monthly Overview</p>
            <ResponsiveContainer width="100%" height={90}>
              <BarChart data={[{
                name: "Monthly",
                Income: Math.round(report.savings.total_monthly_income),
                Expenses: Math.round(report.savings.total_monthly_expenses),
              }]} barGap={6}>
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={TOOLTIP_STYLE} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
