"use client";
/**
 * TopNavbar — Horizontal navigation bar with logo and menu items
 *
 * Responsive: full navbar on desktop, collapsible on mobile.
 * Active route highlighted with gradient indicator.
 */

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  PieChart,
  Landmark,
  TrendingUp,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Wallet,
  Receipt,
  DollarSign,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/income", label: "Income", icon: DollarSign },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/portfolio", label: "Portfolio", icon: PieChart },
  { href: "/loans", label: "Loans", icon: Landmark },
  { href: "/simulation", label: "Simulate", icon: TrendingUp },
  { href: "/ai-chat", label: "AI Advisor", icon: MessageSquare },
];

export default function TopNavbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = user?.full_name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <>
      {/* ── Desktop Top Navbar ────────────────────────────── */}
      <nav className="hidden lg:flex fixed top-0 left-0 right-0 z-50"
        style={{
          height: "var(--navbar-h)",
          background: "rgba(10, 14, 26, 0.85)",
          borderBottom: "1px solid rgba(226, 232, 240, 0.08)",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}>

        <div className="content-container h-full flex items-center justify-between">

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-all duration-300 group">
          <div className="relative w-9 h-9 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
            style={{ background: "var(--gradient-primary)", boxShadow: "0 6px 20px rgba(99, 102, 241, 0.3)" }}>
            <Wallet size={20} color="white" strokeWidth={2.5} />
            <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.2), transparent)" }} />
          </div>
          <span className="font-bold text-xl gradient-text">FinanceIQ</span>
        </Link>

        {/* Nav Items */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                className="relative flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 group"
                style={{
                  color: active ? "var(--accent-primary-light)" : "var(--text-secondary)",
                  textDecoration: "none",
                }}>
                <Icon size={17} strokeWidth={active ? 2.5 : 2} />
                <span className="font-medium text-sm">{item.label}</span>
                {active && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ background: "var(--gradient-primary)" }} />
                )}
                {!active && (
                  <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: "rgba(99, 102, 241, 0.05)" }} />
                )}
              </Link>
            );
          })}
        </div>

        {/* User Section */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all duration-300"
            style={{ background: "rgba(99, 102, 241, 0.05)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: "var(--gradient-accent)", color: "white", boxShadow: "0 4px 12px rgba(20, 184, 166, 0.3)" }}>
              {initials}
            </div>
            <div className="hidden xl:block">
              <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                {user?.full_name}
              </p>
              <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                {user?.email}
              </p>
            </div>
          </div>
          <button onClick={logout} title="Logout"
            className="p-2 rounded-lg transition-all duration-300 hover:bg-red-500/10 text-slate-400 hover:text-red-400 flex-shrink-0 group">
            <LogOut size={17} className="group-hover:scale-110 transition-transform duration-300" />
          </button>
        </div>

        </div>
      </nav>

      {/* ── Mobile Top Navbar ─────────────────────────────── */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 z-50"
        style={{
          height: "var(--navbar-h)",
          background: "rgba(10, 14, 26, 0.85)",
          borderBottom: "1px solid rgba(226, 232, 240, 0.08)",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}>

        <div className="content-container h-full flex items-center justify-between">

        {/* Mobile Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-90 transition-all duration-300 group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-105"
            style={{ background: "var(--gradient-primary)", boxShadow: "0 4px 16px rgba(99, 102, 241, 0.3)" }}>
            <Wallet size={16} color="white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg gradient-text">FinanceIQ</span>
        </Link>

        {/* Mobile Menu Button */}
        <button onClick={() => setMobileOpen(!mobileOpen)} 
          className="text-slate-300 p-2 rounded-lg hover:bg-white/5 transition-all duration-300">
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        </div>
      </nav>

      {/* ── Mobile Dropdown Menu ──────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed top-[var(--navbar-h)] left-0 right-0 z-40 animate-fade-in border-b"
          style={{
            background: "var(--bg-secondary)",
            borderColor: "var(--border-color)",
            boxShadow: "var(--shadow-card)"
          }}>
          <div className="content-container py-6 space-y-4">
            {/* Nav Items */}
            <div className="space-y-2">
              {navItems.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                    className="relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all"
                    style={{
                      color: active ? "var(--accent-primary-light)" : "var(--text-secondary)",
                      textDecoration: "none",
                    }}>
                    <Icon size={20} />
                    <span className="font-medium">{item.label}</span>
                    {active && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full"
                        style={{ background: "var(--gradient-primary)" }} />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* User Section */}
            <div className="pt-4 border-t" style={{ borderColor: "var(--border-color)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: "var(--gradient-accent)", color: "white" }}>
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {user?.full_name}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {user?.email}
                    </p>
                  </div>
                </div>
                <button onClick={logout} title="Logout"
                  className="p-2 rounded-lg transition-colors hover:bg-red-500/10 text-slate-400 hover:text-red-400">
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
