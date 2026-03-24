"use client";
/**
 * Expenses Page — Monthly Budget Manager
 *
 * Users define WHERE their money goes each month.
 * e.g. "Rent → ₹15,000/mo", "Groceries → ₹5,000/mo"
 * The system uses these for savings rate, risk analysis, and AI advice.
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  Plus, Trash2, Edit2, IndianRupee, Pause, Play,
  PieChart as PieIcon,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import Modal from "@/components/Modal";
import {
  expense as expenseApi,
  type Expense,
  type ExpenseSummary,
} from "@/lib/api";
import { formatCurrency, CHART_COLORS } from "@/lib/helpers";

const CATEGORIES = [
  "housing", "food", "transport", "utilities", "healthcare",
  "entertainment", "education", "shopping", "insurance", "emi", "other",
];

const categoryLabel = (cat: string) =>
  cat.charAt(0).toUpperCase() + cat.slice(1).replace("_", " ");

const categoryIcon = (cat: string) => {
  const map: Record<string, string> = {
    housing: "🏠", food: "🍽️", transport: "🚗", utilities: "💡",
    healthcare: "🏥", entertainment: "🎬", education: "📚",
    shopping: "🛒", insurance: "🛡️", emi: "💳", other: "📦",
  };
  return map[cat] || "📦";
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Form state
  const [form, setForm] = useState({
    category: "housing", label: "", monthly_amount: "",
  });

  const loadData = useCallback(async () => {
    try {
      const [items, sum] = await Promise.all([
        expenseApi.list(),
        expenseApi.summary(),
      ]);
      setExpenses(items);
      setSummary(sum);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setForm({ category: "housing", label: "", monthly_amount: "" });
    setEditId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      category: form.category,
      label: form.label,
      monthly_amount: parseFloat(form.monthly_amount),
    };
    try {
      if (editId) {
        await expenseApi.update(editId, data);
      } else {
        await expenseApi.add(data);
      }
      setShowAdd(false);
      resetForm();
      loadData();
    } catch { /* empty */ }
  };

  const handleEdit = (exp: Expense) => {
    setForm({
      category: exp.category,
      label: exp.label,
      monthly_amount: String(exp.monthly_amount),
    });
    setEditId(exp.id);
    setShowAdd(true);
  };

  const handleToggle = async (exp: Expense) => {
    try {
      await expenseApi.update(exp.id, { is_active: exp.is_active === 1 ? 0 : 1 });
      loadData();
    } catch { /* empty */ }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this expense item?")) return;
    try {
      await expenseApi.remove(id);
      loadData();
    } catch { /* empty */ }
  };

  // Chart data from summary
  const chartData = summary
    ? Object.entries(summary.category_breakdown).map(([name, value]) => ({
        name: categoryLabel(name),
        value: Math.round(value),
      }))
    : [];

  // Group expenses by category for display
  const grouped: Record<string, Expense[]> = {};
  expenses.forEach((e) => {
    if (!grouped[e.category]) grouped[e.category] = [];
    grouped[e.category].push(e);
  });

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-10 animate-fade-in">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Monthly Expenses
          </h1>
          <p className="mt-2 text-base" style={{ color: "var(--text-muted)" }}>
            Define where your money goes every month
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowAdd(true); }}
          className="btn-primary flex items-center gap-2 px-6 py-3 self-start">
          <Plus size={18} /> Add Expense
        </button>
      </div>

      {/* ── Summary Row ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12 animate-fade-in" style={{ animationDelay: "100ms" }}>
        {/* Total card */}
        <div className="glass-card px-8 py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(239, 68, 68, 0.1)" }}>
              <IndianRupee size={24} style={{ color: "var(--accent-red)" }} />
            </div>
            <div>
              <p className="stat-label">Total Monthly Expenses</p>
              <p className="stat-value text-3xl mt-1">{formatCurrency(summary?.total_monthly_expenses ?? 0)}</p>
            </div>
          </div>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            {summary?.active_items ?? 0} active budget items
          </p>
        </div>

        {/* Pie chart */}
        <div className="glass-card px-6 py-6 lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.12)" }}>
              <PieIcon size={18} style={{ color: "var(--accent-red)" }} />
            </div>
            <h3 className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>
              Expense Breakdown
            </h3>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%"
                  innerRadius={60} outerRadius={95} paddingAngle={3}
                  dataKey="value" stroke="none">
                  {chartData.map((_, i) => (
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
                <Legend wrapperStyle={{ color: "var(--text-secondary)", fontSize: "13px", paddingTop: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Add your monthly expenses to see the breakdown
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Expense Items by Category ─────────────────── */}
      <div className="space-y-8 animate-fade-in" style={{ animationDelay: "200ms" }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card px-8 py-7">
              <div className="skeleton" style={{ height: "24px", width: "30%" }} />
              <div className="skeleton mt-4" style={{ height: "16px", width: "50%" }} />
            </div>
          ))
        ) : expenses.length === 0 ? (
          <div className="glass-card py-16 px-8 text-center">
            <p className="text-4xl mb-4">📋</p>
            <p className="text-xl font-medium" style={{ color: "var(--text-secondary)" }}>
              No monthly expenses defined yet
            </p>
            <p className="text-base mt-2 max-w-md mx-auto" style={{ color: "var(--text-muted)" }}>
              Add items like &quot;Rent&quot;, &quot;Groceries&quot;, &quot;Electricity&quot; to build your monthly budget.
              The system uses this to calculate your savings rate and financial health.
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => {
            const catTotal = items.reduce((s, e) => s + (e.is_active === 1 ? e.monthly_amount : 0), 0);
            return (
              <div key={cat}>
                {/* Category header */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{categoryIcon(cat)}</span>
                  <h2 className="font-semibold text-xl" style={{ color: "var(--text-primary)" }}>
                    {categoryLabel(cat)}
                  </h2>
                  <span className="text-base font-medium" style={{ color: "var(--text-muted)" }}>
                    — {formatCurrency(catTotal)}/mo
                  </span>
                </div>

                {/* Items */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((exp) => (
                    <div key={exp.id}
                      className="glass-card px-6 py-5 flex items-center gap-5 group"
                      style={{ opacity: exp.is_active === 1 ? 1 : 0.5 }}>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-base truncate"
                          style={{ color: "var(--text-primary)" }}>
                          {exp.label}
                        </p>
                        {exp.is_active === 0 && (
                          <span className="text-xs font-medium" style={{ color: "var(--accent-yellow)" }}>Paused</span>
                        )}
                      </div>
                      <p className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>
                        {formatCurrency(exp.monthly_amount)}
                        <span className="text-xs font-normal ml-1" style={{ color: "var(--text-muted)" }}>/mo</span>
                      </p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleToggle(exp)} title={exp.is_active === 1 ? "Pause" : "Resume"}
                          className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-yellow-400 transition-colors">
                          {exp.is_active === 1 ? <Pause size={15} /> : <Play size={15} />}
                        </button>
                        <button onClick={() => handleEdit(exp)}
                          className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-indigo-400 transition-colors">
                          <Edit2 size={15} />
                        </button>
                        <button onClick={() => handleDelete(exp.id)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Add/Edit Modal ─────────────────────────────── */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); resetForm(); }}
        title={editId ? "Edit Expense" : "Add Monthly Expense"} maxWidth="440px">
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div>
            <label className="label">What is this expense for?</label>
            <input className="input-field" placeholder="e.g. Rent, Groceries, Electricity bill"
              value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Monthly Amount (₹)</label>
              <input type="number" step="any" className="input-field" placeholder="15000"
                value={form.monthly_amount} onChange={(e) => setForm({ ...form, monthly_amount: e.target.value })} required />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input-field" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((t) => (
                  <option key={t} value={t}>{categoryIcon(t)} {categoryLabel(t)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" className="btn-secondary flex-1"
              onClick={() => { setShowAdd(false); resetForm(); }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1">
              {editId ? "Update" : "Add to Budget"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
