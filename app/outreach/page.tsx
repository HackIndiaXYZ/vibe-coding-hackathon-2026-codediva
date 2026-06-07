"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Email {
  _id: string;
  candidateName: string;
  candidateEmail: string;
  subject: string;
  body: string;
  type: "interview_invite" | "rejection";
  status: string;
}

function OutreachContent() {
  const router = useRouter();
  const [emails, setEmails]     = useState<Email[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<Email | null>(null);
  const [filter, setFilter]     = useState("all");
  const [copied, setCopied]     = useState(false);

  useEffect(() => {
    fetch("/api/outreach", {
      headers: { "x-api-key": process.env.NEXT_PUBLIC_API_SECRET_KEY || "" },
    })
      .then(r => r.json())
      .then(d => { if (d.success) setEmails(d.emails); })
      .finally(() => setLoading(false));
  }, []);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const invites    = emails.filter(e => e.type === "interview_invite");
  const rejections = emails.filter(e => e.type === "rejection");
  const filtered   = filter === "all" ? emails
    : filter === "invite" ? invites : rejections;

  return (
    <div style={{ minHeight: "100vh" }}>
      <div className="mesh-bg" />

      {/* Nav */}
      <nav className="nav">
        <button
          onClick={() => router.back()}
          className="btn btn-ghost"
          style={{ padding: "6px 12px", fontSize: 13 }}
        >← Back</button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="nav-logo-icon" style={{ width: 28, height: 28, fontSize: 14 }}>⚡</div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>DevHire AI</span>
          <span style={{ color: "var(--text3)" }}>/</span>
          <span style={{ color: "var(--text2)", fontSize: 14 }}>Outreach</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <span className="badge badge-green">{invites.length} Invites</span>
          <span className="badge badge-red">{rejections.length} Rejections</span>
        </div>
      </nav>

      <main style={{
        position: "relative", zIndex: 1,
        maxWidth: 1100, margin: "0 auto",
        padding: "80px 24px 40px",
      }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Outreach Emails</h1>
          <p style={{ color: "var(--text2)", fontSize: 14 }}>
            AI-drafted, personalized emails ready to send
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[
            { key: "all",       label: `All (${emails.length})` },
            { key: "invite",    label: `✓ Invites (${invites.length})` },
            { key: "rejection", label: `✕ Rejections (${rejections.length})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => { setFilter(key); setSelected(null); }} style={{
              background: filter === key ? "var(--accent)" : "var(--bg3)",
              color: filter === key ? "#fff" : "var(--text2)",
              border: `1px solid ${filter === key ? "var(--accent)" : "var(--border)"}`,
              borderRadius: 8, padding: "7px 14px", fontSize: 13,
              cursor: "pointer", transition: "all 0.15s",
              fontFamily: "'Instrument Sans', sans-serif",
            }}>{label}</button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 16 }}>

          {/* Email list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text3)" }}>
                Loading...
              </div>
            ) : filtered.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text3)" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                No emails found
              </div>
            ) : (
              filtered.map(e => (
                <div
                  key={e._id}
                  onClick={() => setSelected(e)}
                  className="card"
                  style={{
                    padding: "12px 14px", cursor: "pointer",
                    border: selected?._id === e._id
                      ? "1px solid rgba(124,109,250,0.4)" : undefined,
                    background: selected?._id === e._id
                      ? "rgba(124,109,250,0.06)" : undefined,
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 14 }}>
                      {e.type === "interview_invite" ? "✅" : "❌"}
                    </span>
                    <span style={{
                      fontSize: 13, fontWeight: 600, flex: 1,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{e.candidateName}</span>
                  </div>
                  <div style={{
                    fontSize: 12, color: "var(--text3)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{e.subject}</div>
                </div>
              ))
            )}
          </div>

          {/* Email preview */}
          <div className="card" style={{ minHeight: 500 }}>
            {selected ? (
              <div style={{ padding: 28 }}>
                {/* Header */}
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start", marginBottom: 24,
                }}>
                  <div>
                    <div style={{ marginBottom: 10 }}>
                      <span className={`badge ${selected.type === "interview_invite" ? "badge-green" : "badge-red"}`}>
                        {selected.type === "interview_invite" ? "✓ Interview Invite" : "✕ Rejection"}
                      </span>
                    </div>
                    <h3 style={{
                      fontSize: 18, fontWeight: 700,
                      fontFamily: "'Syne', sans-serif", marginBottom: 3,
                    }}>{selected.candidateName}</h3>
                    <p style={{
                      fontSize: 13, color: "var(--text3)",
                      fontFamily: "'DM Mono', monospace",
                    }}>{selected.candidateEmail}</p>
                  </div>
                  <button
                    onClick={() => copy(`Subject: ${selected.subject}\n\n${selected.body}`)}
                    className="btn btn-ghost"
                    style={{ fontSize: 13, padding: "8px 14px" }}
                  >
                    {copied ? "✓ Copied" : "⎘ Copy"}
                  </button>
                </div>

                {/* Subject */}
                <div style={{
                  background: "var(--bg3)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: "12px 16px", marginBottom: 12,
                }}>
                  <div style={{
                    fontSize: 10, color: "var(--text3)", marginBottom: 4,
                    fontFamily: "'DM Mono', monospace",
                    textTransform: "uppercase", letterSpacing: "0.08em",
                  }}>Subject</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{selected.subject}</div>
                </div>

                {/* Body */}
                <div style={{
                  background: "var(--bg3)", border: "1px solid var(--border)",
                  borderRadius: 10, padding: "18px 20px",
                  fontSize: 14, lineHeight: 1.8,
                  color: "var(--text2)", whiteSpace: "pre-wrap",
                }}>
                  {selected.body}
                </div>
              </div>
            ) : (
              <div style={{
                height: "100%", minHeight: 400,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                color: "var(--text3)", gap: 12,
              }}>
                <div style={{ fontSize: 48 }}>✉</div>
                <p style={{ fontSize: 14 }}>Select an email to preview</p>
                <p style={{ fontSize: 12, color: "var(--text3)" }}>
                  Click any email from the list on the left
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function OutreachPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: 80, textAlign: "center", color: "var(--text3)" }}>
        Loading...
      </div>
    }>
      <OutreachContent />
    </Suspense>
  );
}