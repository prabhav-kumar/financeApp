"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Edit2, Shield, Target } from "lucide-react";
import Modal from "@/components/Modal";
import { emergencyFund as efApi, type EmergencyFund } from "@/lib/api";
import { formatCurrency } from "@/lib/helpers";

export default function EmergencyFundPage() {
  const [funds, setFunds] = useState<EmergencyFund[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    fund_name: "Emergency Fund", current_amount: "", target_amount: "",
    monthly_contribution: "", months_of_expenses: "6",
  });

  const load = useCallback(async () => {
    try { setFunds(await efApi.list()); } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm({ fund_name: "Emergency Fund", current_amount: "", target_amount: "", monthly_contribution: "", months_of_expenses: "6" });
    setEditId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      fund_name: form.fund_name,
      current_amount: parseFloat(form.current_amount) || 0,
      target_amount: parseFloat(form.target_amount),
      monthly_contribution: parseFloat(form.monthly_contribution) || 0,
      months_of_expenses: parseInt(form.months_of_expenses),
    };
    try {
      if (editId) await efApi.update(editId, data);
      else await efApi.add(data);
      setShowModal(false); resetForm(); load();
    } catch { /* empty */ }
  };

  const handleEdit = (f: EmergencyFund) => {
    setForm({
      fund_name: f.fund_name, current_amount: String(f.current_amount),
      target_amount: String(f.target_amount), monthly_contribution: String(f.monthly_contribution),
      months_of_expenses: String(f.months_of_expenses),
    });
    setEditId(f.id); setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this emergency fund?")) return;
    try { await efApi.remove(id); load(); } catch { /* empty */ }
  };

  const totalCurrent = funds.reduce((s, f) => s + f.current_amount, 0);
  const totalTarget = funds.reduce((s, f) => s + f.target_amount, 0);
  const overallProgress = totalTarget > 0 ? Math.min(totalCurrent / totalTarget * 100, 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }} className="fade-up">
        <div>
          <h1 className="page-title">Emergency Fund</h1>
          <p className="page-subtitle">Build your financial safety net — 3 to 6 months of expenses</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={15} /> Add Fund
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }} className="fade-up">
        <div className="card card-p" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="icon-box" style={{ width: 44, height: 44, background: "rgba(16,185,129,0.1)" }}>
            <Shield size={20} style={{ color: "var(--green)" }} />
          </div>
          <div>
            <p className="stat-lbl">Total Saved</p>
            <p className="stat-val positive" style={{ marginTop: 4 }}>{formatCurrency(totalCurrent)}</p>
          </div>
        </div>
        <div className="card card-p" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="icon-box" style={{ width: 44, height: 44, background: "rgba(99,102,241,0.1)" }}>
            <Target size={20} style={{ color: "var(--indigo-light)" }} />
          </div>
          <div>
            <p className="stat-lbl">Target Amount</p>
            <p className="stat-val" style={{ marginTop: 4 }}>{formatCurrency(totalTarget)}</p>
          </div>
        </div>
        <div className="card card-p">
          <p className="stat-lbl" style={{ marginBottom: 8 }}>Overall Progress</p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, height: 8, background: "var(--bg-hover)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${overallProgress}%`, height: "100%", background: overallProgress >= 100 ? "var(--green)" : "var(--indigo-light)", borderRadius: 4, transition: "width 0.5s" }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", flexShrink: 0 }}>{overallProgress.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Fund list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card card-p"><div className="skeleton" style={{ height: 80 }} /></div>
          ))
        ) : funds.length === 0 ? (
          <div className="card empty-state">
            <span style={{ fontSize: 36 }}>🛡️</span>
            <p style={{ fontWeight: 600, color: "var(--text-secondary)" }}>No emergency fund yet</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Start building your safety net today</p>
          </div>
        ) : (
          funds.map((f) => (
            <div key={f.id} className="card card-p">
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>{f.fund_name}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    Target: {f.months_of_expenses} months of expenses
                    {f.monthly_contribution > 0 && ` · Contributing ${formatCurrency(f.monthly_contribution)}/mo`}
                    {f.months_to_goal != null && f.months_to_goal > 0 && ` · ~${f.months_to_goal} months to goal`}
                  </p>
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{formatCurrency(f.current_amount)} saved</span>
                      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Goal: {formatCurrency(f.target_amount)}</span>
                    </div>
                    <div style={{ height: 8, background: "var(--bg-hover)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${f.progress_pct}%`, height: "100%", background: f.progress_pct >= 100 ? "var(--green)" : "var(--indigo-light)", borderRadius: 4, transition: "width 0.5s" }} />
                    </div>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{f.progress_pct.toFixed(1)}% funded</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button className="btn-ghost" onClick={() => handleEdit(f)}><Edit2 size={15} /></button>
                  <button className="btn-danger-ghost" onClick={() => handleDelete(f.id)}><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editId ? "Edit Emergency Fund" : "Add Emergency Fund"} maxWidth="440px">
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="label">Fund Name</label>
            <input className="input" value={form.fund_name} onChange={(e) => setForm({ ...form, fund_name: e.target.value })} required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">Current Amount (₹)</label>
              <input type="number" step="any" className="input" placeholder="50000" value={form.current_amount} onChange={(e) => setForm({ ...form, current_amount: e.target.value })} />
            </div>
            <div>
              <label className="label">Target Amount (₹)</label>
              <input type="number" step="any" className="input" placeholder="300000" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} required />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">Monthly Contribution (₹)</label>
              <input type="number" step="any" className="input" placeholder="5000" value={form.monthly_contribution} onChange={(e) => setForm({ ...form, monthly_contribution: e.target.value })} />
            </div>
            <div>
              <label className="label">Target Coverage (months)</label>
              <select className="input" value={form.months_of_expenses} onChange={(e) => setForm({ ...form, months_of_expenses: e.target.value })}>
                {[3, 4, 5, 6, 9, 12].map((m) => <option key={m} value={m}>{m} months</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editId ? "Update" : "Add Fund"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
