"use client";
/**
 * Loans Page — Add loans, view EMI tracking, and outstanding balances
 */

import React, { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Landmark, Calendar, Percent, IndianRupee, Edit2 } from "lucide-react";
import Modal from "@/components/Modal";
import { loan as loanApi, type Loan } from "@/lib/api";
import { formatCurrency } from "@/lib/helpers";

const LOAN_TYPES = [
  "home", "car", "personal", "education", "credit_card", "business", "other",
];

function loanTypeLabel(t: string) {
  return t.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    loan_name: "", loan_type: "personal",
    principal_amount: "", outstanding_balance: "",
    interest_rate: "", tenure_months: "",
    emi_amount: "", start_date: "",
  });

  const [autoCalc, setAutoCalc] = useState(true);

  const resetForm = () => {
    setForm({
      loan_name: "", loan_type: "personal",
      principal_amount: "", outstanding_balance: "",
      interest_rate: "", tenure_months: "",
      emi_amount: "", start_date: "",
    });
    setEditId(null);
    setAutoCalc(true);
  };

  const loadData = useCallback(async () => {
    try { setLoans(await loanApi.list()); } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!autoCalc) return;
    if (!form.principal_amount || !form.interest_rate || !form.tenure_months || !form.start_date || !form.emi_amount) return;

    try {
      const P = parseFloat(form.principal_amount);
      const r = parseFloat(form.interest_rate) / 12 / 100;
      const N = parseInt(form.tenure_months);
      const start = new Date(form.start_date);
      const now = new Date(); // Current date
      if (isNaN(P) || isNaN(r) || isNaN(N) || isNaN(start.getTime())) return;
      
      const E = parseFloat(form.emi_amount);
      let monthsPassed = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
      if (now.getDate() < start.getDate()) monthsPassed--;
      
      monthsPassed = Math.max(0, Math.min(monthsPassed, N));
      
      let balance = P;
      if (r > 0) {
        balance = P * Math.pow(1 + r, monthsPassed) - E * ((Math.pow(1 + r, monthsPassed) - 1) / r);
      } else {
        balance = P - E * monthsPassed;
      }
      balance = Math.max(0, balance);
      
      const calcBal = Math.round(balance).toString();
      setForm(prev => {
        if (prev.outstanding_balance !== calcBal) {
          return { ...prev, outstanding_balance: calcBal };
        }
        return prev;
      });
    } catch { /* ignore */ }
  }, [form.principal_amount, form.interest_rate, form.tenure_months, form.start_date, form.emi_amount, autoCalc]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      loan_name: form.loan_name,
      loan_type: form.loan_type,
      principal_amount: parseFloat(form.principal_amount),
      outstanding_balance: parseFloat(form.outstanding_balance),
      interest_rate: parseFloat(form.interest_rate),
      tenure_months: parseInt(form.tenure_months),
      emi_amount: parseFloat(form.emi_amount),
      start_date: form.start_date,
    };
    try {
      if (editId) {
        await loanApi.update(editId, payload as Partial<Loan>);
      } else {
        await loanApi.add(payload as Partial<Loan>);
      }
      setShowAdd(false);
      resetForm();
      loadData();
    } catch { /* empty */ }
  };

  const handleEdit = (l: Loan) => {
    setForm({
      loan_name: l.loan_name, loan_type: l.loan_type,
      principal_amount: String(l.principal_amount), outstanding_balance: String(l.outstanding_balance),
      interest_rate: String(l.interest_rate), tenure_months: String(l.tenure_months),
      emi_amount: String(l.emi_amount), start_date: l.start_date,
    });
    setEditId(l.id);
    setAutoCalc(false);
    setShowAdd(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this loan?")) return;
    try { await loanApi.remove(id); loadData(); } catch { /* empty */ }
  };

  const totalOutstanding = loans.reduce((s, l) => s + l.outstanding_balance, 0);
  const totalEmi = loans.reduce((s, l) => s + l.emi_amount, 0);
  const totalPrincipal = loans.reduce((s, l) => s + l.principal_amount, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            Loans & EMI
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Track your loans and monthly EMI obligations
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Loan
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 animate-fade-in"
        style={{ animationDelay: "100ms" }}>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <IndianRupee size={16} style={{ color: "var(--accent-red)" }} />
            <p className="stat-label">Total Outstanding</p>
          </div>
          <p className="stat-value text-2xl">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={16} style={{ color: "var(--accent-yellow)" }} />
            <p className="stat-label">Monthly EMI</p>
          </div>
          <p className="stat-value text-2xl">{formatCurrency(totalEmi)}</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Landmark size={16} style={{ color: "var(--accent-primary)" }} />
            <p className="stat-label">Total Borrowed</p>
          </div>
          <p className="stat-value text-2xl">{formatCurrency(totalPrincipal)}</p>
        </div>
      </div>

      {/* Loan list */}
      <div className="space-y-3 animate-fade-in" style={{ animationDelay: "200ms" }}>
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="glass-card p-5">
              <div className="skeleton" style={{ height: "24px", width: "40%" }} />
              <div className="skeleton mt-2" style={{ height: "16px", width: "60%" }} />
            </div>
          ))
        ) : loans.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Landmark size={40} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-lg font-medium" style={{ color: "var(--text-secondary)" }}>No loans added</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Add a loan to start tracking</p>
          </div>
        ) : (
          loans.map((l) => {
            const paidPct = ((l.principal_amount - l.outstanding_balance) / l.principal_amount) * 100;
            return (
              <div key={l.id} className="glass-card p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
                        {l.loan_name}
                      </h3>
                      <span className="badge badge-info text-[10px]">
                        {loanTypeLabel(l.loan_type)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-sm"
                      style={{ color: "var(--text-secondary)" }}>
                      <span className="flex items-center gap-1">
                        <IndianRupee size={13} /> EMI: {formatCurrency(l.emi_amount)}/mo
                      </span>
                      <span className="flex items-center gap-1">
                        <Percent size={13} /> Rate: {l.interest_rate}%
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={13} /> {l.tenure_months} months
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1"
                        style={{ color: "var(--text-muted)" }}>
                        <span>{paidPct.toFixed(0)}% paid</span>
                        <span>Outstanding: {formatCurrency(l.outstanding_balance)}</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: "var(--bg-primary)" }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(paidPct, 100)}%`,
                            background: paidPct > 80 ? "var(--accent-green)" : "var(--gradient-accent)",
                          }} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start">
                    <button onClick={() => handleEdit(l)}
                      className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-indigo-400 transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(l.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Add/Edit Modal ──────────────────────────────────── */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); resetForm(); }} title={editId ? "Edit Loan" : "Add Loan"} maxWidth="520px">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Loan Name</label>
              <input className="input-field" placeholder="e.g. HDFC Home Loan"
                value={form.loan_name} onChange={(e) => setForm({ ...form, loan_name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input-field" value={form.loan_type}
                onChange={(e) => setForm({ ...form, loan_type: e.target.value })}>
                {LOAN_TYPES.map((t) => (
                  <option key={t} value={t}>{loanTypeLabel(t)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Principal (₹)</label>
              <input type="number" className="input-field" placeholder="5000000"
                value={form.principal_amount} onChange={(e) => setForm({ ...form, principal_amount: e.target.value })} required />
            </div>
            <div>
              <label className="label flex justify-between">
                <span>Outstanding (₹)</span>
                {editId !== null && !autoCalc && (
                  <button type="button" onClick={() => setAutoCalc(true)} className="text-xs text-indigo-400 hover:text-indigo-300">
                    Auto-calculate
                  </button>
                )}
              </label>
              <input type="number" className="input-field" placeholder="4200000"
                value={form.outstanding_balance} onChange={(e) => setForm({ ...form, outstanding_balance: e.target.value })} required />
            </div>
            <div>
              <label className="label">Interest Rate (%)</label>
              <input type="number" step="0.01" className="input-field" placeholder="8.5"
                value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} required />
            </div>
            <div>
              <label className="label">Tenure (months)</label>
              <input type="number" className="input-field" placeholder="240"
                value={form.tenure_months} onChange={(e) => setForm({ ...form, tenure_months: e.target.value })} required />
            </div>
            <div>
              <label className="label">EMI (₹)</label>
              <input type="number" className="input-field" placeholder="43391"
                value={form.emi_amount} onChange={(e) => setForm({ ...form, emi_amount: e.target.value })} required />
            </div>
            <div className="col-span-2">
              <label className="label">Start Date</label>
              <input type="date" className="input-field"
                value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => { setShowAdd(false); resetForm(); }}>Cancel</button>
            <button type="submit" className="btn-primary flex-1">{editId ? "Update" : "Add Loan"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
