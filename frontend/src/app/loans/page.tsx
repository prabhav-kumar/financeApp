"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Edit2, Landmark, Calendar, Percent, IndianRupee } from "lucide-react";
import Modal from "@/components/Modal";
import { loan as loanApi, type Loan } from "@/lib/api";
import { formatCurrency } from "@/lib/helpers";

const LOAN_TYPES = ["home", "car", "personal", "education", "credit_card", "business", "other"];
const loanTypeLabel = (t: string) => t.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [autoCalc, setAutoCalc] = useState(true);
  const [form, setForm] = useState({
    loan_name: "", loan_type: "personal",
    principal_amount: "", outstanding_balance: "",
    interest_rate: "", tenure_months: "",
    emi_amount: "", start_date: "",
  });

  const load = useCallback(async () => {
    try { setLoans(await loanApi.list()); } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-calculate outstanding balance
  useEffect(() => {
    if (!autoCalc) return;
    if (!form.principal_amount || !form.interest_rate || !form.tenure_months || !form.start_date || !form.emi_amount) return;
    try {
      const P = parseFloat(form.principal_amount);
      const r = parseFloat(form.interest_rate) / 12 / 100;
      const N = parseInt(form.tenure_months);
      const start = new Date(form.start_date);
      const now = new Date();
      if (isNaN(P) || isNaN(r) || isNaN(N) || isNaN(start.getTime())) return;
      const E = parseFloat(form.emi_amount);
      let monthsPassed = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
      if (now.getDate() < start.getDate()) monthsPassed--;
      monthsPassed = Math.max(0, Math.min(monthsPassed, N));
      let balance = r > 0
        ? P * Math.pow(1 + r, monthsPassed) - E * ((Math.pow(1 + r, monthsPassed) - 1) / r)
        : P - E * monthsPassed;
      balance = Math.max(0, balance);
      const calcBal = Math.round(balance).toString();
      setForm((prev) => prev.outstanding_balance !== calcBal ? { ...prev, outstanding_balance: calcBal } : prev);
    } catch { /* ignore */ }
  }, [form.principal_amount, form.interest_rate, form.tenure_months, form.start_date, form.emi_amount, autoCalc]);

  const resetForm = () => {
    setForm({ loan_name: "", loan_type: "personal", principal_amount: "", outstanding_balance: "", interest_rate: "", tenure_months: "", emi_amount: "", start_date: "" });
    setEditId(null); setAutoCalc(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      loan_name: form.loan_name, loan_type: form.loan_type,
      principal_amount: parseFloat(form.principal_amount),
      outstanding_balance: parseFloat(form.outstanding_balance),
      interest_rate: parseFloat(form.interest_rate),
      tenure_months: parseInt(form.tenure_months),
      emi_amount: parseFloat(form.emi_amount),
      start_date: form.start_date,
    };
    try {
      if (editId) await loanApi.update(editId, payload as Partial<Loan>);
      else await loanApi.add(payload as Partial<Loan>);
      setShowModal(false); resetForm(); load();
    } catch { /* empty */ }
  };

  const handleEdit = (l: Loan) => {
    setForm({
      loan_name: l.loan_name, loan_type: l.loan_type,
      principal_amount: String(l.principal_amount), outstanding_balance: String(l.outstanding_balance),
      interest_rate: String(l.interest_rate), tenure_months: String(l.tenure_months),
      emi_amount: String(l.emi_amount), start_date: l.start_date,
    });
    setEditId(l.id); setAutoCalc(false); setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this loan?")) return;
    try { await loanApi.remove(id); load(); } catch { /* empty */ }
  };

  const totalOutstanding = loans.reduce((s, l) => s + l.outstanding_balance, 0);
  const totalEmi = loans.reduce((s, l) => s + l.emi_amount, 0);
  const totalPrincipal = loans.reduce((s, l) => s + l.principal_amount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}
        className="fade-up">
        <div>
          <h1 className="page-title">Loans & EMI</h1>
          <p className="page-subtitle">Track your loans and monthly obligations</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus size={15} /> Add Loan
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}
        className="fade-up">
        <div className="card card-p">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <IndianRupee size={14} style={{ color: "var(--red)" }} />
            <p className="stat-lbl">Total Outstanding</p>
          </div>
          <p className="stat-val">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="card card-p">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Calendar size={14} style={{ color: "var(--amber)" }} />
            <p className="stat-lbl">Monthly EMI</p>
          </div>
          <p className="stat-val">{formatCurrency(totalEmi)}</p>
        </div>
        <div className="card card-p">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Landmark size={14} style={{ color: "var(--indigo)" }} />
            <p className="stat-lbl">Total Borrowed</p>
          </div>
          <p className="stat-val">{formatCurrency(totalPrincipal)}</p>
        </div>
      </div>

      {/* Loan list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card card-p" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="skeleton" style={{ height: 20, width: "40%" }} />
              <div className="skeleton" style={{ height: 14, width: "60%" }} />
            </div>
          ))
        ) : loans.length === 0 ? (
          <div className="card empty-state">
            <Landmark size={36} style={{ color: "var(--text-muted)" }} />
            <p style={{ fontWeight: 600, color: "var(--text-secondary)" }}>No loans added</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Add a loan to start tracking</p>
          </div>
        ) : (
          loans.map((l) => {
            const paidPct = ((l.principal_amount - l.outstanding_balance) / l.principal_amount) * 100;
            return (
              <div key={l.id} className="card card-p">
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      <h3 style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>{l.loan_name}</h3>
                      <span className="badge badge-indigo">{loanTypeLabel(l.loan_type)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 20, fontSize: 12, color: "var(--text-secondary)", flexWrap: "wrap", marginBottom: 14 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <IndianRupee size={12} /> EMI: {formatCurrency(l.emi_amount)}/mo
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Percent size={12} /> {l.interest_rate}%
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Calendar size={12} /> {l.tenure_months} months
                      </span>
                    </div>
                    {/* Progress */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>
                        <span>{paidPct.toFixed(0)}% paid</span>
                        <span>Outstanding: {formatCurrency(l.outstanding_balance)}</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{
                          width: `${Math.min(paidPct, 100)}%`,
                          background: paidPct > 80 ? "var(--green)" : "var(--grad-teal)",
                        }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <button className="btn-ghost" onClick={() => handleEdit(l)}><Edit2 size={15} /></button>
                    <button className="btn-danger-ghost" onClick={() => handleDelete(l.id)}><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }}
        title={editId ? "Edit Loan" : "Add Loan"} maxWidth="500px">
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="label">Loan Name</label>
            <input className="input" placeholder="e.g. HDFC Home Loan"
              value={form.loan_name} onChange={(e) => setForm({ ...form, loan_name: e.target.value })} required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.loan_type} onChange={(e) => setForm({ ...form, loan_type: e.target.value })}>
                {LOAN_TYPES.map((t) => <option key={t} value={t}>{loanTypeLabel(t)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Principal (₹)</label>
              <input type="number" className="input" placeholder="5000000"
                value={form.principal_amount} onChange={(e) => setForm({ ...form, principal_amount: e.target.value })} required />
            </div>
            <div>
              <label className="label" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Outstanding (₹)</span>
                {editId !== null && !autoCalc && (
                  <button type="button" onClick={() => setAutoCalc(true)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--indigo-light)", fontSize: 11 }}>
                    Auto-calculate
                  </button>
                )}
              </label>
              <input type="number" className="input" placeholder="4200000"
                value={form.outstanding_balance} onChange={(e) => setForm({ ...form, outstanding_balance: e.target.value })} required />
            </div>
            <div>
              <label className="label">Interest Rate (%)</label>
              <input type="number" step="0.01" className="input" placeholder="8.5"
                value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} required />
            </div>
            <div>
              <label className="label">Tenure (months)</label>
              <input type="number" className="input" placeholder="240"
                value={form.tenure_months} onChange={(e) => setForm({ ...form, tenure_months: e.target.value })} required />
            </div>
            <div>
              <label className="label">EMI (₹)</label>
              <input type="number" className="input" placeholder="43391"
                value={form.emi_amount} onChange={(e) => setForm({ ...form, emi_amount: e.target.value })} required />
            </div>
          </div>
          <div>
            <label className="label">Start Date</label>
            <input type="date" className="input"
              value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
              onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              {editId ? "Update" : "Add Loan"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
