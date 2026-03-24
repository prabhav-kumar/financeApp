"use client";
/**
 * AppShell — Authenticated layout with sidebar
 * Wraps dashboard, portfolio, loans, simulation, and ai-chat pages.
 */

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import TopNavbar from "@/components/TopNavbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg-primary)" }}>
        <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen page-shell" style={{ background: "var(--bg-primary)" }}>
      <TopNavbar />
      <main
        style={{
          paddingTop: "var(--content-pt)",
          paddingBottom: "var(--content-pb)",
          minHeight: "100vh",
        }}
      >
        <div className="content-container py-6 md:py-8 lg:py-10">
          {children}
        </div>
      </main>
    </div>
  );
}
