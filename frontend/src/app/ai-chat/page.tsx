"use client";
/**
 * AI Chat Page — Virtual CFO Interface
 *
 * Full conversational AI financial advisor that:
 *  - Sends user messages + history to /ai/chat
 *  - Displays LLM responses with rich markdown rendering
 *  - Maintains multi-turn conversation context
 *  - Shows provider/model info for transparency
 */

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Loader2, RefreshCw, Zap, Info } from "lucide-react";
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

export default function AiChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello ${user?.full_name?.split(" ")[0] || "there"}! 👋\n\nI'm your **Virtual Finance Assistant** — an AI financial advisor powered by your real financial data.\n\nEvery answer I give is grounded in your actual income, expenses, investments, and loans. No generic advice — just personalised insights.\n\n**Ask me anything about your finances!**`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Build conversation history (exclude welcome message, last 20 messages)
      const history: AiChatMessage[] = messages
        .filter((m) => m.id !== "welcome")
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));

      // Add the current user message to history
      history.push({ role: "user", content: text });

      // Call the AI endpoint
      const result = await aiApi.chat(text, history.slice(0, -1));

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.response,
        timestamp: new Date(),
        provider: result.provider,
        model: result.model,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      console.error("AI chat error:", err);
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `⚠️ **Error communicating with the AI advisor.**\n\n${errMsg}\n\nPlease make sure:\n• The backend is running on port 8000\n• Your Gemini/OpenAI API key is configured in \`.env\`\n• You have some financial data added (income, expenses, investments)`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setMessages([messages[0]]); // Keep welcome message
  };

  const quickPrompts = [
    "Am I saving enough?",
    "Where should I invest next?",
    "How to reduce my debt?",
    "Can I retire by 45?",
    "Analyse my financial health",
    "How to improve my savings rate?",
  ];

  /**
   * Render markdown-ish content:
   *  - **bold** → <strong>
   *  - Bullet points
   *  - Line breaks
   */
  const renderContent = (content: string) => {
    return content.split("\n").map((line, lineIdx) => {
      // Process bold markers
      const parts = line.split(/(\*\*.*?\*\*)/g).map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-semibold" style={{ color: "var(--text-primary)" }}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      });

      // Bullet points
      if (line.trim().startsWith("• ") || line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        return (
          <div key={lineIdx} className="flex gap-2 pl-2 my-0.5">
            <span style={{ color: "var(--accent-primary)" }}>•</span>
            <span>{parts}</span>
          </div>
        );
      }

      // Numbered lists
      if (/^\d+\.\s/.test(line.trim())) {
        return (
          <div key={lineIdx} className="flex gap-2 pl-2 my-0.5">
            <span style={{ color: "var(--accent-primary)" }}>{line.trim().match(/^\d+/)?.[0]}.</span>
            <span>{parts.slice(1)}</span>
          </div>
        );
      }

      // Headings (## or ###)
      if (line.trim().startsWith("## ")) {
        return <p key={lineIdx} className="font-bold text-base mt-3 mb-1" style={{ color: "var(--text-primary)" }}>{line.replace(/^#+\s*/, "")}</p>;
      }
      if (line.trim().startsWith("# ")) {
        return <p key={lineIdx} className="font-bold text-lg mt-3 mb-1 gradient-text">{line.replace(/^#+\s*/, "")}</p>;
      }

      // Horizontal rule
      if (line.trim() === "---" || line.trim() === "***") {
        return <hr key={lineIdx} className="my-3 border-0 h-px" style={{ background: "var(--border-color)" }} />;
      }

      // Empty line
      if (line.trim() === "") {
        return <div key={lineIdx} className="h-2" />;
      }

      return <p key={lineIdx} className="my-0.5">{parts}</p>;
    });
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--gradient-primary)" }}>
            <Bot size={20} color="white" />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              Virtual CFO
            </h1>
            <div className="flex items-center gap-1.5">
              <Zap size={12} className="text-emerald-400" />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                AI-Powered • Data-Grounded
              </span>
            </div>
          </div>
        </div>
        <button onClick={handleNewChat}
          className="btn-secondary flex items-center gap-2 text-xs py-2">
          <RefreshCw size={14} /> New Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
        {messages.map((msg) => (
          <div key={msg.id}
            className={`flex gap-3 animate-fade-in ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {/* Avatar */}
            <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
              style={{
                background: msg.role === "user" ? "var(--gradient-accent)" : "var(--gradient-primary)",
              }}>
              {msg.role === "user"
                ? <User size={16} color="white" />
                : <Sparkles size={16} color="white" />}
            </div>
            {/* Bubble */}
            <div className="flex flex-col max-w-[80%]">
              <div className="rounded-2xl px-4 py-3"
                style={{
                  background: msg.role === "user"
                    ? "rgba(99, 102, 241, 0.15)"
                    : "var(--bg-card)",
                  border: `1px solid ${msg.role === "user" ? "var(--border-glow)" : "var(--border-color)"}`,
                }}>
                <div className="text-sm leading-relaxed"
                  style={{ color: "var(--text-primary)" }}>
                  {msg.role === "user"
                    ? <p className="whitespace-pre-wrap">{msg.content}</p>
                    : renderContent(msg.content)}
                </div>
              </div>
              {/* Meta info */}
              <div className="flex items-center gap-3 mt-1 px-1">
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
                {msg.provider && msg.provider !== "none" && (
                  <div className="flex items-center gap-1">
                    <Info size={10} style={{ color: "var(--text-muted)" }} />
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {msg.provider}{msg.model ? ` · ${msg.model}` : ""}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
              style={{ background: "var(--gradient-primary)" }}>
              <Sparkles size={16} color="white" />
            </div>
            <div className="glass-card px-4 py-3 flex items-center gap-3">
              <Loader2 size={16} className="animate-spin" style={{ color: "var(--accent-primary)" }} />
              <div>
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Analysing your financial data...
                </span>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Reading income, expenses, investments, loans & metrics
                </p>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick prompts (show only at start) */}
      {messages.length <= 1 && (
        <div className="mb-3 animate-fade-in" style={{ animationDelay: "300ms" }}>
          <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
            Suggested questions
          </p>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((p) => (
              <button key={p} onClick={() => { setInput(p); inputRef.current?.focus(); }}
                className="text-xs px-3 py-2 rounded-xl transition-all hover:scale-[1.02]"
                style={{
                  background: "rgba(99,102,241,0.08)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-secondary)",
                }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="glass-card p-3 flex items-center gap-3">
        <input ref={inputRef} type="text" value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your Virtual CFO anything..."
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: "var(--text-primary)" }}
          disabled={loading} />
        <button onClick={handleSend} disabled={loading || !input.trim()}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{
            background: input.trim() ? "var(--gradient-primary)" : "transparent",
            border: input.trim() ? "none" : "1px solid var(--border-color)",
            opacity: input.trim() ? 1 : 0.4,
          }}>
          <Send size={16} color={input.trim() ? "white" : "#64748b"} />
        </button>
      </div>
    </div>
  );
}
