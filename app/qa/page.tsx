"use client";

import { useState } from "react";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function QAPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your AI recruiting assistant. Ask me anything about your candidates — skills, experience, best fit for a role, and more.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.answer || data.error || "Sorry, something went wrong." },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error connecting to server." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", color: "#fff", display: "flex", flexDirection: "column", fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1f2937", padding: "16px 24px", display: "flex", alignItems: "center", gap: "12px" }}>
        <Link href="/" style={{ color: "#9ca3af", textDecoration: "none", fontSize: "14px" }}>← Back</Link>
        <span style={{ color: "#facc15", fontSize: "20px" }}>⚡</span>
        <span style={{ fontWeight: 700, fontSize: "18px" }}>DevHire AI</span>
        <span style={{ color: "#6b7280" }}>/</span>
        <span style={{ color: "#d1d5db" }}>Recruiter Q&A</span>
        <span style={{ marginLeft: "auto", background: "#3b0764", color: "#c4b5fd", padding: "2px 10px", borderRadius: "999px", fontSize: "12px" }}>RAG</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 16px", display: "flex", flexDirection: "column", gap: "16px", maxWidth: "760px", width: "100%", margin: "0 auto" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            {msg.role === "assistant" && (
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "10px", flexShrink: 0, fontSize: "14px" }}>⚡</div>
            )}
            <div style={{
              maxWidth: "75%",
              background: msg.role === "user" ? "#7c3aed" : "#1f2937",
              borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              padding: "12px 16px",
              fontSize: "14px",
              lineHeight: "1.6",
              color: "#f9fafb",
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>⚡</div>
            <div style={{ background: "#1f2937", borderRadius: "18px", padding: "12px 16px", fontSize: "14px", color: "#9ca3af" }}>Thinking...</div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ borderTop: "1px solid #1f2937", padding: "16px", background: "#0d0d14" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", display: "flex", gap: "12px" }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask about your candidates..."
            style={{ flex: 1, background: "#1f2937", border: "1px solid #374151", borderRadius: "12px", padding: "12px 16px", fontSize: "14px", color: "#fff", outline: "none" }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            style={{ background: loading || !input.trim() ? "#4b5563" : "#7c3aed", color: "#fff", border: "none", borderRadius: "12px", padding: "12px 20px", fontSize: "14px", fontWeight: 600, cursor: loading || !input.trim() ? "not-allowed" : "pointer" }}
          >
            Send →
          </button>
        </div>
        <p style={{ textAlign: "center", fontSize: "12px", color: "#4b5563", marginTop: "8px" }}>Press Enter to send</p>
      </div>
    </div>
  );
}