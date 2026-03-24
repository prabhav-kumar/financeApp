"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Edit2, FileText, IndianRupee } from "lucide-react";
import Modal from "@/components/Modal";
import { tax as taxApi, type TaxRecord, type TaxSummary } from "@/lib/api";
import { formatCurrency } from "@/lib/helpers";

const SECTIONS = [
  { value: "80c", label: "80C — PPF, ELSS, LIC, EPF (max ₹1.5L)" },
  { value: "80d", label: "80D — Health Insurance Premium" },
  { value: "80e", label: "80E — Education Loan Interest" },
  { value: "80g", label: "80G — Donations" },
  { value: "80tta", label: "80TTA — Savings Interest (max ₹10k)" },
  { value: "hra", label: "HRA — House Rent Allowance" },
  { value: "nps_80ccd", label: "NPS 80CCD(1B) — Extra ₹50k" },
  { value: "home_loan", label: "24B — Home Loan Interest (max ₹2L)" },
  { value: "other", label: "Other Deduction" },
];

const currentFY = () => {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${String(year + 1).slice(2)}`;
};

export default function TaxPage() {
  const [records, setRecords] = useState<TaxRecord[]>([]);
  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [fy, setFy] = useState(currentFY());
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    financial_year: currentFY(), regime: "new", gross_income: "",
    deduction_section: "80c", deduction_label: "", deduction_amount: "", tax_paid: "0",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([taxApi.list(fy), taxApi.summary(fy)]);
      setRecords(r); setSummary(s);
    } catch { /* empty */ }
    setLoading(false);
  }, [fy]);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm({ financial_year: fy, regime: "new", gross_income: "", deduction_section: "80c", deduction_label: "", deduction_amount: "", tax_paid: "0" });
    setEditId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      financial_year: form.financial_year, regime: form.regime,
      gross_income: parseFloat(form.gross_income) || 0,
      deduction_section: form.deduction_section, deduction_label: form.deduction_label,
      deduction_amount: parseFloat(form.deduction_amount),
      tax_paid: parseFloat(form.tax_paid) || 0,
    };
    try {
      if (editId) await taxApi.update(editId, data);
      else await taxApi.add(data);
      setShowModal(false); resetForm(); load();
    } catch { /* empty */ }
  };

  const handleEdit = (r: TaxRecord) => {
    setForm({
      financial_year: r.financial_year, regime: r.regime, gross_income: String(r.gross_income),
      deduction_section: r.deduction_section, deduction_label: r.deduction_label,
      deduction_amount: String(r.deduction_amount), tax_paid: String(r.tax_paid),
    });
    setEditId(r.id); setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this record?")) return;
    try { await taxApi.remove(id); load(); } catch { /* empty */ }
  };

  const FY_OPTIONS = ["2024-25", "2023-24", "2022-23", "2025-26"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }} className="fade-up">
        <div>
          <h1 className="page-title">Tax Planning</h1>
          <p className="page-subtitle">Track deductions, estimate tax liability, and plan savings</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select className="input" style={{ width: "auto" }} value={fy} onChange={(e) => setFy(e.target.value)}>
            {FY_OPTIONS.map((f) => <option key={f} value={f}>FY {f}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={15} /> Add Deduction
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary && summary.gross_income > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }} className="fade-up">
          <div className="card card-p">
            <p className="stat-lbl" style={{ marginBottom: 4 }}>Gross Income</p>
            <p className="stat-val">{formatCurrency(summary.gross_income)}</p>
          </div>
          <div className="card card-p">
            <p className="stat-lbl" style={{ marginBottom: 4 }}>Total Deductions</p>
            <p className="stat-val positive">{formatCurrency(summary.total_deductions)}</p>
          </div>
          <div className="card card-p">
            <p className="stat-lbl" style={{ marginBottom: 4 }}>Taxable Income</p>
            <p className="stat-val">{formatCurrency(summary.taxable_income)}</p>
          </div>
          <div className="card card-p">
            <p className="stat-lbl" style={{ marginBottom: 4 }}>Estimated Tax</p>
            <p className="stat-val" style={{ color: "var(--red)" }}>{formatCurrency(summary.estimated_tax)}</p>
          </div>
          <div className="card card-p">
            <p className="stat-lbl" style={{ marginBottom: 4 }}>Tax Paid (TDS)</p>
            <p className="stat-val positive">{formatCurrency(summary.tax_paid)}</p>
          </div>
          <div className="card card-p">
            <p className="stat-lbl" style={{ marginBottom: 4 }}>Tax Remaining</p>
            <p className="stat-val" style={{ color: summary.tax_remaining > 0 ? "var(--red)" : "var(--green)" }}>
              {summary.tax_remaining > 0 ? formatCurrency(summary.tax_remaining) : "Fully Paid ✓"}
            </p>
          </div>
        </div>
      )}

      {/* Records list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card card-p"><div className="skeleton" style={{ height: 50 }} /></div>
          ))
        ) : records.length === 0 ? (
          <div className="card empty-state">
            <span style={{ fontSize: 36 }}>📋</span>
            <p style={{ fontWeight: 600, color: "var(--text-secondary)" }}>No tax records for FY {fy}</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Add your gross income and deductions to estimate tax liability</p>
          </div>
        ) : (
          records.map((r) => (
            <div key={r.id} className="card card-p-sm" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{r.deduction_label}</p>
                <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                  <span className="badge badge-indigo">Sec {r.deduction_section.toUpperCase()}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>FY {r.financial_year} · {r.regime.toUpperCase()} regime</span>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: "var(--green)" }}>{formatCurrency(r.deduction_amount)}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>deduction</p>
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button className="btn-ghost" onClick={() => handleEdit(r)}><Edit2 size={15} /></button>
                <button className="btn-danger-ghost" onClick={() => handleDelete(r.id)}><Trash2 size={15} /></button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editId ? "Edit Record" : "Add Tax Record"} maxWidth="480px">
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">Financial Year</label>
              <select className="input" value={form.financial_year} onChange={(e) => setForm({ ...form, financial_year: e.target.value })}>
                {FY_OPTIONS.map((f) => <option key={f} value={f}>FY {f}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tax Regime</label>
              <select className="input" value={form.regime} onChange={(e) => setForm({ ...form, regime: e.target.value })}>
                <option value="new">New Regime</option>
                <option value="old">Old Regime</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Gross Annual Income (₹)</label>
            <input type="number" step="any" className="input" placeholder="1200000" value={form.gross_income} onChange={(e) => setForm({ ...form, gross_income: e.target.value })} />
          </div>
          <div>
            <label className="label">Deduction Section</label>
            <select className="input" value={form.deduction_section} onChange={(e) => setForm({ ...form, deduction_section: e.target.value })}>
              {SECTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" placeholder="e.g. PPF Contribution, LIC Premium" value={form.deduction_label} onChange={(e) => setForm({ ...form, deduction_label: e.target.value })} required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="label">Deduction Amount (₹)</label>
              <input type="number" step="any" className="input" placeholder="150000" value={form.deduction_amount} onChange={(e) => setForm({ ...form, deduction_amount: e.target.value })} required />
            </div>
            <div>
              <label className="label">Tax Paid / TDS (₹)</label>
              <input type="number" step="any" className="input" placeholder="0" value={form.tax_paid} onChange={(e) => setForm({ ...form, tax_paid: e.target.value })} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editId ? "Update" : "Add Record"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
