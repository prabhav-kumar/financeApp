"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard, DollarSign, Receipt, PieChart,
  Landmark, TrendingUp, MessageSquare, LogOut, Wallet,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/income", label: "Income", icon: DollarSign },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/portfolio", label: "Portfolio", icon: PieChart },
  { href: "/loans", label: "Loans", icon: Landmark },
  { href: "/simulation", label: "Simulate", icon: TrendingUp },
  { href: "/ai-chat", label: "AI Advisor", icon: MessageSquare },
];

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const initials = user?.full_name
    ?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "U";

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: "20px 20px 16px" }}>
        <Link href="/dashboard" onClick={onClose}
          style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "var(--grad-primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
            flexShrink: 0,
          }}>
            <Wallet size={18} color="white" strokeWidth={2.5} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em" }}
            className="gradient-text">
            DhanSathi
          </span>
        </Link>
      </div>

      {/* Divider */}
      <div className="divider" style={{ margin: "0 16px" }} />

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
        <p style={{
          fontSize: 10, fontWeight: 700, color: "var(--text-muted)",
          textTransform: "uppercase", letterSpacing: "0.1em",
          padding: "8px 10px 6px",
        }}>
          Navigation
        </p>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} onClick={onClose}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: "var(--r-md)",
                marginBottom: 2, textDecoration: "none",
                color: active ? "var(--indigo-light)" : "var(--text-secondary)",
                background: active ? "rgba(99,102,241,0.12)" : "transparent",
                borderLeft: active ? "2px solid var(--indigo)" : "2px solid transparent",
                fontWeight: active ? 600 : 500,
                fontSize: 13,
                transition: "all 200ms var(--ease)",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                }
              }}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="divider" style={{ margin: "0 16px" }} />
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "var(--grad-teal)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "white", flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.full_name}
            </p>
            <p style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.email}
            </p>
          </div>
          <button onClick={logout} title="Logout" className="btn-danger-ghost" style={{ flexShrink: 0 }}>
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
