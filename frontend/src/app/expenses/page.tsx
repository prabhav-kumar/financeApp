"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Edit2, Pause, Play, PieChart as PieIcon, IndianRupee } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import Modal from "@/components/Modal";
import { expense as expenseApi, type Expense, type ExpenseSummary } from "@/lib/api";
import { formatCurrency, CHART_COLORS } from "@/lib/helpers";

const CATEGORIES = [
  "housing", "food", "transport", "utilities", "healthcare",
  "entertainment", "education", "shopping", "insurance", "emi", "other",
];

const catLabel = (c: string) => c.charAt(0).toUpperCase() + c.slice(1).replace("_", " ");
const catIcon: Record<string, string> = {
  housing: "🏠", food: "🍽️", transport: "🚗", utilities: "💡",
  healthcare: "🏥", entertainment: "🎬", education: "📚",
  shopping: "🛒", insurance: "🛡️", emi: "💳", other: "📦",
};

const TOOLTIP_STYLE = {
  background: "var(--bg-card)", border: "1px solid var(--border)",
  borderRadius: "var(--r-md)", color: "var(--text-primary)", fontSize: 13,
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ category: "housing", label: "", monthly_amount: "" });

  const load = useCallback(async () => {
    try {
      const [items, sum] = await Promise.all([expenseApi.list(), expenseApi.summary()]);
      setExpenses(items); setSummary(sum);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm({ category: "housing", label: "", monthly_amount: "" }); setEditId(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { category: form.category, label: form.label, monthly_amount: parseFloat(form.monthly_amount) };
    try {
      if (editId) await expenseApi.update(editId, data);
      else await expenseApi.add(data);
      setShowModal(false); resetForm(); load();
    } catch { /* empty */ }
  };

  const handleEdit = (exp: Expense) => {
    setForm({ category: exp.category, label: exp.label, monthly_amount: String(exp.monthly_amount) });
    setEditId(exp.id); setShowModal(true);
  };

  const handleToggle = async (exp: Expense) => {
    try { await expenseApi.update(exp.id, { is_active: exp.is_active === 1 ? 0 : 1 }); load(); } catch { /* empty */ }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this expense?")) return;
    try { await expenseApi.remove(id); load(); } catch { /* empty */ }
  };

  const chartData = summary
    ? Object.entries(summary.category_breakdown).map(([name, value]) => ({
        name: catLabel(name), value: Math.round(value),
      }))
    : [];

  const grouped: Record<string, Expense[]> = {};
  expenses.forEach((e) => { if (!grouped[e.category]) grouped[e.category] = []; grouped[e.category].push(e); });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}
        className="fade-up">
        <div>
          <h1 className="page-title">Monthly Expenses</h1>
          <p className="page-subtitle">Define where your money goes every month</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={15} /> Add Expense
        </button>
      </div>

      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }} className="fade-up expenses-grid">
        <div className="card card-p" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="icon-box" style={{ width: 44, height: 44, background: "rgba(239,68,68,0.1)" }}>
            <IndianRupee size={20} style={{ color: "var(--red)" }} />
          </div>
          <div>
            <p className="stat-lbl">Total Monthly</p>
            <p className="stat-val" style={{ marginTop: 4 }}>{formatCurrency(summary?.total_monthly_expenses ?? 0)}</p>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              {summary?.active_items ?? 0} active items
            </p>
          </div>
        </div>

        <div className="card card-p">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div className="icon-box" style={{ width: 30, height: 30, background: "rgba(239,68,68,0.1)" }}>
              <PieIcon size={14} style={{ color: "var(--red)" }} />
            </div>
            <h3 style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>Expense Breakdown</h3>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80} paddingAngle={3}
                  dataKey="value" stroke="none">
                  {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ color: "var(--text-secondary)", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Add expenses to see breakdown</p>
            </div>
          )}
        </div>
      </div>

      {/* Grouped list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card card-p" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="skeleton" style={{ height: 20, width: "30%" }} />
              <div className="skeleton" style={{ height: 14, width: "50%" }} />
            </div>
          ))
        ) : expenses.length === 0 ? (
          <div className="card empty-state">
            <span style={{ fontSize: 36 }}>📋</span>
            <p style={{ fontWeight: 600, color: "var(--text-secondary)" }}>No expenses defined yet</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Add items like Rent, Groceries, Electricity</p>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => {
            const catTotal = items.reduce((s, e) => s + (e.is_active === 1 ? e.monthly_amount : 0), 0);
            return (
              <div key={cat}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>{catIcon[cat] || "📦"}</span>
                  <h2 style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{catLabel(cat)}</h2>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>— {formatCurrency(catTotal)}/mo</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                  {items.map((exp) => (
                    <div key={exp.id} className="card card-p-sm"
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        opacity: exp.is_active === 1 ? 1 : 0.5,
                      }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 500, fontSize: 14, color: "var(--text-primary)" }}>{exp.label}</p>
                        {exp.is_active === 0 && (
                          <span style={{ fontSize: 11, color: "var(--amber)" }}>Paused</span>
                        )}
                      </div>
                      <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", flexShrink: 0 }}>
                        {formatCurrency(exp.monthly_amount)}
                        <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)", marginLeft: 3 }}>/mo</span>
                      </p>
                      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                        <button className="btn-ghost" onClick={() => handleToggle(exp)} title={exp.is_active === 1 ? "Pause" : "Resume"}
                          style={{ padding: 6 }}>
                          {exp.is_active === 1 ? <Pause size={13} /> : <Play size={13} />}
                        </button>
                        <button className="btn-ghost" onClick={() => handleEdit(exp)} style={{ padding: 6 }}>
                          <Edit2 size={13} />
                        </button>
                        <button className="btn-danger-ghost" onClick={() => handleDelete(exp.id)} style={{ padding: 6 }}>
                          <Trash2 size={13} />
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

      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }}
        title={editId ? "Edit Expense" : "Add Monthly Expense"} maxWidth="420px">
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="label">What is this expense for?</label>
            <input className="input" placeholder="e.g. Rent, Groceries, Electricity"
              value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">Monthly Amount (₹)</label>
              <input type="number" step="any" className="input" placeholder="15000"
                value={form.monthly_amount} onChange={(e) => setForm({ ...form, monthly_amount: e.target.value })} required />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((t) => <option key={t} value={t}>{catIcon[t]} {catLabel(t)}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
              onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              {editId ? "Update" : "Add to Budget"}
            </button>
          </div>
        </form>
      </Modal>

      <style>{`
        @media (max-width: 640px) {
          .expenses-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
