"use client";
/**
 * Income Page — Manage monthly income sources
 *
 * Users define recurring income streams: salary, freelance, rental, etc.
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  Plus, Trash2, Edit2, IndianRupee, Pause, Play, Briefcase,
} from "lucide-react";
import Modal from "@/components/Modal";
import { income as incomeApi, type Income } from "@/lib/api";
import { formatCurrency } from "@/lib/helpers";

const INCOME_CATEGORIES = [
  "salary", "freelance", "business", "dividends", "rental", "interest", "other",
];

const FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
  { value: "one_time", label: "One-time" },
];

const categoryLabel = (cat: string) =>
  cat.charAt(0).toUpperCase() + cat.slice(1).replace("_", " ");

const categoryIcon = (cat: string) => {
  const map: Record<string, string> = {
    salary: "💼", freelance: "💻", business: "🏢", dividends: "📈",
    rental: "🏠", interest: "🏦", other: "💰",
  };
  return map[cat] || "💰";
};

const freqLabel = (f: string) => {
  const map: Record<string, string> = {
    monthly: "/mo", quarterly: "/qtr", yearly: "/yr", one_time: "(one-time)",
  };
  return map[f] || "";
};

const toMonthly = (amount: number, freq: string) => {
  const m: Record<string, number> = { monthly: 1, quarterly: 1/3, yearly: 1/12, one_time: 0 };
  return amount * (m[freq] ?? 1);
};

export default function IncomePage() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [form, setForm] = useState({
    source_name: "", category: "salary", amount: "", frequency: "monthly",
  });

  const loadData = useCallback(async () => {
    try {
      const items = await incomeApi.list();
      setIncomes(items);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const resetForm = () => {
    setForm({ source_name: "", category: "salary", amount: "", frequency: "monthly" });
    setEditId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      source_name: form.source_name,
      category: form.category,
      amount: parseFloat(form.amount),
      frequency: form.frequency,
    };
    try {
      if (editId) {
        await incomeApi.update(editId, payload as Partial<Income>);
      } else {
        await incomeApi.add(payload);
      }
      setShowAdd(false);
      resetForm();
      loadData();
    } catch { /* empty */ }
  };

  const handleEdit = (inc: Income) => {
    setForm({
      source_name: inc.source_name,
      category: inc.category,
      amount: String(inc.amount),
      frequency: inc.frequency,
    });
    setEditId(inc.id);
    setShowAdd(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this income source?")) return;
    try {
      await incomeApi.remove(id);
      loadData();
    } catch { /* empty */ }
  };

  const totalMonthly = incomes
    .filter((i) => i.is_active === 1)
    .reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0);

  const activeCount = incomes.filter((i) => i.is_active === 1).length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-10 animate-fade-in">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Income Sources
          </h1>
          <p className="mt-2 text-base" style={{ color: "var(--text-muted)" }}>
            Define your recurring income streams
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowAdd(true); }}
          className="btn-primary flex items-center gap-2 px-6 py-3 self-start">
          <Plus size={18} /> Add Income
        </button>
      </div>

      {/* ── Summary Row ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12 animate-fade-in" style={{ animationDelay: "100ms" }}>
        <div className="glass-card px-8 py-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(16, 185, 129, 0.1)" }}>
              <IndianRupee size={24} style={{ color: "var(--accent-green)" }} />
            </div>
            <div>
              <p className="stat-label">Total Monthly Income</p>
              <p className="stat-value text-3xl mt-1 positive">{formatCurrency(totalMonthly)}</p>
            </div>
          </div>
        </div>
        <div className="glass-card px-8 py-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(99, 102, 241, 0.1)" }}>
              <Briefcase size={24} style={{ color: "var(--accent-primary-light)" }} />
            </div>
            <div>
              <p className="stat-label">Active Sources</p>
              <p className="stat-value text-3xl mt-1">{activeCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Income Items ──────────────────────────────── */}
      <div className="space-y-5 animate-fade-in" style={{ animationDelay: "200ms" }}>
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="glass-card px-8 py-7">
              <div className="skeleton" style={{ height: "24px", width: "30%" }} />
              <div className="skeleton mt-4" style={{ height: "16px", width: "50%" }} />
            </div>
          ))
        ) : incomes.length === 0 ? (
          <div className="glass-card py-16 px-8 text-center">
            <p className="text-4xl mb-4">💼</p>
            <p className="text-xl font-medium" style={{ color: "var(--text-secondary)" }}>
              No income sources added yet
            </p>
            <p className="text-base mt-2 max-w-md mx-auto" style={{ color: "var(--text-muted)" }}>
              Add your salary, freelance income, rental income, etc. to start tracking your financial health.
            </p>
          </div>
        ) : (
          incomes.map((inc) => (
            <div key={inc.id}
              className="glass-card px-8 py-6 flex flex-col sm:flex-row sm:items-center gap-6 group"
              style={{ opacity: inc.is_active === 1 ? 1 : 0.5 }}>
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <span className="text-2xl">{categoryIcon(inc.category)}</span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-lg truncate" style={{ color: "var(--text-primary)" }}>
                    {inc.source_name}
                  </h3>
                  <div className="flex gap-3 mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
                    <span className="badge badge-info text-[11px]">{categoryLabel(inc.category)}</span>
                    {inc.is_active === 0 && <span className="badge badge-warning text-[11px]">Inactive</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-5">
                <div className="text-right">
                  <p className="font-semibold text-xl positive">
                    {formatCurrency(inc.amount)}
                    <span className="text-sm font-normal ml-1" style={{ color: "var(--text-muted)" }}>{freqLabel(inc.frequency)}</span>
                  </p>
                  {inc.frequency !== "monthly" && inc.frequency !== "one_time" && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      ≈ {formatCurrency(toMonthly(inc.amount, inc.frequency))}/mo
                    </p>
                  )}
                </div>
                <button onClick={() => handleEdit(inc)}
                  className="p-2.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-indigo-400 transition-colors">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => handleDelete(inc.id)}
                  className="p-2.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Add/Edit Modal ─────────────────────────────────── */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); resetForm(); }}
        title={editId ? "Edit Income Source" : "Add Income Source"} maxWidth="440px">
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div>
            <label className="label">Source Name</label>
            <input className="input-field" placeholder="e.g. Acme Corp Salary, Freelance Projects"
              value={form.source_name} onChange={(e) => setForm({ ...form, source_name: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount (₹)</label>
              <input type="number" step="any" className="input-field" placeholder="50000"
                value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div>
              <label className="label">Frequency</label>
              <select className="input-field" value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input-field" value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {INCOME_CATEGORIES.map((c) => (
                <option key={c} value={c}>{categoryIcon(c)} {categoryLabel(c)}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" className="btn-secondary flex-1"
              onClick={() => { setShowAdd(false); resetForm(); }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1">
              {editId ? "Update" : "Add Income"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
