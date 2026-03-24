"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Edit2, TrendingUp } from "lucide-react";
import Modal from "@/components/Modal";
import { retirement as retirementApi, type RetirementPlan, type RetirementSummary } from "@/lib/api";
import { formatCurrency } from "@/lib/helpers";

const ACCOUNT_TYPES = ["epf", "ppf", "nps", "elss", "pension", "other"];
const typeLabel = (t: string) => t.toUpperCase();
const typeIcon: Record<string, string> = { epf: "🏦", ppf: "📮", nps: "🏛️", elss: "📈", pension: "👴", other: "💼" };

export default function RetirementPage() {
  const [plans, setPlans] = useState<RetirementPlan[]>([]);
  const [summary, setSummary] = useState<RetirementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    plan_name: "", account_type: "epf", current_value: "", monthly_contribution: "",
    expected_return_rate: "8", current_age: "", retirement_age: "60", desired_monthly_income: "",
  });

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([retirementApi.list(), retirementApi.summary()]);
      setPlans(p); setSummary(s);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm({ plan_name: "", account_type: "epf", current_value: "", monthly_contribution: "", expected_return_rate: "8", current_age: "", retirement_age: "60", desired_monthly_income: "" });
    setEditId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      plan_name: form.plan_name, account_type: form.account_type,
      current_value: parseFloat(form.current_value) || 0,
      monthly_contribution: parseFloat(form.monthly_contribution) || 0,
      expected_return_rate: parseFloat(form.expected_return_rate),
      current_age: form.current_age ? parseInt(form.current_age) : null,
      retirement_age: parseInt(form.retirement_age),
      desired_monthly_income: form.desired_monthly_income ? parseFloat(form.desired_monthly_income) : null,
    };
    try {
      if (editId) await retirementApi.update(editId, data);
      else await retirementApi.add(data);
      setShowModal(false); resetForm(); load();
    } catch { /* empty */ }
  };

  const handleEdit = (p: RetirementPlan) => {
    setForm({
      plan_name: p.plan_name, account_type: p.account_type,
      current_value: String(p.current_value), monthly_contribution: String(p.monthly_contribution),
      expected_return_rate: String(p.expected_return_rate),
      current_age: p.current_age ? String(p.current_age) : "",
      retirement_age: String(p.retirement_age),
      desired_monthly_income: p.desired_monthly_income ? String(p.desired_monthly_income) : "",
    });
    setEditId(p.id); setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this retirement plan?")) return;
    try { await retirementApi.remove(id); load(); } catch { /* empty */ }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }} className="fade-up">
        <div>
          <h1 className="page-title">Retirement Planning</h1>
          <p className="page-subtitle">Track EPF, PPF, NPS and project your retirement corpus</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={15} /> Add Plan
        </button>
      </div>

      {/* Summary */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }} className="fade-up">
          <div className="card card-p">
            <p className="stat-lbl" style={{ marginBottom: 4 }}>Current Corpus</p>
            <p className="stat-val positive">{formatCurrency(summary.total_current_corpus)}</p>
          </div>
          <div className="card card-p">
            <p className="stat-lbl" style={{ marginBottom: 4 }}>Projected Corpus</p>
            <p className="stat-val" style={{ color: "var(--indigo-light)" }}>{formatCurrency(summary.projected_total_corpus)}</p>
          </div>
          <div className="card card-p">
            <p className="stat-lbl" style={{ marginBottom: 4 }}>Monthly Contribution</p>
            <p className="stat-val">{formatCurrency(summary.total_monthly_contribution)}</p>
          </div>
          {summary.readiness_pct != null && (
            <div className="card card-p">
              <p className="stat-lbl" style={{ marginBottom: 8 }}>Retirement Readiness</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, height: 8, background: "var(--bg-hover)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ width: `${summary.readiness_pct}%`, height: "100%", background: summary.readiness_pct >= 80 ? "var(--green)" : summary.readiness_pct >= 50 ? "var(--amber)" : "var(--red)", borderRadius: 4 }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", flexShrink: 0 }}>{summary.readiness_pct.toFixed(0)}%</span>
              </div>
              {summary.required_corpus && (
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Required: {formatCurrency(summary.required_corpus)}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Plans list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card card-p"><div className="skeleton" style={{ height: 80 }} /></div>
          ))
        ) : plans.length === 0 ? (
          <div className="card empty-state">
            <span style={{ fontSize: 36 }}>👴</span>
            <p style={{ fontWeight: 600, color: "var(--text-secondary)" }}>No retirement plans yet</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Add your EPF, PPF, NPS accounts to track your retirement corpus</p>
          </div>
        ) : (
          plans.map((p) => (
            <div key={p.id} className="card card-p-sm" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{typeIcon[p.account_type] || "💼"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{p.plan_name}</p>
                <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap", fontSize: 12, color: "var(--text-muted)" }}>
                  <span className="badge badge-indigo">{typeLabel(p.account_type)}</span>
                  {p.years_to_retirement != null && <span>{p.years_to_retirement} years to retirement</span>}
                  <span>{p.expected_return_rate}% expected return</span>
                  {p.monthly_contribution > 0 && <span>{formatCurrency(p.monthly_contribution)}/mo</span>}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: "var(--green)" }}>{formatCurrency(p.current_value)}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>current corpus</p>
                {p.projected_corpus && (
                  <p style={{ fontSize: 12, color: "var(--indigo-light)", marginTop: 2 }}>→ {formatCurrency(p.projected_corpus)} projected</p>
                )}
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button className="btn-ghost" onClick={() => handleEdit(p)}><Edit2 size={15} /></button>
                <button className="btn-danger-ghost" onClick={() => handleDelete(p.id)}><Trash2 size={15} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editId ? "Edit Plan" : "Add Retirement Plan"} maxWidth="480px">
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="label">Plan Name</label>
            <input className="input" placeholder="e.g. EPFO Account" value={form.plan_name} onChange={(e) => setForm({ ...form, plan_name: e.target.value })} required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">Account Type</label>
              <select className="input" value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })}>
                {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{typeIcon[t]} {typeLabel(t)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Expected Return (% p.a.)</label>
              <input type="number" step="0.1" className="input" placeholder="8" value={form.expected_return_rate} onChange={(e) => setForm({ ...form, expected_return_rate: e.target.value })} required />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">Current Value (₹)</label>
              <input type="number" step="any" className="input" placeholder="500000" value={form.current_value} onChange={(e) => setForm({ ...form, current_value: e.target.value })} />
            </div>
            <div>
              <label className="label">Monthly Contribution (₹)</label>
              <input type="number" step="any" className="input" placeholder="5000" value={form.monthly_contribution} onChange={(e) => setForm({ ...form, monthly_contribution: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">Current Age</label>
              <input type="number" className="input" placeholder="30" value={form.current_age} onChange={(e) => setForm({ ...form, current_age: e.target.value })} />
            </div>
            <div>
              <label className="label">Retirement Age</label>
              <input type="number" className="input" placeholder="60" value={form.retirement_age} onChange={(e) => setForm({ ...form, retirement_age: e.target.value })} required />
            </div>
            <div>
              <label className="label">Desired Income/mo (₹)</label>
              <input type="number" step="any" className="input" placeholder="50000" value={form.desired_monthly_income} onChange={(e) => setForm({ ...form, desired_monthly_income: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editId ? "Update" : "Add Plan"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
