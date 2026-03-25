"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Wallet, Eye, EyeOff, ArrowRight, TrendingUp, Shield, Bot } from "lucide-react";

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
      if (isLogin) await login(email, password);
      else await signup(email, name, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: TrendingUp, label: "Portfolio Tracking", desc: "Real-time P&L across all assets" },
    { icon: Shield, label: "Financial Health", desc: "Savings rate, DTI & risk metrics" },
    { icon: Bot, label: "AI Advisor", desc: "Personalised insights from your data" },
  ];

  return (
    <div style={{
      minHeight: "100vh", display: "flex",
      background: "var(--bg)", position: "relative", zIndex: 1,
    }}>
      {/* Left panel */}
      <div style={{
        flex: 1, display: "none", alignItems: "center", justifyContent: "center",
        padding: "60px 48px", position: "relative",
      }}
        className="auth-left"
      >
        {/* Glow orbs */}
        <div style={{
          position: "absolute", width: 400, height: 400, borderRadius: "50%",
          background: "var(--indigo)", opacity: 0.08, filter: "blur(100px)",
          top: "5%", left: "5%", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", width: 300, height: 300, borderRadius: "50%",
          background: "var(--teal)", opacity: 0.06, filter: "blur(80px)",
          bottom: "10%", right: "10%", pointerEvents: "none",
        }} />

        <div style={{ position: "relative", maxWidth: 440 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: "var(--grad-primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 24px rgba(99,102,241,0.4)",
            }}>
              <Wallet size={24} color="white" />
            </div>
            <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em" }}
              className="gradient-text">
              DhanSathi
            </span>
          </div>

          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: 16 }}>
            Your finances,<br />
            <span className="gradient-text">intelligently managed.</span>
          </h1>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 48 }}>
            AI-powered personal finance platform. Track every rupee, analyse your health, and get advice grounded in your real data.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: "16px 20px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-lg)",
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "var(--r-sm)",
                  background: "rgba(99,102,241,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Icon size={18} style={{ color: "var(--indigo-light)" }} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{label}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{
        width: "100%", maxWidth: 480, display: "flex",
        alignItems: "center", justifyContent: "center",
        padding: "40px 32px",
        borderLeft: "1px solid var(--border)",
      }}
        className="auth-right"
      >
        <div style={{ width: "100%", maxWidth: 400 }} className="fade-up">
          {/* Mobile logo */}
          <div style={{ textAlign: "center", marginBottom: 32 }} className="auth-mobile-logo">
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "var(--grad-primary)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              marginBottom: 12,
            }}>
              <Wallet size={22} color="white" />
            </div>
            <div style={{ fontSize: 24, fontWeight: 800 }} className="gradient-text">DhanSathi</div>
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
            {isLogin ? "Welcome back" : "Create your account"}
          </h2>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 28 }}>
            {isLogin ? "Sign in to your dashboard" : "Start managing your finances smarter"}
          </p>

          {error && (
            <div style={{
              padding: "12px 16px", borderRadius: "var(--r-md)", marginBottom: 20,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              color: "var(--red)", fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {!isLogin && (
              <div>
                <label className="label">Full Name</label>
                <input className="input" placeholder="John Doe"
                  value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} className="input"
                  style={{ paddingRight: 44 }}
                  placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                <button type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-muted)", display: "flex",
                  }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary"
              style={{ width: "100%", padding: "12px", marginTop: 4 }}
              disabled={loading}>
              {loading ? (
                <span style={{
                  width: 18, height: 18, borderRadius: "50%",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "white",
                  animation: "spin 0.8s linear infinite",
                  display: "inline-block",
                }} />
              ) : (
                <>
                  {isLogin ? "Sign In" : "Create Account"}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>or continue with</span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          {/* Google OAuth button */}
          <a href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/google`}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              width: "100%", padding: "11px 16px",
              borderRadius: "var(--r-md)", border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-primary)",
              fontSize: 14, fontWeight: 500, textDecoration: "none",
              transition: "all 200ms var(--ease)", cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = "transparent"}
          >
            {/* Google SVG icon */}
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </a>

          <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--text-muted)" }}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--indigo-light)", fontWeight: 600, fontSize: 13 }}
              onClick={() => { setIsLogin(!isLogin); setError(""); }}>
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .auth-left { display: none; }
        .auth-mobile-logo { display: block; }
        @media (min-width: 900px) {
          .auth-left { display: flex !important; }
          .auth-right { border-left: 1px solid var(--border); }
          .auth-mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  );
}
