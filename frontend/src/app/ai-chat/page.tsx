"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Sparkles, Loader2, Plus, Trash2, MessageSquare,
  User, ChevronRight, CheckCircle, Bot, Mic, MicOff, Volume2, VolumeX,
} from "lucide-react";
import { ai as aiApi, type SessionOut, type SessionDetail, type SessionMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const QUICK_PROMPTS = [
  "Am I saving enough?", "Where should I invest next?",
  "How to reduce my debt?", "Can I retire by 45?",
  "Analyse my financial health", "How to improve my savings rate?",
];

// Strip markdown for TTS — clean text only
function stripMarkdown(text: string): string {
  return text
    .replace(/##\s*/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^[•\-]\s*/gm, "")
    .replace(/Problem:|Impact:|Action:/g, "")
    .replace(/---/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderContent(content: string) {
  return content.split("\n").map((line, i) => {
    const parts = (text: string) => text.split(/(\*\*.*?\*\*)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={j} style={{ color: "var(--text-primary)", fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      return <span key={j}>{part}</span>;
    });

    if (line.trim().startsWith("## "))
      return (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 16, marginBottom: 6 }}>
          <div style={{ width: 3, height: 14, borderRadius: 2, background: "var(--indigo)", flexShrink: 0 }} />
          <p style={{ fontWeight: 700, fontSize: 11, color: "var(--indigo)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
            {line.replace(/^##\s*/, "")}
          </p>
        </div>
      );

    if (line.trim().startsWith("Problem:") || line.trim().startsWith("Impact:") || line.trim().startsWith("Action:")) {
      const colonIdx = line.indexOf(":");
      const label = line.slice(0, colonIdx);
      const val = line.slice(colonIdx + 1).trim();
      const colors: Record<string, string> = { Problem: "#ef4444", Impact: "#f59e0b", Action: "#10b981" };
      return (
        <div key={i} style={{ display: "flex", gap: 8, margin: "4px 0 4px 10px", alignItems: "flex-start" }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: colors[label] || "var(--text-muted)", minWidth: 48, paddingTop: 2, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
          <span style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6 }}>{parts(val)}</span>
        </div>
      );
    }

    if (line.trim().startsWith("• ") || line.trim().startsWith("- "))
      return (
        <div key={i} style={{ display: "flex", gap: 8, paddingLeft: 10, margin: "3px 0", alignItems: "flex-start" }}>
          <span style={{ color: "var(--indigo)", flexShrink: 0, marginTop: 2, fontSize: 10 }}>▸</span>
          <span style={{ fontSize: 13, lineHeight: 1.6 }}>{parts(line.trim().replace(/^[•\-]\s*/, ""))}</span>
        </div>
      );

    if (line.trim() === "---") return <hr key={i} style={{ margin: "10px 0", border: "none", borderTop: "1px solid var(--border)" }} />;
    if (line.trim() === "") return <div key={i} style={{ height: 4 }} />;
    return <p key={i} style={{ margin: "2px 0", fontSize: 13, lineHeight: 1.65 }}>{parts(line)}</p>;
  });
}

// TTS speaker button for each AI message
function SpeakButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);

  const toggle = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utt = new SpeechSynthesisUtterance(stripMarkdown(text));
    utt.lang = "en-IN";
    utt.rate = 0.95;
    utt.pitch = 1;
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    uttRef.current = utt;
    setSpeaking(true);
    window.speechSynthesis.speak(utt);
  };

  // Stop if component unmounts
  useEffect(() => () => { window.speechSynthesis.cancel(); }, []);

  return (
    <button onClick={toggle} title={speaking ? "Stop reading" : "Read aloud"}
      style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", display: "flex", alignItems: "center", opacity: speaking ? 1 : 0.45, transition: "opacity 150ms ease", color: speaking ? "var(--indigo)" : "var(--text-muted)" }}>
      {speaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
    </button>
  );
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

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeSession?.messages]);

  const loadSessions = useCallback(async () => {
    try { const list = await aiApi.listSessions(); setSessions(list); return list; }
    finally { setLoadingSessions(false); }
  }, []);

  useEffect(() => {
    loadSessions().then((list) => { if (list.length > 0) openSession(list[0].id); });
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
    const remaining = sessions.filter((s) => s.id !== id);
    setSessions(remaining);
    if (activeSession?.id === id) {
      if (remaining.length > 0) openSession(remaining[0].id);
      else setActiveSession(null);
    }
  };

  const saveTitle = async (id: number) => {
    if (!editTitle.trim()) { setEditingId(null); return; }
    await aiApi.renameSession(id, editTitle.trim());
    setSessions((prev) => prev.map((s) => s.id === id ? { ...s, title: editTitle.trim() } : s));
    if (activeSession?.id === id) setActiveSession((prev) => prev ? { ...prev, title: editTitle.trim() } : prev);
    setEditingId(null);
  };

  const handleSendText = useCallback(async (text: string) => {
    if (!text || loading || !activeSession) return;
    const tempMsg: SessionMessage = { id: Date.now(), role: "user", content: text, created_at: new Date().toISOString() };
    setActiveSession((prev) => prev ? { ...prev, messages: [...prev.messages, tempMsg] } : prev);
    setInput("");
    setLoading(true);
    try {
      const result = await aiApi.chat(activeSession.id, text);
      const newTitle = result.session_title || activeSession.title;
      setActiveSession((prev) => prev ? { ...prev, messages: [...prev.messages, result.message], title: newTitle } : prev);
      setSessions((prev) => prev.map((s) => s.id === activeSession.id
        ? { ...s, title: newTitle, message_count: s.message_count + 2, updated_at: new Date().toISOString() } : s));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setActiveSession((prev) => prev ? { ...prev, messages: [...prev.messages, { id: Date.now() + 1, role: "assistant", content: `⚠️ Error: ${msg}`, created_at: new Date().toISOString() }] } : prev);
    } finally { setLoading(false); }
  }, [loading, activeSession]);

  const handleSend = () => { const t = input.trim(); if (t) handleSendText(t); };

  // Voice input — continuous mode so it doesn't auto-stop mid-sentence
  const toggleVoice = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SR = window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = "en-IN";
    r.interimResults = true;
    r.continuous = true;          // keeps listening until user stops manually
    r.maxAlternatives = 1;

    r.onstart = () => setListening(true);

    r.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      const combined = (transcriptRef.current + " " + final).trim();
      if (final) transcriptRef.current = combined;
      setInput((combined + " " + interim).trim());
    };

    r.onend = () => {
      // Only send if user manually stopped (listening was true when onend fires)
      setListening(false);
      const t = transcriptRef.current.trim();
      transcriptRef.current = "";
      if (t) { setInput(""); handleSendText(t); }
    };

    r.onerror = (e) => {
      // Ignore no-speech errors — don't kill the session
      if (e.error === "no-speech") return;
      setListening(false);
    };

    recognitionRef.current = r;
    r.start();
  }, [listening, handleSendText]);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 100px)", overflow: "hidden" }}>

      {/* ── Sidebar — reduced size ── */}
      <div style={{ width: sidebarOpen ? 200 : 0, minWidth: sidebarOpen ? 200 : 0, transition: "all 220ms ease", overflow: "hidden", display: "flex", flexDirection: "column", background: "var(--bg-card)", borderRight: "1px solid var(--border)", borderRadius: "var(--r-lg) 0 0 var(--r-lg)" }}>

        {/* New Chat — compact */}
        <div style={{ padding: "8px 8px 4px" }}>
          <button onClick={newChat} className="btn btn-primary" style={{ width: "100%", fontSize: 11, padding: "6px 10px", gap: 6 }}>
            <Plus size={12} /> New Chat
          </button>
        </div>

        <div style={{ padding: "4px 8px 4px" }}>
          <p style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>History</p>
        </div>

        {/* Session list — compact */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 4px 8px" }}>
          {loadingSessions ? Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 28, borderRadius: 6, margin: "3px 0" }} />
          )) : sessions.length === 0 ? (
            <p style={{ fontSize: 11, color: "var(--text-muted)", padding: "6px 6px" }}>No chats yet</p>
          ) : sessions.map((s) => (
            <div key={s.id} onClick={() => openSession(s.id)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 6px", borderRadius: 6, cursor: "pointer", margin: "2px 0", background: activeSession?.id === s.id ? "rgba(99,102,241,0.1)" : "transparent", border: activeSession?.id === s.id ? "1px solid rgba(99,102,241,0.2)" : "1px solid transparent", transition: "all 150ms ease" }}
              onMouseEnter={(e) => { if (activeSession?.id !== s.id) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { if (activeSession?.id !== s.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              <MessageSquare size={11} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              {editingId === s.id ? (
                <input autoFocus value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => saveTitle(s.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveTitle(s.id); if (e.key === "Escape") setEditingId(null); }}
                  onClick={(e) => e.stopPropagation()}
                  style={{ flex: 1, fontSize: 11, background: "transparent", border: "none", outline: "none", color: "var(--text-primary)" }} />
              ) : (
                <span onDoubleClick={(e) => { e.stopPropagation(); setEditingId(s.id); setEditTitle(s.title); }}
                  style={{ flex: 1, fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.title}
                </span>
              )}
              <button onClick={(e) => deleteSession(s.id, e)} style={{ background: "none", border: "none", cursor: "pointer", padding: 1, opacity: 0.35, flexShrink: 0 }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.opacity = "1"}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.opacity = "0.35"}>
                <Trash2 size={10} color="var(--red)" />
              </button>
            </div>
          ))}
        </div>

        <div style={{ padding: "8px 10px", borderTop: "1px solid var(--border)" }}>
          <p style={{ fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.full_name}</p>
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen((v) => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-muted)", display: "flex" }}>
            <ChevronRight size={15} style={{ transform: sidebarOpen ? "rotate(180deg)" : "none", transition: "transform 220ms ease" }} />
          </button>
          <div style={{ width: 28, height: 28, borderRadius: "var(--r-sm)", background: "var(--grad-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Bot size={14} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{activeSession?.title || "DhanSathi AI"}</p>
            <p style={{ fontSize: 10, color: "var(--text-muted)" }}>Virtual CFO · GAN-verified · Dual-LLM</p>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {!activeSession ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 60 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--grad-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={20} color="white" />
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Your Virtual CFO</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", maxWidth: 280 }}>Start a new chat or select a previous conversation.</p>
              <button onClick={newChat} className="btn btn-primary" style={{ gap: 6, fontSize: 12, padding: "7px 14px" }}><Plus size={12} /> Start New Chat</button>
            </div>
          ) : (
            <>
              {activeSession.messages.map((msg) => (
                <div key={msg.id} className="fade-in" style={{ display: "flex", gap: 8, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
                  <div style={{ width: 26, height: 26, borderRadius: "var(--r-sm)", flexShrink: 0, background: msg.role === "user" ? "var(--grad-teal)" : "var(--grad-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {msg.role === "user" ? <User size={12} color="white" /> : <Sparkles size={12} color="white" />}
                  </div>
                  <div style={{ maxWidth: "84%" }}>
                    {/* Top row: timestamp + TTS for AI messages */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {msg.role === "assistant" && <SpeakButton text={msg.content} />}
                    </div>
                    <div style={{ padding: msg.role === "user" ? "9px 13px" : "12px 15px", borderRadius: "var(--r-lg)", background: msg.role === "user" ? "rgba(99,102,241,0.12)" : "var(--bg-card)", border: `1px solid ${msg.role === "user" ? "rgba(99,102,241,0.25)" : "var(--border)"}`, fontSize: 13, lineHeight: 1.65, color: "var(--text-primary)" }}>
                      {msg.role === "user" ? <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{msg.content}</p> : renderContent(msg.content)}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="fade-in" style={{ display: "flex", gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "var(--r-sm)", background: "var(--grad-primary)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Sparkles size={12} color="white" /></div>
                  <div className="card card-p-sm" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Loader2 size={13} style={{ color: "var(--indigo)", animation: "spin 1s linear infinite" }} />
                    <div>
                      <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Analysing your financial data...</p>
                      <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>GAN verification in progress</p>
                    </div>
                  </div>
                </div>
              )}

              {activeSession.messages.length <= 1 && !loading && (
                <div className="fade-in" style={{ marginTop: 6 }}>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Suggested</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {QUICK_PROMPTS.map((p) => (
                      <button key={p} onClick={() => { setInput(p); inputRef.current?.focus(); }}
                        style={{ fontSize: 11, padding: "5px 10px", borderRadius: "var(--r-md)", background: "rgba(99,102,241,0.07)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer", transition: "all 200ms var(--ease)" }}
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
          <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
            {listening && (
              <div className="fade-in" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, padding: "5px 10px", borderRadius: "var(--r-md)", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--red)", animation: "pulse 1s ease-in-out infinite" }} />
                <span style={{ fontSize: 11, color: "var(--red)", fontWeight: 600 }}>Listening — click mic to stop & send</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{input || "—"}</span>
              </div>
            )}
            <div className="card" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px" }}>
              <input ref={inputRef} type="text" value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={listening ? "Listening..." : "Ask your Virtual CFO anything..."}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 13, color: "var(--text-primary)" }}
                disabled={loading || listening} />
              {voiceSupported && (
                <button onClick={toggleVoice} disabled={loading} title={listening ? "Stop & send" : "Voice input"}
                  style={{ width: 32, height: 32, borderRadius: "var(--r-sm)", flexShrink: 0, border: listening ? "none" : "1px solid var(--border)", background: listening ? "rgba(239,68,68,0.15)" : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 200ms var(--ease)" }}>
                  {listening ? <MicOff size={14} color="var(--red)" /> : <Mic size={14} color="var(--text-muted)" />}
                </button>
              )}
              <button onClick={handleSend} disabled={loading || !input.trim() || listening}
                style={{ width: 32, height: 32, borderRadius: "var(--r-sm)", flexShrink: 0, border: input.trim() ? "none" : "1px solid var(--border)", background: input.trim() ? "var(--grad-primary)" : "transparent", cursor: input.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", opacity: input.trim() ? 1 : 0.35, transition: "all 200ms var(--ease)" }}>
                <Send size={14} color={input.trim() ? "white" : "#64748b"} />
              </button>
            </div>
            <p style={{ fontSize: 9, color: "var(--text-muted)", textAlign: "center", marginTop: 5, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <CheckCircle size={8} /> Dual-LLM GAN verified
            </p>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}
