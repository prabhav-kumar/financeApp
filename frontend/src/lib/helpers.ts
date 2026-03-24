/**
 * helpers.ts — Shared utility functions
 */

/** Format a number as Indian Rupees */
export function formatCurrency(amount: number): string {
  // Format with Indian numbering system
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  
  // Replace ₹ with ₹ (ensure proper rupee symbol)
  return formatted.replace(/Rs\.?|INR/, "₹");
}

/** Format number with commas (Indian style) */
export function formatNumber(n: number, decimals = 2): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

/** Get a human-readable label for investment types */
export function investmentTypeLabel(type: string): string {
  const map: Record<string, string> = {
    stock: "Stock",
    mutual_fund: "Mutual Fund",
    etf: "ETF",
    crypto: "Crypto",
    gold: "Gold",
    silver: "Silver",
    fixed_deposit: "Fixed Deposit",
    ppf: "PPF",
  };
  return map[type] || type;
}

/** Color palette for charts */
export const CHART_COLORS = [
  "#6366f1", "#22d3ee", "#10b981", "#f59e0b",
  "#a855f7", "#ef4444", "#ec4899", "#14b8a6",
];

/** Rating to badge style */
export function ratingBadge(rating: string): string {
  const good = ["excellent", "good", "low_risk", "well_diversified", "conservative"];
  const warn = ["fair", "moderate"];
  const bad = ["poor", "high_risk", "concentrated", "aggressive", "very_aggressive", "critical"];

  if (good.includes(rating)) return "badge-success";
  if (warn.includes(rating)) return "badge-warning";
  if (bad.includes(rating)) return "badge-danger";
  return "badge-info";
}
