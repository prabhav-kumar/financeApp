"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Edit2, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import Modal from "@/components/Modal";
import {
  investment as investmentApi, portfolio as portfolioApi,
  type Investment, type PortfolioSummary, type HoldingDetail,
} from "@/lib/api";
import { formatCurrency, investmentTypeLabel } from "@/lib/helpers";

const TYPES = ["stock", "mutual_fund", "etf", "crypto", "gold", "silver", "fixed_deposit", "ppf"];

export default function PortfolioPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "", ticker_symbol: "", investment_type: "stock",
    quantity: "", buy_price: "", buy_date: "", interest_rate: "", maturity_date: "",
  });
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string; type: string; exchange: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const load = useCallback(async () => {
    try {
      const [inv, sum] = await Promise.all([investmentApi.list(), portfolioApi.summary()]);
      setInvestments(inv); setSummary(sum);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const refreshPrices = async () => {
    setRefreshing(true);
    try { setSummary(await portfolioApi.summary()); } catch { /* empty */ }
    setRefreshing(false);
  };

  const resetForm = () => {
    setForm({ name: "", ticker_symbol: "", investment_type: "stock", quantity: "", buy_price: "", buy_date: "", interest_rate: "", maturity_date: "" });
    setEditId(null);
  };

  const isMarket = ["stock", "mutual_fund", "etf", "crypto", "gold", "silver"].includes(form.investment_type);
  const isFixed = ["fixed_deposit", "ppf"].includes(form.investment_type);

  useEffect(() => {
    if (!isMarket || form.name.length < 2 || !showDropdown) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try { setSearchResults(await investmentApi.search(form.name)); } catch { /* empty */ }
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [form.name, isMarket, showDropdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = {
      name: form.name, ticker_symbol: form.ticker_symbol || null,
      investment_type: form.investment_type,
      quantity: isFixed ? 1 : parseFloat(form.quantity),
      buy_price: parseFloat(form.buy_price), buy_date: form.buy_date,
    };
    if (form.interest_rate) data.interest_rate = parseFloat(form.interest_rate);
    if (form.maturity_date) data.maturity_date = form.maturity_date;
    try {
      if (editId) await investmentApi.update(editId, data as Partial<Investment>);
      else await investmentApi.add(data as Partial<Investment>);
      setShowModal(false); resetForm(); load();
    } catch { /* empty */ }
  };

  const handleEdit = (inv: Investment) => {
    setForm({
      name: inv.name, ticker_symbol: inv.ticker_symbol || "",
      investment_type: inv.investment_type, quantity: String(inv.quantity),
      buy_price: String(inv.buy_price), buy_date: inv.buy_date,
      interest_rate: inv.interest_rate ? String(inv.interest_rate) : "",
      maturity_date: inv.maturity_date || "",
    });
    setEditId(inv.id); setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this investment?")) return;
    try { await investmentApi.remove(id); load(); } catch { /* empty */ }
  };

  const getHolding = (id: number): HoldingDetail | undefined =>
    summary?.holdings.find((h) => h.investment_id === id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}
        className="fade-up">
        <div>
          <h1 className="page-title">Portfolio</h1>
          <p className="page-subtitle">Manage investments and track real-time prices</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn btn-secondary" onClick={refreshPrices} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? "spin" : ""} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus size={15} /> Add Investment
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}
          className="fade-up">
          <div className="card card-p">
            <p className="stat-lbl" style={{ marginBottom: 6 }}>Total Invested</p>
            <p className="stat-val">{formatCurrency(summary.total_invested)}</p>
          </div>
          <div className="card card-p">
            <p className="stat-lbl" style={{ marginBottom: 6 }}>Current Value</p>
            <p className="stat-val">{formatCurrency(summary.total_current_value)}</p>
          </div>
          <div className="card card-p">
            <p className="stat-lbl" style={{ marginBottom: 6 }}>Total P&L</p>
            <p className={`stat-val ${summary.total_profit_loss >= 0 ? "positive" : "negative"}`}>
              {summary.total_profit_loss >= 0 ? "+" : ""}{formatCurrency(summary.total_profit_loss)}
              <span style={{ fontSize: 13, fontWeight: 500, marginLeft: 6 }}>
                ({summary.total_profit_loss_pct >= 0 ? "+" : ""}{summary.total_profit_loss_pct.toFixed(2)}%)
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Investment list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card card-p" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="skeleton" style={{ height: 20, width: "40%" }} />
              <div className="skeleton" style={{ height: 14, width: "60%" }} />
            </div>
          ))
        ) : investments.length === 0 ? (
          <div className="card empty-state">
            <p style={{ fontWeight: 600, color: "var(--text-secondary)" }}>No investments yet</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Add your first investment to start tracking</p>
          </div>
        ) : (
          investments.map((inv) => {
            const h = getHolding(inv.id);
            const pl = h?.profit_loss ?? 0;
            const isUp = pl >= 0;
            return (
              <div key={inv.id} className="card card-p-sm"
                style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{inv.name}</p>
                    <span className="badge badge-indigo">{investmentTypeLabel(inv.investment_type)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 4, fontSize: 12, color: "var(--text-secondary)", flexWrap: "wrap" }}>
                    {inv.ticker_symbol && <span>Ticker: {inv.ticker_symbol}</span>}
                    {!isFixed && <span>Qty: {inv.quantity}</span>}
                    <span>{isFixed ? "Principal" : "Buy"}: {formatCurrency(inv.buy_price)}</span>
                    {h && <span>Live: {formatCurrency(h.current_price)}</span>}
                  </div>
                </div>
                {h && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: isUp ? "var(--green)" : "var(--red)" }}>
                        {isUp ? "+" : ""}{formatCurrency(pl)}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {isUp ? "+" : ""}{h.profit_loss_pct.toFixed(2)}%
                      </p>
                    </div>
                    {isUp ? <TrendingUp size={18} style={{ color: "var(--green)" }} />
                      : <TrendingDown size={18} style={{ color: "var(--red)" }} />}
                  </div>
                )}
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button className="btn-ghost" onClick={() => handleEdit(inv)}><Edit2 size={15} /></button>
                  <button className="btn-danger-ghost" onClick={() => handleDelete(inv.id)}><Trash2 size={15} /></button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }}
        title={editId ? "Edit Investment" : "Add Investment"} maxWidth="500px">
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="label">Asset Type</label>
            <select className="input" value={form.investment_type}
              onChange={(e) => { setForm({ ...form, investment_type: e.target.value, ticker_symbol: "" }); setShowDropdown(false); }}>
              {TYPES.map((t) => <option key={t} value={t}>{investmentTypeLabel(t)}</option>)}
            </select>
          </div>

          <div style={{ position: "relative" }}>
            <label className="label">{isMarket ? "Fund / Stock Name" : "Name"}</label>
            <input className="input"
              placeholder={isMarket ? "Start typing to search..." : "e.g. HDFC Fixed Deposit"}
              value={form.name}
              onChange={(e) => { setForm({ ...form, name: e.target.value }); setShowDropdown(true); }}
              onClick={() => isMarket && setShowDropdown(true)}
              required />
            {isMarket && showDropdown && form.name.length >= 2 && (
              <div style={{
                position: "absolute", left: 0, right: 0, top: "100%", marginTop: 4,
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: "var(--r-md)", zIndex: 100, overflow: "hidden",
                boxShadow: "var(--shadow-md)",
              }}>
                {searching ? (
                  <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
                    Searching Yahoo Finance...
                  </div>
                ) : searchResults.length > 0 ? (
                  <ul style={{ maxHeight: 220, overflowY: "auto", listStyle: "none" }}>
                    {searchResults.map((item, idx) => (
                      <li key={idx}
                        style={{
                          padding: "10px 14px", cursor: "pointer",
                          borderBottom: "1px solid var(--border)",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        onClick={() => { setForm({ ...form, name: item.name, ticker_symbol: item.symbol }); setShowDropdown(false); }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: 500, fontSize: 13, color: "var(--text-primary)" }}>{item.name}</span>
                          <span className="badge badge-indigo" style={{ marginLeft: 8 }}>{item.type}</span>
                        </div>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{item.symbol} · {item.exchange}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-muted)", textAlign: "center" }}>
                    No matches found
                  </div>
                )}
              </div>
            )}
          </div>

          {isMarket && (
            <div>
              <label className="label">Ticker Symbol</label>
              <input className="input" placeholder="e.g. RELIANCE.NS"
                value={form.ticker_symbol} onChange={(e) => setForm({ ...form, ticker_symbol: e.target.value })}
                style={{ opacity: 0.7 }} readOnly />
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: isFixed ? "1fr" : "1fr 1fr", gap: 12 }}>
            {!isFixed && (
              <div>
                <label className="label">
                  {form.investment_type === "mutual_fund" ? "Units" : form.investment_type === "crypto" ? "Amount" : "Quantity"}
                </label>
                <input type="number" step="any" className="input" placeholder="10"
                  value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
              </div>
            )}
            <div>
              <label className="label">
                {form.investment_type === "mutual_fund" ? "Avg NAV (₹)" : isFixed ? "Principal (₹)" : "Buy Price (₹)"}
              </label>
              <input type="number" step="any" className="input" placeholder="2500"
                value={form.buy_price} onChange={(e) => setForm({ ...form, buy_price: e.target.value })} required />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isFixed ? "1fr 1fr" : "1fr", gap: 12 }}>
            <div>
              <label className="label">{isFixed ? "Start Date" : "Purchase Date"}</label>
              <input type="date" className="input"
                value={form.buy_date} onChange={(e) => setForm({ ...form, buy_date: e.target.value })} required />
            </div>
            {isFixed && (
              <div>
                <label className="label">Interest Rate (% p.a.)</label>
                <input type="number" step="any" className="input" placeholder="Optional"
                  value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} />
              </div>
            )}
          </div>

          {isFixed && (
            <div>
              <label className="label">Maturity Date (Optional)</label>
              <input type="date" className="input"
                value={form.maturity_date} onChange={(e) => setForm({ ...form, maturity_date: e.target.value })} />
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }}
              onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              {editId ? "Update" : `Add ${investmentTypeLabel(form.investment_type)}`}
            </button>
          </div>
        </form>
      </Modal>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
