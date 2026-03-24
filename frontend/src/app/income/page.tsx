"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Edit2, IndianRupee, Briefcase } from "lucide-react";
import Modal from "@/components/Modal";
import { income as incomeApi, type Income } from "@/lib/api";
import { formatCurrency } from "@/lib/helpers";

const CATEGORIES = ["salary", "freelance", "business", "dividends", "rental", "interest", "other"];
const FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "one_time", label: "One-time" },
];

const catLabel = (c: string) => c.charAt(0).toUpperCase() + c.slice(1).replace("_", " ");
const catIcon: Record<string, string> = {
  salary: "💼", freelance: "💻", business: "🏢", dividends: "📈",
  rental: "🏠", interest: "🏦", other: "💰",
};
const freqLabel: Record<string, string> = {
  monthly: "/mo", quarterly: "/qtr", yearly: "/yr", one_time: "(one-time)",
};
const toMonthly = (amount: number, freq: string) => {
  const m: Record<string, number> = { monthly: 1, quarterly: 1 / 3, yearly: 1 / 12, one_time: 0 };
  return amount * (m[freq] ?? 1);
};

export default function IncomePage() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ source_name: "", category: "salary", amount: "", frequency: "monthly" });

  const load = useCallback(async () => {
    try { setIncomes(await incomeApi.list()); } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setForm({ source_name: "", category: "salary", amount: "", frequency: "monthly" }); setEditId(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { source_name: form.source_name, category: form.category, amount: parseFloat(form.amount), frequency: form.frequency };
    try {
      if (editId) await incomeApi.update(editId, payload as Partial<Income>);
      else await incomeApi.add(payload);
      setShowModal(false); resetForm(); load();
    } catch { /* empty */ }
  };

  const handleEdit = (inc: Income) => {
    setForm({ source_name: inc.source_name, category: inc.category, amount: String(inc.amount), frequency: inc.frequency });
    setEditId(inc.id); setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this income source?")) return;
    try { await incomeApi.remove(id); load(); } catch { /* empty */ }
  };

  const totalMonthly = incomes.filter((i) => i.is_active === 1).reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0);
  const activeCount = incomes.filter((i) => i.is_active === 1).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}
        className="fade-up">
        <div>
          <h1 className="page-title">Income Sources</h1>
          <p className="page-subtitle">Define your recurring income streams</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={15} /> Add Income
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}
        className="fade-up">
        <div className="card card-p" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="icon-box" style={{ width: 44, height: 44, background: "rgba(16,185,129,0.1)" }}>
            <IndianRupee size={20} style={{ color: "var(--green)" }} />
          </div>
          <div>
            <p className="stat-lbl">Total Monthly Income</p>
            <p className="stat-val positive" style={{ marginTop: 4 }}>{formatCurrency(totalMonthly)}</p>
          </div>
        </div>
        <div className="card card-p" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="icon-box" style={{ width: 44, height: 44, background: "rgba(99,102,241,0.1)" }}>
            <Briefcase size={20} style={{ color: "var(--indigo-light)" }} />
          </div>
          <div>
            <p className="stat-lbl">Active Sources</p>
            <p className="stat-val" style={{ marginTop: 4 }}>{activeCount}</p>
          </div>
        </div>
      </div>

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card card-p" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="skeleton" style={{ height: 20, width: "35%" }} />
              <div className="skeleton" style={{ height: 14, width: "55%" }} />
            </div>
          ))
        ) : incomes.length === 0 ? (
          <div className="card empty-state">
            <span style={{ fontSize: 36 }}>💼</span>
            <p style={{ fontWeight: 600, color: "var(--text-secondary)" }}>No income sources yet</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Add your salary, freelance, rental income, etc.</p>
          </div>
        ) : (
          incomes.map((inc) => (
            <div key={inc.id} className="card card-p-sm"
              style={{
                display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
                opacity: inc.is_active === 1 ? 1 : 0.5,
              }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{catIcon[inc.category] || "💰"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{inc.source_name}</p>
                <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                  <span className="badge badge-indigo">{catLabel(inc.category)}</span>
                  {inc.is_active === 0 && <span className="badge badge-amber">Inactive</span>}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 15, color: "var(--green)" }}>
                  {formatCurrency(inc.amount)}
                  <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-muted)", marginLeft: 4 }}>
                    {freqLabel[inc.frequency]}
                  </span>
                </p>
                {inc.frequency !== "monthly" && inc.frequency !== "one_time" && (
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    ≈ {formatCurrency(toMonthly(inc.amount, inc.frequency))}/mo
                  </p>
                )}
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button className="btn-ghost" onClick={() => handleEdit(inc)}><Edit2 size={15} /></button>
                <button className="btn-danger-ghost" onClick={() => handleDelete(inc.id)}><Trash2 size={15} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }}
        title={editId ? "Edit Income Source" : "Add Income Source"} maxWidth="440px">
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="label">Source Name</label>
            <input className="input" placeholder="e.g. Acme Corp Salary"
              value={form.source_name} onChange={(e) => setForm({ ...form, source_name: e.target.value })} required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">Amount (₹)</label>
              <input type="number" step="any" className="input" placeholder="50000"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div>
              <label className="label">Frequency</label>
              <select className="input" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
                {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{catIcon[c]} {catLabel(c)}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
              onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              {editId ? "Update" : "Add Income"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
