"use client";
/**
 * Portfolio Page — List investments, add/edit, show real-time prices
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  Plus, Trash2, Edit2, TrendingUp, TrendingDown, RefreshCw,
} from "lucide-react";
import Modal from "@/components/Modal";
import {
  investment as investmentApi,
  portfolio as portfolioApi,
  type Investment,
  type PortfolioSummary,
  type HoldingDetail,
} from "@/lib/api";
import { formatCurrency, investmentTypeLabel } from "@/lib/helpers";

const TYPES = [
  "stock", "mutual_fund", "etf", "crypto",
  "gold", "silver", "fixed_deposit", "ppf",
];

export default function PortfolioPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "", ticker_symbol: "", investment_type: "stock",
    quantity: "", buy_price: "", buy_date: "",
    interest_rate: "", maturity_date: "",
  });

  const loadData = useCallback(async () => {
    try {
      const [inv, sum] = await Promise.all([
        investmentApi.list(),
        portfolioApi.summary(),
      ]);
      setInvestments(inv);
      setSummary(sum);
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const refreshPrices = async () => {
    setRefreshing(true);
    try {
      const sum = await portfolioApi.summary();
      setSummary(sum);
    } catch { /* empty */ }
    setRefreshing(false);
  };

  const resetForm = () => {
    setForm({
      name: "", ticker_symbol: "", investment_type: "stock",
      quantity: "", buy_price: "", buy_date: "",
      interest_rate: "", maturity_date: "",
    });
    setEditId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: Record<string, unknown> = {
      name: form.name,
      ticker_symbol: form.ticker_symbol || null,
      investment_type: form.investment_type,
      quantity: parseFloat(form.quantity),
      buy_price: parseFloat(form.buy_price),
      buy_date: form.buy_date,
    };
    if (form.interest_rate) data.interest_rate = parseFloat(form.interest_rate);
    if (form.maturity_date) data.maturity_date = form.maturity_date;

    try {
      if (editId) {
        await investmentApi.update(editId, data as Partial<Investment>);
      } else {
        await investmentApi.add(data as Partial<Investment>);
      }
      setShowAdd(false);
      resetForm();
      loadData();
    } catch { /* empty */ }
  };

  const handleEdit = (inv: Investment) => {
    setForm({
      name: inv.name,
      ticker_symbol: inv.ticker_symbol || "",
      investment_type: inv.investment_type,
      quantity: String(inv.quantity),
      buy_price: String(inv.buy_price),
      buy_date: inv.buy_date,
      interest_rate: inv.interest_rate ? String(inv.interest_rate) : "",
      maturity_date: inv.maturity_date || "",
    });
    setEditId(inv.id);
    setShowAdd(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this investment?")) return;
    try {
      await investmentApi.remove(id);
      loadData();
    } catch { /* empty */ }
  };

  // Match holdings to get live prices
  const getHolding = (id: number): HoldingDetail | undefined =>
    summary?.holdings.find((h) => h.investment_id === id);

  const isMarket = ["stock", "mutual_fund", "etf", "crypto", "gold", "silver"].includes(form.investment_type);
  const isFixed = ["fixed_deposit", "ppf"].includes(form.investment_type);

  // Search state
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string; type: string; exchange: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!isMarket || form.name.length < 2 || !showDropdown) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await investmentApi.search(form.name);
        setSearchResults(results);
      } catch { /* ignore */ }
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [form.name, isMarket, showDropdown]);

  const selectSearchResult = (item: { symbol: string; name: string }) => {
    setForm({ ...form, name: item.name, ticker_symbol: item.symbol });
    setShowDropdown(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-10 animate-fade-in">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
            Portfolio
          </h1>
          <p className="mt-2 text-base" style={{ color: "var(--text-muted)" }}>
            Manage your investments and track real-time prices
          </p>
        </div>
        <div className="flex gap-4">
          <button onClick={refreshPrices} className="btn-secondary flex items-center gap-2 px-5 py-2.5"
            disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh Prices
          </button>
          <button onClick={() => { resetForm(); setShowAdd(true); }}
            className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Investment
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10 animate-fade-in"
          style={{ animationDelay: "100ms" }}>
          <div className="glass-card px-8 py-7">
            <p className="stat-label mb-2">Total Invested</p>
            <p className="stat-value">{formatCurrency(summary.total_invested)}</p>
          </div>
          <div className="glass-card px-8 py-7">
            <p className="stat-label mb-2">Current Value</p>
            <p className="stat-value">{formatCurrency(summary.total_current_value)}</p>
          </div>
          <div className="glass-card px-8 py-7">
            <p className="stat-label mb-2">Total P&L</p>
            <p className={`stat-value ${summary.total_profit_loss >= 0 ? "positive" : "negative"}`}>
              {summary.total_profit_loss >= 0 ? "+" : ""}{formatCurrency(summary.total_profit_loss)}
              <span className="text-base ml-2">
                ({summary.total_profit_loss_pct >= 0 ? "+" : ""}{summary.total_profit_loss_pct.toFixed(2)}%)
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Investment list */}
      <div className="space-y-5 animate-fade-in" style={{ animationDelay: "200ms" }}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card px-8 py-7">
              <div className="skeleton" style={{ height: "24px", width: "40%" }} />
              <div className="skeleton mt-4" style={{ height: "16px", width: "60%" }} />
            </div>
          ))
        ) : investments.length === 0 ? (
          <div className="glass-card py-16 px-8 text-center">
            <p className="text-xl font-medium" style={{ color: "var(--text-secondary)" }}>
              No investments yet
            </p>
            <p className="text-base mt-2" style={{ color: "var(--text-muted)" }}>
              Add your first investment to start tracking
            </p>
          </div>
        ) : (
          investments.map((inv) => {
            const h = getHolding(inv.id);
            const pl = h?.profit_loss ?? 0;
            const isUp = pl >= 0;
            return (
              <div key={inv.id}
                className="glass-card px-8 py-6 flex flex-col sm:flex-row sm:items-center gap-6 group">
                {/* Left */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg truncate"
                      style={{ color: "var(--text-primary)" }}>
                      {inv.name}
                    </h3>
                    <span className="badge badge-info text-[10px]">
                      {investmentTypeLabel(inv.investment_type)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1.5 text-sm"
                    style={{ color: "var(--text-secondary)" }}>
                    {inv.ticker_symbol && <span>Ticker: {inv.ticker_symbol}</span>}
                    {inv.investment_type !== 'fixed_deposit' && inv.investment_type !== 'ppf' && (
                      <span>Qty: {inv.quantity}</span>
                    )}
                    <span>{inv.investment_type === 'fixed_deposit' ? 'Principal' : 'Buy'}: {formatCurrency(inv.buy_price)}</span>
                    {h && <span>Live: {formatCurrency(h.current_price)}</span>}
                  </div>
                </div>
                {/* Right — P&L */}
                <div className="flex items-center gap-4">
                  {h && (
                    <div className="text-right">
                      <p className={`font-semibold ${isUp ? "positive" : "negative"}`}>
                         {isUp ? "+" : ""}{formatCurrency(pl)}
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {isUp ? "+" : ""}{h.profit_loss_pct.toFixed(2)}%
                      </p>
                    </div>
                  )}
                  {h && (isUp ? <TrendingUp size={20} className="text-emerald-400" />
                    : <TrendingDown size={20} className="text-red-400" />)}
                  <button onClick={() => handleEdit(inv)}
                    className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-indigo-400 transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(inv.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Add/Edit Modal ─────────────────────────────── */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); resetForm(); }}
        title={editId ? "Edit Investment" : "Add Investment"} maxWidth="520px">
        <form onSubmit={(e) => {
          if (isFixed) {
             form.quantity = "1"; // Fixed deposits default quantity to 1
          }
          handleSubmit(e);
        }} className="space-y-4 relative">
          
          <div className="grid grid-cols-2 gap-4">
            
            <div className="col-span-2">
              <label className="label">Asset Type</label>
              <select className="input-field" value={form.investment_type}
                onChange={(e) => {
                  setForm({ ...form, investment_type: e.target.value, ticker_symbol: "", quantity: e.target.value === 'fixed_deposit' ? "1" : form.quantity });
                  setShowDropdown(false);
                }}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>{investmentTypeLabel(t)}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2 relative">
              <label className="label">{isMarket ? "Fund / Stock Name" : "Name"}</label>
              <input className="input-field" 
                placeholder={isMarket ? "Start typing to search (e.g., Reliance or HDFC)..." : "e.g. HDFC Fixed Deposit"}
                value={form.name} 
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  setShowDropdown(true);
                }} 
                onClick={() => isMarket && setShowDropdown(true)}
                required />
                
              {/* Search Dropdown */}
              {isMarket && showDropdown && form.name.length >= 2 && (
                <div className="absolute left-0 right-0 mt-1 rounded-xl shadow-lg border overflow-hidden z-[100]"
                  style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
                  {searching ? (
                     <div className="p-3 text-sm text-center" style={{ color: "var(--text-muted)" }}>Searching Yahoo Finance...</div>
                  ) : searchResults.length > 0 ? (
                     <ul className="max-h-[220px] overflow-y-auto">
                       {searchResults.map((item, idx) => (
                         <li key={idx} className="p-3 cursor-pointer hover:bg-white/5 border-b last:border-0"
                           style={{ borderColor: "var(--border-color)" }}
                           onClick={() => selectSearchResult(item)}>
                           <div className="flex justify-between items-center">
                             <div className="font-medium text-sm text-white truncate mr-2">{item.name}</div>
                             <div className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded mr-1 flex-shrink-0">{item.type}</div>
                           </div>
                           <div className="text-xs text-slate-400 mt-0.5">{item.symbol} • {item.exchange}</div>
                         </li>
                       ))}
                     </ul>
                  ) : (
                     <div className="p-3 text-sm text-center" style={{ color: "var(--text-muted)" }}>No matches found. Try another search.</div>
                  )}
                </div>
              )}
            </div>

            {isMarket && (
              <div>
                <label className="label">Ticker Symbol</label>
                <input className="input-field" placeholder="e.g. RELIANCE.NS"
                  value={form.ticker_symbol} onChange={(e) => setForm({ ...form, ticker_symbol: e.target.value })} 
                  readOnly={true} // Usually populated from search
                  style={{ opacity: 0.7 }} />
              </div>
            )}
            
            {!isFixed && (
              <div className={isMarket ? "" : "col-span-2"}>
                <label className="label">
                  {form.investment_type === "mutual_fund" ? "Number of Units" : 
                   form.investment_type === "crypto" ? "Amount of Crypto" : "Number of Shares / Qty"}
                </label>
                <input type="number" step="any" className="input-field" placeholder="10"
                  value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
              </div>
            )}

            <div className={isFixed ? "col-span-2" : "col-span-2"}>
              <label className="label">
                {form.investment_type === "mutual_fund" ? "Average NAV (₹)" : 
                 isFixed ? "Principal Amount Deployed (₹)" : "Average Buy Price (₹)"}
              </label>
              <input type="number" step="any" className="input-field" placeholder="2500"
                value={form.buy_price} onChange={(e) => setForm({ ...form, buy_price: e.target.value })} required />
            </div>

            <div className={isFixed ? "" : "col-span-2"}>
              <label className="label">{isFixed ? "Start Date" : "Date of Purchase"}</label>
              <input type="date" className="input-field"
                value={form.buy_date} onChange={(e) => setForm({ ...form, buy_date: e.target.value })} required />
            </div>

            {isFixed && (
              <div>
                <label className="label">Interest Rate (% p.a.)</label>
                <input type="number" step="any" className="input-field" placeholder="Optional"
                  value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} />
              </div>
            )}
            
            {isFixed && (
              <div className="col-span-2">
                <label className="label">Maturity Date (Optional)</label>
                <input type="date" className="input-field" 
                  value={form.maturity_date} onChange={(e) => setForm({ ...form, maturity_date: e.target.value })} />
              </div>
            )}
            
          </div>
          
          <div className="flex gap-3 pt-4">
            <button type="button" className="btn-secondary flex-1"
              onClick={() => { setShowAdd(false); resetForm(); }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1">
              {editId ? "Update" : `Add ${investmentTypeLabel(form.investment_type)}`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
