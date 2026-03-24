"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Edit2, Target } from "lucide-react";
import Modal from "@/components/Modal";
import { goals as goalsApi, type FinancialGoal } from "@/lib/api";
import { formatCurrency } from "@/lib/helpers";

const CATEGORIES = ["home", "car", "education", "vacation", "wedding", "gadget", "business", "emergency", "other"];
const catIcon: Record<string, string> = {
  home: "🏠", car: "🚗", education: "🎓", vacation: "✈️", wedding: "💍",
  gadget: "📱", business: "🏢", emergency: "🛡️", other: "🎯",
};
const catLabel = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);
const statusColor: Record<string, string> = { active: "var(--indigo-light)", completed: "var(--green)", paused: "var(--amber)" };

export default function GoalsPage() {
  const [items, setItems] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    goal_name: "", category: "home", target_amount: "", current_amount: "",
    monthly_contribution: "", target_date: "", notes: "",
  });

  const load = useCallback(async () => {
    try { setItems(await goalsApi.list()); } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm({ goal_name: "", category: "home", target_amount: "", current_amount: "", monthly_contribution: "", target_date: "", notes: "" });
    setEditId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      goal_name: form.goal_name, category: form.category,
      target_amount: parseFloat(form.target_amount),
      current_amount: parseFloat(form.current_amount) || 0,
      monthly_contribution: parseFloat(form.monthly_contribution) || 0,
      target_date: form.target_date || null,
      notes: form.notes || null,
    };
    try {
      if (editId) await goalsApi.update(editId, data);
      else await goalsApi.add(data);
      setShowModal(false); resetForm(); load();
    } catch { /* empty */ }
  };

  const handleEdit = (g: FinancialGoal) => {
    setForm({
      goal_name: g.goal_name, category: g.category,
      target_amount: String(g.target_amount), current_amount: String(g.current_amount),
      monthly_contribution: String(g.monthly_contribution), target_date: g.target_date || "",
      notes: g.notes || "",
    });
    setEditId(g.id); setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this goal?")) return;
    try { await goalsApi.remove(id); load(); } catch { /* empty */ }
  };

  const markComplete = async (g: FinancialGoal) => {
    try { await goalsApi.update(g.id, { status: "completed" }); load(); } catch { /* empty */ }
  };

  const activeGoals = items.filter((g) => g.status === "active");
  const totalTarget = activeGoals.reduce((s, g) => s + g.target_amount, 0);
  const totalSaved = activeGoals.reduce((s, g) => s + g.current_amount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }} className="fade-up">
        <div>
          <h1 className="page-title">Financial Goals</h1>
          <p className="page-subtitle">Track your savings goals — car, home, vacation, and more</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={15} /> Add Goal
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }} className="fade-up">
        <div className="card card-p" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="icon-box" style={{ width: 44, height: 44, background: "rgba(99,102,241,0.1)" }}>
            <Target size={20} style={{ color: "var(--indigo-light)" }} />
          </div>
          <div>
            <p className="stat-lbl">Active Goals</p>
            <p className="stat-val" style={{ marginTop: 4 }}>{activeGoals.length}</p>
          </div>
        </div>
        <div className="card card-p">
          <p className="stat-lbl" style={{ marginBottom: 4 }}>Total Progress</p>
          <p className="stat-val positive">{formatCurrency(totalSaved)}</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>of {formatCurrency(totalTarget)}</p>
        </div>
      </div>

      {/* Goals list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card card-p"><div className="skeleton" style={{ height: 80 }} /></div>
          ))
        ) : items.length === 0 ? (
          <div className="card empty-state">
            <span style={{ fontSize: 36 }}>🎯</span>
            <p style={{ fontWeight: 600, color: "var(--text-secondary)" }}>No goals yet</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Set a goal — buy a car, plan a vacation, save for education</p>
          </div>
        ) : (
          items.map((g) => (
            <div key={g.id} className="card card-p" style={{ opacity: g.status === "paused" ? 0.6 : 1 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 12, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 26, flexShrink: 0 }}>{catIcon[g.category] || "🎯"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <p style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>{g.goal_name}</p>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: `${statusColor[g.status]}22`, color: statusColor[g.status], fontWeight: 600 }}>
                        {g.status}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                      {catLabel(g.category)}
                      {g.target_date && ` · Target: ${g.target_date}`}
                      {g.monthly_contribution > 0 && ` · ${formatCurrency(g.monthly_contribution)}/mo`}
                      {g.months_to_goal != null && g.months_to_goal > 0 && ` · ~${g.months_to_goal} months to go`}
                    </p>
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{formatCurrency(g.current_amount)}</span>
                        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{formatCurrency(g.target_amount)}</span>
                      </div>
                      <div style={{ height: 8, background: "var(--bg-hover)", borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ width: `${g.progress_pct}%`, height: "100%", background: g.progress_pct >= 100 ? "var(--green)" : "var(--indigo-light)", borderRadius: 4, transition: "width 0.5s" }} />
                      </div>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{g.progress_pct.toFixed(1)}% complete</p>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  {g.status === "active" && g.progress_pct < 100 && (
                    <button className="btn-ghost" style={{ fontSize: 11, padding: "4px 8px" }} onClick={() => markComplete(g)}>✓ Done</button>
                  )}
                  <button className="btn-ghost" onClick={() => handleEdit(g)}><Edit2 size={15} /></button>
                  <button className="btn-danger-ghost" onClick={() => handleDelete(g.id)}><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editId ? "Edit Goal" : "Add Financial Goal"} maxWidth="460px">
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="label">Goal Name</label>
            <input className="input" placeholder="e.g. Buy a Honda City" value={form.goal_name} onChange={(e) => setForm({ ...form, goal_name: e.target.value })} required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{catIcon[c]} {catLabel(c)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Target Date (optional)</label>
              <input type="date" className="input" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">Target Amount (₹)</label>
              <input type="number" step="any" className="input" placeholder="1000000" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} required />
            </div>
            <div>
              <label className="label">Already Saved (₹)</label>
              <input type="number" step="any" className="input" placeholder="0" value={form.current_amount} onChange={(e) => setForm({ ...form, current_amount: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Monthly Contribution (₹)</label>
            <input type="number" step="any" className="input" placeholder="10000" value={form.monthly_contribution} onChange={(e) => setForm({ ...form, monthly_contribution: e.target.value })} />
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <input className="input" placeholder="Any notes about this goal" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editId ? "Update" : "Add Goal"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
