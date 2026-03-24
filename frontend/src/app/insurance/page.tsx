"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Edit2, Shield, IndianRupee } from "lucide-react";
import Modal from "@/components/Modal";
import { insurance as insuranceApi, type InsurancePolicy, type InsuranceSummary } from "@/lib/api";
import { formatCurrency } from "@/lib/helpers";

const TYPES = ["life", "health", "term", "vehicle", "home", "travel", "other"];
const typeIcon: Record<string, string> = {
  life: "🧬", health: "🏥", term: "🛡️", vehicle: "🚗", home: "🏠", travel: "✈️", other: "📋",
};
const typeLabel = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export default function InsurancePage() {
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [summary, setSummary] = useState<InsuranceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    policy_name: "", insurance_type: "health", insurer: "",
    coverage_amount: "", annual_premium: "", policy_start_date: "", policy_end_date: "",
  });

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([insuranceApi.list(), insuranceApi.summary()]);
      setPolicies(p); setSummary(s);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm({ policy_name: "", insurance_type: "health", insurer: "", coverage_amount: "", annual_premium: "", policy_start_date: "", policy_end_date: "" });
    setEditId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      policy_name: form.policy_name, insurance_type: form.insurance_type,
      insurer: form.insurer || null, coverage_amount: parseFloat(form.coverage_amount),
      annual_premium: parseFloat(form.annual_premium),
      policy_start_date: form.policy_start_date || null,
      policy_end_date: form.policy_end_date || null,
    };
    try {
      if (editId) await insuranceApi.update(editId, data);
      else await insuranceApi.add(data);
      setShowModal(false); resetForm(); load();
    } catch { /* empty */ }
  };

  const handleEdit = (p: InsurancePolicy) => {
    setForm({
      policy_name: p.policy_name, insurance_type: p.insurance_type, insurer: p.insurer || "",
      coverage_amount: String(p.coverage_amount), annual_premium: String(p.annual_premium),
      policy_start_date: p.policy_start_date || "", policy_end_date: p.policy_end_date || "",
    });
    setEditId(p.id); setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this policy?")) return;
    try { await insuranceApi.remove(id); load(); } catch { /* empty */ }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }} className="fade-up">
        <div>
          <h1 className="page-title">Insurance</h1>
          <p className="page-subtitle">Track your policies and coverage</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={15} /> Add Policy
        </button>
      </div>

      {/* Summary */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }} className="fade-up">
          <div className="card card-p" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div className="icon-box" style={{ width: 44, height: 44, background: "rgba(16,185,129,0.1)" }}>
              <Shield size={20} style={{ color: "var(--green)" }} />
            </div>
            <div>
              <p className="stat-lbl">Total Coverage</p>
              <p className="stat-val positive" style={{ marginTop: 4 }}>{formatCurrency(summary.total_coverage)}</p>
            </div>
          </div>
          <div className="card card-p" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div className="icon-box" style={{ width: 44, height: 44, background: "rgba(239,68,68,0.1)" }}>
              <IndianRupee size={20} style={{ color: "var(--red)" }} />
            </div>
            <div>
              <p className="stat-lbl">Annual Premium</p>
              <p className="stat-val" style={{ marginTop: 4 }}>{formatCurrency(summary.total_annual_premium)}</p>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{formatCurrency(summary.total_monthly_premium)}/mo</p>
            </div>
          </div>
          <div className="card card-p" style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div className="icon-box" style={{ width: 44, height: 44, background: "rgba(99,102,241,0.1)" }}>
              <span style={{ fontSize: 18 }}>📋</span>
            </div>
            <div>
              <p className="stat-lbl">Active Policies</p>
              <p className="stat-val" style={{ marginTop: 4 }}>{summary.active_policies}</p>
            </div>
          </div>
        </div>
      )}

      {/* Policy list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card card-p"><div className="skeleton" style={{ height: 60 }} /></div>
          ))
        ) : policies.length === 0 ? (
          <div className="card empty-state">
            <span style={{ fontSize: 36 }}>🛡️</span>
            <p style={{ fontWeight: 600, color: "var(--text-secondary)" }}>No policies added yet</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Add your life, health, vehicle insurance policies</p>
          </div>
        ) : (
          policies.map((p) => (
            <div key={p.id} className="card card-p-sm" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", opacity: p.is_active === 1 ? 1 : 0.5 }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{typeIcon[p.insurance_type] || "📋"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{p.policy_name}</p>
                <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                  <span className="badge badge-indigo">{typeLabel(p.insurance_type)}</span>
                  {p.insurer && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.insurer}</span>}
                  {p.policy_end_date && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Expires: {p.policy_end_date}</span>}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: "var(--green)" }}>Cover: {formatCurrency(p.coverage_amount)}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Premium: {formatCurrency(p.annual_premium)}/yr</p>
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button className="btn-ghost" onClick={() => handleEdit(p)}><Edit2 size={15} /></button>
                <button className="btn-danger-ghost" onClick={() => handleDelete(p.id)}><Trash2 size={15} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editId ? "Edit Policy" : "Add Insurance Policy"} maxWidth="460px">
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="label">Policy Name</label>
            <input className="input" placeholder="e.g. LIC Jeevan Anand" value={form.policy_name} onChange={(e) => setForm({ ...form, policy_name: e.target.value })} required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.insurance_type} onChange={(e) => setForm({ ...form, insurance_type: e.target.value })}>
                {TYPES.map((t) => <option key={t} value={t}>{typeIcon[t]} {typeLabel(t)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Insurer (optional)</label>
              <input className="input" placeholder="e.g. LIC, HDFC Ergo" value={form.insurer} onChange={(e) => setForm({ ...form, insurer: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">Coverage Amount (₹)</label>
              <input type="number" step="any" className="input" placeholder="5000000" value={form.coverage_amount} onChange={(e) => setForm({ ...form, coverage_amount: e.target.value })} required />
            </div>
            <div>
              <label className="label">Annual Premium (₹)</label>
              <input type="number" step="any" className="input" placeholder="25000" value={form.annual_premium} onChange={(e) => setForm({ ...form, annual_premium: e.target.value })} required />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">Start Date</label>
              <input type="date" className="input" value={form.policy_start_date} onChange={(e) => setForm({ ...form, policy_start_date: e.target.value })} />
            </div>
            <div>
              <label className="label">End / Maturity Date</label>
              <input type="date" className="input" value={form.policy_end_date} onChange={(e) => setForm({ ...form, policy_end_date: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editId ? "Update" : "Add Policy"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
