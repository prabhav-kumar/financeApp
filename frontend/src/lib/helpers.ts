/** Format as Indian Rupees */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR",
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(amount).replace(/Rs\.?|INR/, "₹");
}

/** Format number with Indian commas */
export function formatNumber(n: number, decimals = 2): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(n);
}

/** Investment type → readable label */
export function investmentTypeLabel(type: string): string {
  const map: Record<string, string> = {
    stock: "Stock", mutual_fund: "Mutual Fund", etf: "ETF",
    crypto: "Crypto", gold: "Gold", silver: "Silver",
    fixed_deposit: "Fixed Deposit", ppf: "PPF",
  };
  return map[type] || type;
}

/** Chart color palette */
export const CHART_COLORS = [
  "#6366f1", "#14b8a6", "#10b981", "#f59e0b",
  "#a855f7", "#ef4444", "#ec4899", "#06b6d4",
];

/** Rating → badge class */
export function ratingBadge(rating: string): string {
  const good = ["excellent", "good", "low_risk", "well_diversified", "conservative"];
  const warn = ["fair", "moderate"];
  const bad = ["poor", "high_risk", "concentrated", "aggressive", "very_aggressive", "critical"];
  if (good.includes(rating)) return "badge badge-green";
  if (warn.includes(rating)) return "badge badge-amber";
  if (bad.includes(rating)) return "badge badge-red";
  return "badge badge-indigo";
}
