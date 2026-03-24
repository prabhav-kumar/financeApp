"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Edit2, BarChart2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import Modal from "@/components/Modal";
import { budget as budgetApi, type Budget, type BudgetSummary } from "@/lib/api";
import { formatCurrency, CHART_COLORS } from "@/lib/helpers";

const CATEGORIES = [
  "housing", "food", "transport", "utilities", "healthcare", "entertainment",
  "education", "shopping", "insurance", "savings", "investments", "personal_care",
  "dining_out", "subscriptions", "other",
];
const catLabel = (c: string) => c.charAt(0).toUpperCase() + c.slice(1).replace(/_/g, " ");
const catIcon: Record<string, string> = {
  housing: "🏠", food: "🍽️", transport: "🚗", utilities: "💡", healthcare: "🏥",
  entertainment: "🎬", education: "📚", shopping: "🛒", insurance: "🛡️",
  savings: "💰", investments: "📈", personal_care: "💆", dining_out: "🍜",
  subscriptions: "📱", other: "📦",
};

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const TOOLTIP_STYLE = {
  background: "var(--bg-card)", border: "1px solid var(--border)",
  borderRadius: "var(--r-md)", color: "var(--text-primary)", fontSize: 13,
};

export default function BudgetPage() {
  const [items, setItems] = useState<Budget[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    month: currentMonth(), category: "food", budgeted_amount: "", actual_amount: "0", notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [i, s] = await Promise.all([budgetApi.list(month), budgetApi.summary(month)]);
      setItems(i); setSummary(s);
    } catch { /* empty */ }
    setLoading(false);
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm({ month, category: "food", budgeted_amount: "", actual_amount: "0", notes: "" });
    setEditId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      month: form.month, category: form.category,
      budgeted_amount: parseFloat(form.budgeted_amount),
      actual_amount: parseFloat(form.actual_amount) || 0,
      notes: form.notes || null,
    };
    try {
      if (editId) await budgetApi.update(editId, data);
      else await budgetApi.add(data);
      setShowModal(false); resetForm(); load();
    } catch { /* empty */ }
  };

  const handleEdit = (b: Budget) => {
    setForm({
      month: b.month, category: b.category, budgeted_amount: String(b.budgeted_amount),
      actual_amount: String(b.actual_amount), notes: b.notes || "",
    });
    setEditId(b.id); setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this budget item?")) return;
    try { await budgetApi.remove(id); load(); } catch { /* empty */ }
  };

  // Generate month options (last 12 months + next 3)
  const monthOptions = Array.from({ length: 15 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 9 + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const chartData = summary
    ? Object.entries(summary.category_breakdown).map(([cat, data]) => ({
        name: catLabel(cat),
        Budgeted: Math.round(data.budgeted),
        Actual: Math.round(data.actual),
      }))
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }} className="fade-up">
        <div>
          <h1 className="page-title">Budgeting</h1>
          <p className="page-subtitle">Plan and track your monthly spending by category</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select className="input" style={{ width: "auto" }} value={month} onChange={(e) => setMonth(e.target.value)}>
            {monthOptions.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={15} /> Add Item
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }} className="fade-up">
          <div className="card card-p">
            <p className="stat-lbl" style={{ marginBottom: 4 }}>Total Budgeted</p>
            <p className="stat-val">{formatCurrency(summary.total_budgeted)}</p>
          </div>
          <div className="card card-p">
            <p className="stat-lbl" style={{ marginBottom: 4 }}>Total Actual</p>
            <p className="stat-val">{formatCurrency(summary.total_actual)}</p>
          </div>
          <div className="card card-p">
            <p className="stat-lbl" style={{ marginBottom: 4 }}>Variance</p>
            <p className="stat-val" style={{ color: summary.total_variance >= 0 ? "var(--green)" : "var(--red)" }}>
              {summary.total_variance >= 0 ? "+" : ""}{formatCurrency(summary.total_variance)}
            </p>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              {summary.total_variance >= 0 ? "Under budget" : "Over budget"}
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="card card-p fade-up">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div className="icon-box" style={{ width: 30, height: 30, background: "rgba(99,102,241,0.1)" }}>
              <BarChart2 size={14} style={{ color: "var(--indigo-light)" }} />
            </div>
            <h3 style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>Budget vs Actual</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => formatCurrency(Number(v))} contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ color: "var(--text-secondary)", fontSize: 12 }} />
              <Bar dataKey="Budgeted" fill={CHART_COLORS[0]} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Actual" fill={CHART_COLORS[2]} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Items list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card card-p"><div className="skeleton" style={{ height: 50 }} /></div>
          ))
        ) : items.length === 0 ? (
          <div className="card empty-state">
            <span style={{ fontSize: 36 }}>📊</span>
            <p style={{ fontWeight: 600, color: "var(--text-secondary)" }}>No budget for {month}</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Add budget items to start tracking your spending</p>
          </div>
        ) : (
          items.map((b) => {
            const pct = b.budgeted_amount > 0 ? Math.min(b.actual_amount / b.budgeted_amount * 100, 100) : 0;
            const over = b.actual_amount > b.budgeted_amount;
            return (
              <div key={b.id} className="card card-p-sm" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{catIcon[b.category] || "📦"}</span>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>{catLabel(b.category)}</p>
                    <p style={{ fontSize: 13, color: over ? "var(--red)" : "var(--text-secondary)" }}>
                      {formatCurrency(b.actual_amount)} / {formatCurrency(b.budgeted_amount)}
                    </p>
                  </div>
                  <div style={{ height: 6, background: "var(--bg-hover)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: over ? "var(--red)" : pct > 80 ? "var(--amber)" : "var(--green)", borderRadius: 3, transition: "width 0.4s" }} />
                  </div>
                  <p style={{ fontSize: 11, color: over ? "var(--red)" : "var(--text-muted)", marginTop: 3 }}>
                    {over ? `Over by ${formatCurrency(b.actual_amount - b.budgeted_amount)}` : `${formatCurrency(b.variance)} remaining`}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button className="btn-ghost" onClick={() => handleEdit(b)}><Edit2 size={15} /></button>
                  <button className="btn-danger-ghost" onClick={() => handleDelete(b.id)}><Trash2 size={15} /></button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editId ? "Edit Budget Item" : "Add Budget Item"} maxWidth="440px">
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">Month</label>
              <select className="input" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })}>
                {monthOptions.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{catIcon[c]} {catLabel(c)}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">Budgeted Amount (₹)</label>
              <input type="number" step="any" className="input" placeholder="10000" value={form.budgeted_amount} onChange={(e) => setForm({ ...form, budgeted_amount: e.target.value })} required />
            </div>
            <div>
              <label className="label">Actual Spent (₹)</label>
              <input type="number" step="any" className="input" placeholder="0" value={form.actual_amount} onChange={(e) => setForm({ ...form, actual_amount: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <input className="input" placeholder="Any notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editId ? "Update" : "Add Item"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
