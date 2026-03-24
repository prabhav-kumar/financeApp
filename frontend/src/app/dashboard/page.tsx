"use client";
/**
 * Dashboard — Main overview page
 *
 * Shows: portfolio stats, asset allocation pie, expense breakdown,
 * savings rate, risk level, and savings/expenses bar chart.
 */

import React, { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  Wallet, TrendingUp, TrendingDown, PieChart as PieIcon,
  ShieldCheck, Activity, DollarSign,
} from "lucide-react";
import StatCard from "@/components/StatCard";
import {
  portfolio as portfolioApi,
  metrics as metricsApi,
  expense as expenseApi,
  type PortfolioSummary,
  type AssetAllocation,
  type FullReport,
  type Expense,
} from "@/lib/api";
import { formatCurrency, CHART_COLORS, ratingBadge, investmentTypeLabel } from "@/lib/helpers";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { user } = useAuth();
  const [portfolioData, setPortfolioData] = useState<PortfolioSummary | null>(null);
  const [allocation, setAllocation] = useState<AssetAllocation | null>(null);
  const [report, setReport] = useState<FullReport | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      portfolioApi.summary(),
      portfolioApi.allocation(),
      metricsApi.fullReport(),
      expenseApi.list(),
    ]).then(([p, a, r, e]) => {
      if (p.status === "fulfilled") setPortfolioData(p.value);
      if (a.status === "fulfilled") setAllocation(a.value);
      if (r.status === "fulfilled") setReport(r.value);
      if (e.status === "fulfilled") setExpenses(e.value);
      setLoading(false);
    });
  }, []);

  // Group active expenses by category for chart
  const expenseByCategory = expenses.reduce((acc, e) => {
    if (e.is_active === 1) {
      acc[e.category] = (acc[e.category] || 0) + e.monthly_amount;
    }
    return acc;
  }, {} as Record<string, number>);

  const expenseChartData = Object.entries(expenseByCategory).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: Math.round(value),
  }));

  const allocationChartData = allocation?.allocations.map((a) => ({
    name: investmentTypeLabel(a.asset_type),
    value: Math.round(a.current_value),
  })) || [];

  // Skeleton loader
  const Skeleton = ({ h = "20px", w = "100%" }: { h?: string; w?: string }) => (
    <div className="skeleton" style={{ height: h, width: w }} />
  );

  const profitLoss = portfolioData?.total_profit_loss ?? 0;
  const isProfit = profitLoss >= 0;

  return (
    <div className="section-stack">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="section-title" style={{ color: "var(--text-primary)" }}>
          Welcome back, <span className="gradient-text">{user?.full_name?.split(" ")[0]}</span>
        </h1>
        <p className="section-subtitle">Here&apos;s your financial overview</p>
      </div>

      {/* ── Stat Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8 lg:gap-10">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-9 md:p-10 space-y-5">
              <Skeleton h="40px" w="40px" /><Skeleton h="32px" w="60%" /><Skeleton h="14px" w="40%" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="Portfolio Value"
              value={formatCurrency(portfolioData?.total_current_value ?? 0)}
              icon={Wallet}
              iconColor="#6366f1"
              delay={0}
            />
            <StatCard
              label="Total Invested"
              value={formatCurrency(portfolioData?.total_invested ?? 0)}
              icon={DollarSign}
              iconColor="#22d3ee"
              delay={100}
            />
            <StatCard
              label="Profit / Loss"
              value={`${isProfit ? "+" : ""}${formatCurrency(profitLoss)}`}
              icon={isProfit ? TrendingUp : TrendingDown}
              trend={`${isProfit ? "+" : ""}${portfolioData?.total_profit_loss_pct?.toFixed(1) ?? 0}%`}
              trendUp={isProfit}
              iconColor={isProfit ? "#10b981" : "#ef4444"}
              delay={200}
            />
            <StatCard
              label="Risk Level"
              value={report?.risk.risk_level?.replace("_", " ").toUpperCase() ?? "—"}
              icon={ShieldCheck}
              trend={`Score: ${report?.risk.risk_score ?? 0}`}
              trendUp={(report?.risk.risk_score ?? 50) < 50}
              iconColor="#a855f7"
              delay={300}
            />
          </>
        )}
      </div>

      {/* ── Charts Row ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12">
        {/* Asset Allocation Pie */}
        <div className="glass-card p-9 md:p-10 lg:p-12 animate-fade-in" style={{ animationDelay: "400ms" }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.12)" }}>
              <PieIcon size={18} style={{ color: "var(--accent-primary)" }} />
            </div>
            <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>
              Asset Allocation
            </h3>
          </div>
          {allocationChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={allocationChartData} cx="50%" cy="50%"
                  innerRadius={75} outerRadius={115} paddingAngle={3}
                  dataKey="value" stroke="none">
                  {allocationChartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "12px",
                    color: "var(--text-primary)",
                  }}
                />
                <Legend
                  wrapperStyle={{ color: "var(--text-secondary)", fontSize: "13px", paddingTop: "16px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Add investments to see your allocation
              </p>
            </div>
          )}
        </div>

        {/* Expenses Pie */}
        <div className="glass-card p-9 md:p-10 lg:p-12 animate-fade-in" style={{ animationDelay: "500ms" }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.12)" }}>
              <Activity size={18} style={{ color: "var(--accent-red)" }} />
            </div>
            <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>
              Expense Breakdown
            </h3>
          </div>
          {expenseChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={expenseChartData} cx="50%" cy="50%"
                  innerRadius={75} outerRadius={115} paddingAngle={3}
                  dataKey="value" stroke="none">
                  {expenseChartData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "12px",
                    color: "var(--text-primary)",
                  }}
                />
                <Legend wrapperStyle={{ color: "var(--text-secondary)", fontSize: "13px", paddingTop: "16px" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Add expenses to see your breakdown
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Metrics Cards ──────────────────────────────── */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 lg:gap-10 animate-fade-in"
          style={{ animationDelay: "600ms" }}>
          {/* Savings Rate */}
          <div className="glass-card p-9 md:p-10">
            <p className="stat-label mb-3">Savings Rate</p>
            <p className="stat-value text-3xl">{report.savings.savings_rate_pct.toFixed(1)}%</p>
            <span className={`badge mt-4 inline-block ${ratingBadge(report.savings.rating)}`}>
              {report.savings.rating}
            </span>
          </div>

          {/* Debt-to-Income */}
          <div className="glass-card p-9 md:p-10">
            <p className="stat-label mb-3">Debt-to-Income</p>
            <p className="stat-value text-3xl">{report.debt_to_income.dti_ratio_pct.toFixed(1)}%</p>
            <span className={`badge mt-4 inline-block ${ratingBadge(report.debt_to_income.rating)}`}>
              {report.debt_to_income.rating.replace("_", " ")}
            </span>
          </div>

          {/* Diversification */}
          <div className="glass-card p-9 md:p-10">
            <p className="stat-label mb-3">Diversification</p>
            <p className="stat-value text-3xl">{report.diversification.diversification_score.toFixed(0)}/100</p>
            <span className={`badge mt-3 inline-block ${ratingBadge(report.diversification.rating)}`}>
              {report.diversification.rating.replace("_", " ")}
            </span>
          </div>
          {/* Income vs Expenses bar */}
          <div className="glass-card p-9 md:p-10">
            <p className="stat-label mb-3">Monthly Overview</p>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={[{
                name: "Monthly",
                Income: Math.round(report.savings.total_monthly_income),
                Expenses: Math.round(report.savings.total_monthly_expenses),
              }]} barGap={6}>
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "12px",
                    color: "var(--text-primary)",
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
