"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Sparkles, Loader2, Plus, Trash2, MessageSquare,
  User, ChevronRight, CheckCircle, Bot, Mic, MicOff,
} from "lucide-react";
import { ai as aiApi, type SessionOut, type SessionDetail, type SessionMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const QUICK_PROMPTS = [
  "Am I saving enough?", "Where should I invest next?",
  "How to reduce my debt?", "Can I retire by 45?",
  "Analyse my financial health", "How to improve my savings rate?",
];

function renderContent(content: string) {
  return content.split("\n").map((line, i) => {
    const parts = (text: string) => text.split(/(\*\*.*?\*\*)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={j} style={{ color: "var(--text-primary)", fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
      return <span key={j}>{part}</span>;
    });

    if (line.trim().startsWith("## "))
      return (
        <p key={i} style={{ fontWeight: 700, fontSize: 13, marginTop: 14, marginBottom: 4, color: "var(--indigo)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {line.replace(/^##\s*/, "")}
        </p>
      );

    if (line.trim().startsWith("**") && line.trim().endsWith("**") && !line.includes(" "))
      return <p key={i} style={{ fontWeight: 700, fontSize: 13, marginTop: 10, marginBottom: 2, color: "var(--text-primary)" }}>{line.replace(/\*\*/g, "")}</p>;

    if (line.trim().startsWith("Problem:") || line.trim().startsWith("Impact:") || line.trim().startsWith("Action:")) {
      const [label, ...rest] = line.split(":");
      return (
        <div key={i} style={{ display: "flex", gap: 6, margin: "3px 0 3px 8px" }}>
          <span style={{ fontWeight: 600, fontSize: 12, color: "var(--text-muted)", minWidth: 52 }}>{label}:</span>
          <span style={{ fontSize: 13 }}>{parts(rest.join(":"))}</span>
        </div>
      );
    }

    if (line.trim().startsWith("• ") || line.trim().startsWith("- "))
      return (
        <div key={i} style={{ display: "flex", gap: 8, paddingLeft: 8, margin: "3px 0" }}>
          <span style={{ color: "var(--indigo)", flexShrink: 0 }}>•</span>
          <span style={{ fontSize: 13 }}>{parts(line.trim().replace(/^[•\-]\s*/, ""))}</span>
        </div>
      );

    if (line.trim() === "---")
      return <hr key={i} style={{ margin: "10px 0", border: "none", borderTop: "1px solid var(--border)" }} />;

    if (line.trim() === "") return <div key={i} style={{ height: 5 }} />;

    return <p key={i} style={{ margin: "2px 0", fontSize: 13 }}>{parts(line)}</p>;
  });
}

export default function AiChatPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionOut[]>([]);
  const [activeSession, setActiveSession] = useState<SessionDetail | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef<string>("");
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);

  useEffect(() => {
    setVoiceSupported(!!(window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition: unknown }).webkitSpeechRecognition));
  }, []);

  const toggleVoice = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognitionAPI =
      window.SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition: typeof SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("");
      transcriptRef.current = transcript;  // store in ref, not just state
      setInput(transcript);
    };

    recognition.onend = () => {
      setListening(false);
      const text = transcriptRef.current.trim();
      transcriptRef.current = "";          // clear ref immediately to prevent double-fire
      if (text) {
        setInput("");
        handleSendText(text);
      }
    };

    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [listening]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeSession?.messages]);

  const loadSessions = useCallback(async () => {
    try {
      const list = await aiApi.listSessions();
      setSessions(list);
      return list;
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    loadSessions().then((list) => {
      if (list.length > 0) openSession(list[0].id);
    });
  }, []);

  const openSession = async (id: number) => {
    const detail = await aiApi.getSession(id);
    setActiveSession(detail);
  };

  const newChat = async () => {
    const session = await aiApi.createSession();
    setSessions((prev) => [{ id: session.id, title: session.title, created_at: session.created_at, updated_at: session.updated_at, message_count: session.messages.length }, ...prev]);
    setActiveSession(session);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const deleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await aiApi.deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSession?.id === id) {
      const remaining = sessions.filter((s) => s.id !== id);
      if (remaining.length > 0) openSession(remaining[0].id);
      else setActiveSession(null);
    }
  };

  const saveTitle = async (id: number) => {
    if (!editTitle.trim()) return;
    await aiApi.renameSession(id, editTitle.trim());
    setSessions((prev) => prev.map((s) => s.id === id ? { ...s, title: editTitle.trim() } : s));
    if (activeSession?.id === id) setActiveSession((prev) => prev ? { ...prev, title: editTitle.trim() } : prev);
    setEditingId(null);
  };

  const handleSendText = async (text: string) => {
    if (!text || loading || !activeSession) return;

    const tempUserMsg: SessionMessage = { id: Date.now(), role: "user", content: text, created_at: new Date().toISOString() };
    setActiveSession((prev) => prev ? { ...prev, messages: [...prev.messages, tempUserMsg] } : prev);
    setInput("");
    setLoading(true);

    try {
      const result = await aiApi.chat(activeSession.id, text);
      const newTitle = result.session_title || activeSession.title;

      setActiveSession((prev) => prev ? { ...prev, messages: [...prev.messages, result.message], title: newTitle } : prev);
      setSessions((prev) => prev.map((s) =>
        s.id === activeSession.id
          ? { ...s, title: newTitle, message_count: s.message_count + 2, updated_at: new Date().toISOString() }
          : s
      ));
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      const errMsgObj: SessionMessage = { id: Date.now() + 1, role: "assistant", content: `⚠️ Error: ${errMsg}`, created_at: new Date().toISOString() };
      setActiveSession((prev) => prev ? { ...prev, messages: [...prev.messages, errMsgObj] } : prev);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => { const text = input.trim(); if (text) handleSendText(text); };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 100px)", gap: 0, overflow: "hidden" }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: sidebarOpen ? 240 : 0, minWidth: sidebarOpen ? 240 : 0,
        transition: "all 220ms ease", overflow: "hidden",
        display: "flex", flexDirection: "column",
        background: "var(--bg-card)", borderRight: "1px solid var(--border)",
        borderRadius: "var(--r-lg) 0 0 var(--r-lg)",
      }}>
        {/* New Chat button */}
        <div style={{ padding: "12px 10px 8px" }}>
          <button onClick={newChat} className="btn btn-primary" style={{ width: "100%", fontSize: 13, gap: 8 }}>
            <Plus size={14} /> New Chat
          </button>
        </div>

        <div style={{ padding: "4px 10px 6px" }}>
          <p style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Recent Chats
          </p>
        </div>

        {/* Session list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 6px 12px" }}>
          {loadingSessions ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 36, borderRadius: 8, margin: "4px 0" }} />
            ))
          ) : sessions.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 6px" }}>No chats yet</p>
          ) : sessions.map((s) => (
            <div key={s.id}
              onClick={() => openSession(s.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 8px",
                borderRadius: 8, cursor: "pointer", margin: "2px 0",
                background: activeSession?.id === s.id ? "rgba(99,102,241,0.1)" : "transparent",
                border: activeSession?.id === s.id ? "1px solid rgba(99,102,241,0.2)" : "1px solid transparent",
                transition: "all 150ms ease",
              }}
              onMouseEnter={(e) => { if (activeSession?.id !== s.id) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { if (activeSession?.id !== s.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <MessageSquare size={13} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              {editingId === s.id ? (
                <input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => saveTitle(s.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveTitle(s.id); if (e.key === "Escape") setEditingId(null); }}
                  onClick={(e) => e.stopPropagation()}
                  style={{ flex: 1, fontSize: 12, background: "transparent", border: "none", outline: "none", color: "var(--text-primary)" }} />
              ) : (
                <span onDoubleClick={(e) => { e.stopPropagation(); setEditingId(s.id); setEditTitle(s.title); }}
                  style={{ flex: 1, fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.title}
                </span>
              )}
              <button onClick={(e) => deleteSession(s.id, e)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 2, opacity: 0.4, flexShrink: 0 }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.opacity = "1"}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.opacity = "0.4"}>
                <Trash2 size={11} color="var(--red)" />
              </button>
            </div>
          ))}
        </div>

        {/* User info */}
        <div style={{ padding: "10px 12px", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.full_name}
          </p>
        </div>
      </div>

      {/* ── Main chat area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen((v) => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-muted)", display: "flex" }}>
            <ChevronRight size={16} style={{ transform: sidebarOpen ? "rotate(180deg)" : "none", transition: "transform 220ms ease" }} />
          </button>
          <div style={{ width: 32, height: 32, borderRadius: "var(--r-sm)", background: "var(--grad-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bot size={16} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
              {activeSession?.title || "DhanSathi AI"}
            </p>
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>Virtual CFO · GAN-verified responses</p>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>
          {!activeSession ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--grad-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={24} color="white" />
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Your Virtual CFO</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", maxWidth: 320 }}>
                Start a new chat or select a previous conversation from the sidebar.
              </p>
              <button onClick={newChat} className="btn btn-primary" style={{ gap: 8 }}>
                <Plus size={14} /> Start New Chat
              </button>
            </div>
          ) : (
            <>
              {activeSession.messages.map((msg) => (
                <div key={msg.id} className="fade-in"
                  style={{ display: "flex", gap: 10, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: "var(--r-sm)", flexShrink: 0,
                    background: msg.role === "user" ? "var(--grad-teal)" : "var(--grad-primary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {msg.role === "user" ? <User size={14} color="white" /> : <Sparkles size={14} color="white" />}
                  </div>
                  <div style={{ maxWidth: "82%" }}>
                    <div style={{
                      padding: msg.role === "user" ? "10px 14px" : "14px 16px",
                      borderRadius: "var(--r-lg)",
                      background: msg.role === "user" ? "rgba(99,102,241,0.12)" : "var(--bg-card)",
                      border: `1px solid ${msg.role === "user" ? "rgba(99,102,241,0.25)" : "var(--border)"}`,
                      fontSize: 13, lineHeight: 1.7, color: "var(--text-primary)",
                    }}>
                      {msg.role === "user"
                        ? <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
                        : renderContent(msg.content)}
                    </div>
                    <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3, paddingLeft: 4 }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="fade-in" style={{ display: "flex", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "var(--r-sm)", background: "var(--grad-primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Sparkles size={14} color="white" />
                  </div>
                  <div className="card card-p-sm" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Loader2 size={14} style={{ color: "var(--indigo)", animation: "spin 1s linear infinite" }} />
                    <div>
                      <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Analysing your financial data...</p>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>GAN verification in progress</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick prompts on new session */}
              {activeSession.messages.length <= 1 && !loading && (
                <div className="fade-in" style={{ marginTop: 8 }}>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Suggested questions
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {QUICK_PROMPTS.map((p) => (
                      <button key={p} onClick={() => { setInput(p); inputRef.current?.focus(); }}
                        style={{ fontSize: 12, padding: "6px 12px", borderRadius: "var(--r-md)", background: "rgba(99,102,241,0.07)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", transition: "all 200ms var(--ease)" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.14)"; (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.07)"; (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        {activeSession && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
            {/* Listening indicator */}
            {listening && (
              <div className="fade-in" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 12px", borderRadius: "var(--r-md)", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--red)", animation: "pulse 1s ease-in-out infinite" }} />
                <span style={{ fontSize: 12, color: "var(--red)", fontWeight: 500 }}>Listening... speak now</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>{input || "—"}</span>
              </div>
            )}
            <div className="card" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px" }}>
              <input ref={inputRef} type="text" value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={listening ? "Listening..." : "Ask your Virtual CFO anything..."}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: "var(--text-primary)" }}
                disabled={loading || listening} />

              {/* Mic button */}
              {voiceSupported && (
                <button
                  onClick={toggleVoice}
                  disabled={loading}
                  title={listening ? "Stop listening" : "Speak your question"}
                  style={{
                    width: 34, height: 34, borderRadius: "var(--r-sm)", flexShrink: 0,
                    border: listening ? "none" : "1px solid var(--border)",
                    background: listening ? "rgba(239,68,68,0.15)" : "transparent",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 200ms var(--ease)",
                  }}>
                  {listening
                    ? <MicOff size={15} color="var(--red)" />
                    : <Mic size={15} color="var(--text-muted)" />}
                </button>
              )}

              {/* Send button */}
              <button onClick={handleSend} disabled={loading || !input.trim() || listening}
                style={{
                  width: 34, height: 34, borderRadius: "var(--r-sm)", flexShrink: 0,
                  border: input.trim() ? "none" : "1px solid var(--border)",
                  background: input.trim() ? "var(--grad-primary)" : "transparent",
                  cursor: input.trim() ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: input.trim() ? 1 : 0.35, transition: "all 200ms var(--ease)",
                }}>
                <Send size={15} color={input.trim() ? "white" : "#64748b"} />
              </button>
            </div>
            <p style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <CheckCircle size={9} /> Responses verified by dual-LLM GAN system
            </p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }`}</style>
    </div>
  );
}
