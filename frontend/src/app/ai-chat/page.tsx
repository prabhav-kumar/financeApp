"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Loader2, RefreshCw, Zap, Info, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { ai as aiApi, type AiChatMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  provider?: string;
  model?: string | null;
}

const QUICK_PROMPTS = [
  "Am I saving enough?",
  "Where should I invest next?",
  "How to reduce my debt?",
  "Can I retire by 45?",
  "Analyse my financial health",
  "How to improve my savings rate?",
];

function renderContent(content: string) {
  return content.split("\n").map((line, i) => {
    const parts = line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={j} style={{ color: "var(--text-primary)", fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
      return <span key={j}>{part}</span>;
    });

    if (line.trim().startsWith("• ") || line.trim().startsWith("- ") || line.trim().startsWith("* "))
      return <div key={i} style={{ display: "flex", gap: 8, paddingLeft: 8, margin: "2px 0" }}>
        <span style={{ color: "var(--indigo)" }}>•</span><span>{parts}</span>
      </div>;

    if (/^\d+\.\s/.test(line.trim()))
      return <div key={i} style={{ display: "flex", gap: 8, paddingLeft: 8, margin: "2px 0" }}>
        <span style={{ color: "var(--indigo)" }}>{line.trim().match(/^\d+/)?.[0]}.</span>
        <span>{parts.slice(1)}</span>
      </div>;

    if (line.trim().startsWith("## "))
      return <p key={i} style={{ fontWeight: 700, fontSize: 14, marginTop: 12, marginBottom: 4, color: "var(--text-primary)" }}>
        {line.replace(/^#+\s*/, "")}
      </p>;

    if (line.trim().startsWith("# "))
      return <p key={i} className="gradient-text" style={{ fontWeight: 700, fontSize: 16, marginTop: 12, marginBottom: 4 }}>
        {line.replace(/^#+\s*/, "")}
      </p>;

    if (line.trim() === "---")
      return <hr key={i} style={{ margin: "10px 0", border: "none", borderTop: "1px solid var(--border)" }} />;

    if (line.trim() === "")
      return <div key={i} style={{ height: 6 }} />;

    return <p key={i} style={{ margin: "2px 0" }}>{parts}</p>;
  });
}

export default function AiChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([{
    id: "welcome", role: "assistant",
    content: `Hello ${user?.full_name?.split(" ")[0] || "there"}! 👋\n\nI'm your **Virtual Finance Assistant** — an AI financial advisor powered by your real financial data.\n\nEvery answer I give is grounded in your actual income, expenses, investments, and loans. No generic advice — just personalised insights.\n\n**Ask me anything about your finances!**`,
    timestamp: new Date(),
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window !== "undefined") {
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speakText = (text: string) => {
    if (!synthRef.current) return;

    // Stop any ongoing speech
    synthRef.current.cancel();

    // Clean text for speech (remove markdown, emojis, etc.)
    const cleanText = text
      .replace(/[#*_~`]/g, "")
      .replace(/\[.*?\]\(.*?\)/g, "")
      .replace(/[👋⚠️💡📊💰🎯]/g, "")
      .replace(/\n+/g, ". ");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history: AiChatMessage[] = messages
        .filter((m) => m.id !== "welcome").slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));
      history.push({ role: "user", content: text });

      const result = await aiApi.chat(text, history.slice(0, -1));
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: result.response, timestamp: new Date(),
        provider: result.provider, model: result.model,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Auto-speak the response if voice is enabled
      if (voiceEnabled) {
        speakText(result.response);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: `⚠️ **Error communicating with the AI advisor.**\n\n${errMsg}\n\nPlease make sure:\n• The backend is running on port 8000\n• Your Gemini/OpenAI API key is configured in \`.env\`\n• You have some financial data added`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 100px)", gap: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}
        className="fade-up">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "var(--r-md)",
            background: "var(--grad-primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Bot size={20} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>DhanSathi Chat</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Zap size={11} style={{ color: "var(--green)" }} />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>AI-Powered · Data-Grounded</span>
            </div>
          </div>
        </div>
        <button className="btn btn-secondary" style={{ fontSize: 12, padding: "7px 14px" }}
          onClick={() => setMessages([messages[0]])}>
          <RefreshCw size={13} /> New Chat
        </button>
        <button
          className="btn btn-secondary"
          style={{ fontSize: 12, padding: "7px 14px" }}
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          title={voiceEnabled ? "Disable voice output" : "Enable voice output"}
        >
          {voiceEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 4, paddingBottom: 8 }}>
        {messages.map((msg) => (
          <div key={msg.id} className="fade-in"
            style={{ display: "flex", gap: 10, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
            {/* Avatar */}
            <div style={{
              width: 32, height: 32, borderRadius: "var(--r-sm)", flexShrink: 0,
              background: msg.role === "user" ? "var(--grad-teal)" : "var(--grad-primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {msg.role === "user" ? <User size={15} color="white" /> : <Sparkles size={15} color="white" />}
            </div>

            {/* Bubble */}
            <div style={{ maxWidth: "78%", display: "flex", flexDirection: "column" }}>
              <div style={{
                padding: "10px 14px", borderRadius: "var(--r-lg)",
                background: msg.role === "user" ? "rgba(99,102,241,0.12)" : "var(--bg-card)",
                border: `1px solid ${msg.role === "user" ? "rgba(99,102,241,0.25)" : "var(--border)"}`,
                fontSize: 13, lineHeight: 1.65, color: "var(--text-primary)",
              }}>
                {msg.role === "user"
                  ? <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
                  : renderContent(msg.content)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, paddingLeft: 4 }}>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                {msg.provider && msg.provider !== "none" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Info size={9} style={{ color: "var(--text-muted)" }} />
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      {msg.provider}{msg.model ? ` · ${msg.model}` : ""}
                    </span>
                  </div>
                )}
                {msg.role === "assistant" && msg.id !== "welcome" && (
                  <button
                    onClick={() => isSpeaking ? stopSpeaking() : speakText(msg.content)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 2,
                      display: "flex",
                      alignItems: "center",
                      opacity: 0.6,
                      transition: "opacity 200ms",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
                    title={isSpeaking ? "Stop speaking" : "Read aloud"}
                  >
                    {isSpeaking ? <VolumeX size={11} style={{ color: "var(--text-muted)" }} /> : <Volume2 size={11} style={{ color: "var(--text-muted)" }} />}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="fade-in" style={{ display: "flex", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "var(--r-sm)",
              background: "var(--grad-primary)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Sparkles size={15} color="white" />
            </div>
            <div className="card card-p-sm" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Loader2 size={15} style={{ color: "var(--indigo)", animation: "spin 1s linear infinite" }} />
              <div>
                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Analysing your financial data...</p>
                <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                  Reading income, expenses, investments, loans & metrics
                </p>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts */}
      {messages.length <= 1 && (
        <div style={{ marginBottom: 12, flexShrink: 0 }} className="fade-in">
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Suggested questions
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {QUICK_PROMPTS.map((p) => (
              <button key={p}
                onClick={() => { setInput(p); inputRef.current?.focus(); }}
                style={{
                  fontSize: 12, padding: "6px 12px", borderRadius: "var(--r-md)",
                  background: "rgba(99,102,241,0.07)", border: "1px solid var(--border)",
                  color: "var(--text-secondary)", cursor: "pointer",
                  transition: "all 200ms var(--ease)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.14)";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.07)";
                  (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
                }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="card" style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", flexShrink: 0,
      }}>
        <button
          onClick={toggleVoiceInput}
          disabled={loading}
          style={{
            width: 34,
            height: 34,
            borderRadius: "var(--r-sm)",
            border: isListening ? "none" : "1px solid var(--border)",
            background: isListening ? "var(--grad-primary)" : "transparent",
            cursor: loading ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: loading ? 0.35 : 1,
            transition: "all 200ms var(--ease)",
            flexShrink: 0,
            animation: isListening ? "pulse 1.5s ease-in-out infinite" : "none",
          }}
          title={isListening ? "Stop listening" : "Start voice input"}
        >
          {isListening ? <MicOff size={15} color="white" /> : <Mic size={15} color="#64748b" />}
        </button>
        <input ref={inputRef} type="text" value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Ask your Virtual CFO anything..."
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            fontSize: 13, color: "var(--text-primary)",
          }}
          disabled={loading} />
        <button onClick={handleSend} disabled={loading || !input.trim()}
          style={{
            width: 34, height: 34, borderRadius: "var(--r-sm)",
            border: input.trim() ? "none" : "1px solid var(--border)",
            background: input.trim() ? "var(--grad-primary)" : "transparent",
            cursor: input.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: input.trim() ? 1 : 0.35, transition: "all 200ms var(--ease)",
            flexShrink: 0,
          }}>
          <Send size={15} color={input.trim() ? "white" : "#64748b"} />
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
