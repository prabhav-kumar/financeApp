"use client";
/**
 * Auth Page — Login & Signup with animated card flip
 */

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Wallet, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, name, password);
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex page-shell" style={{ background: "var(--bg-primary)" }}>
      {/* ── Left: decorative ──────────────────────────── */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[120px]"
          style={{ background: "var(--accent-primary)", top: "10%", left: "10%" }} />
        <div className="absolute w-[400px] h-[400px] rounded-full opacity-15 blur-[100px]"
          style={{ background: "var(--accent-secondary)", bottom: "10%", right: "5%" }} />
        <div className="absolute w-[300px] h-[300px] rounded-full opacity-10 blur-[80px]"
          style={{ background: "var(--accent-purple)", top: "50%", left: "50%" }} />

        <div className="relative z-10 text-center max-w-xl px-10">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8"
            style={{ background: "var(--gradient-primary)" }}>
            <Wallet size={36} color="white" />
          </div>
          <h1 className="text-5xl font-bold mb-5 gradient-text">FinanceIQ</h1>
          <p className="text-lg leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            AI-Powered Personal Finance Intelligence.
            Track, analyse, simulate — all in one place.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-6">
            {["Portfolio Tracking", "Smart Metrics", "AI Advisor"].map((f) => (
              <div key={f} className="rounded-2xl p-5 text-center"
                style={{
                  background: "rgba(99, 102, 241, 0.06)",
                  border: "1px solid var(--border-color)",
                }}>
                <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{f}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right: auth form ─────────────────────────── */}
      <div className="w-full lg:w-[560px] flex items-center justify-center p-8 lg:p-14">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--gradient-primary)" }}>
              <Wallet size={28} color="white" />
            </div>
            <h1 className="text-3xl font-bold gradient-text">FinanceIQ</h1>
          </div>

          <div className="glass-card p-8 md:p-10">
            <h2 className="section-title" style={{ color: "var(--text-primary)" }}>
              {isLogin ? "Welcome back" : "Create account"}
            </h2>
            <p className="section-subtitle">
              {isLogin ? "Sign in to continue to your dashboard" : "Get started with your free account"}
            </p>

            {error && (
              <div className="mt-6 p-4 rounded-2xl text-sm font-medium"
                style={{ background: "rgba(239,68,68,0.1)", color: "var(--accent-red)", border: "1px solid rgba(239,68,68,0.2)" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              {!isLogin && (
                <div>
                  <label className="label">Full Name</label>
                  <input className="input-field" placeholder="John Doe"
                    value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              )}
              <div>
                <label className="label">Email</label>
                <input type="email" className="input-field" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input type={showPw ? "text" : "password"} className="input-field pr-12"
                    placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                  <button type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    onClick={() => setShowPw(!showPw)}>
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-base"
                  disabled={loading}>
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {isLogin ? "Sign In" : "Create Account"}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </form>

            <p className="text-center mt-8 text-sm" style={{ color: "var(--text-muted)" }}>
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button className="font-semibold hover:underline"
                style={{ color: "var(--accent-primary-light)" }}
                onClick={() => { setIsLogin(!isLogin); setError(""); }}>
                {isLogin ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
