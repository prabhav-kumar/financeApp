"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Sidebar from "@/components/Sidebar";
import { Menu, Wallet, X } from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "var(--bg)",
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: "50%",
          border: "3px solid rgba(99,102,241,0.2)",
          borderTopColor: "var(--indigo)",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar onClose={() => setSidebarOpen(false)} />

      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "show" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile sidebar (separate instance for mobile) */}
      <div style={{
        position: "fixed", top: 0, left: 0, bottom: 0,
        width: "var(--sidebar-w)", zIndex: 50,
        transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 300ms var(--ease)",
        display: "none",
      }}
        className="mobile-sidebar-wrapper"
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main */}
      <div className="main-content">
        {/* Mobile topbar */}
        <header className="topbar">
          <button className="btn-ghost" onClick={() => setSidebarOpen(true)}>
            <Menu size={20} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "var(--grad-primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Wallet size={14} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 16 }} className="gradient-text">DhanSathi</span>
          </div>
          <div style={{ width: 36 }} />
        </header>

        <main className="page-wrapper">
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 1023px) {
          .mobile-sidebar-wrapper { display: block !important; }
        }
      `}</style>
    </div>
  );
}
