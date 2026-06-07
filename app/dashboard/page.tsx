"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Candidate {
  candidateId: string;
  name: string;
  email: string;
  skills: string[];
  experience_years: number;
  vectorScore: number;
  aiScore: number;
  finalScore: number;
  strengths: string[];
  gaps: string[];
  reasoning: string;
  recommendation: "Strong Yes" | "Yes" | "Maybe" | "No";
}

function scoreColor(s: number) {
  if (s >= 75) return "var(--green)";
  if (s >= 50) return "var(--amber)";
  return "var(--red)";
}

function recBadge(r: string) {
  if (r === "Strong Yes") return "badge-green";
  if (r === "Yes")        return "badge-teal";
  if (r === "Maybe")      return "badge-amber";
  return "badge-red";
}

function CandidateCard({ c, rank }: { c: Candidate; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const color = scoreColor(c.finalScore);

  return (
    <div className="card card-glow" style={{
      marginBottom: 10,
      animation: `fadeUp 0.4s ease ${rank * 0.05}s both`,
    }}>
      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>

          {/* Rank */}
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: rank <= 3 ? "rgba(124,109,250,0.2)" : "var(--bg4)",
            border: `1px solid ${rank <= 3 ? "rgba(124,109,250,0.4)" : "var(--border)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700,
            fontFamily: "'DM Mono', monospace",
            color: rank <= 3 ? "var(--accent2)" : "var(--text3)",
          }}>#{rank}</div>

          {/* Avatar */}
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: `hsl(${(rank * 57) % 360}, 50%, 20%)`,
            border: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 15, fontWeight: 700,
            color: `hsl(${(rank * 57) % 360}, 70%, 70%)`,
          }}>{c.name.charAt(0).toUpperCase()}</div>

          {/* Name + email */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, fontFamily: "'Syne', sans-serif" }}>{c.name}</div>
            <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 1 }}>{c.email}</div>
          </div>

          {/* Score */}
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{
              fontSize: 26, fontWeight: 800, color,
              fontFamily: "'Syne', sans-serif", lineHeight: 1,
            }}>{c.finalScore}</div>
            <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "'DM Mono', monospace" }}>/100</div>
          </div>

          {/* Recommendation */}
          <span className={`badge ${recBadge(c.recommendation)}`}>
            {c.recommendation}
          </span>

          {/* Expand */}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--text3)", fontSize: 16, lineHeight: 1,
              padding: "0 4px", flexShrink: 0,
            }}
          >{expanded ? "▲" : "▼"}</button>
        </div>

        {/* Score bar */}
        <div className="score-track" style={{ marginTop: 12 }}>
          <div className="score-fill" style={{
            width: `${c.finalScore}%`,
            background: `linear-gradient(90deg, ${color}66, ${color})`,
          }} />
        </div>

        {/* Skills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
          {(c.skills || []).slice(0, 7).map(s => (
            <span key={s} style={{
              fontSize: 11, padding: "2px 8px", borderRadius: 6,
              background: "var(--bg4)", border: "1px solid var(--border)",
              color: "var(--text2)", fontFamily: "'DM Mono', monospace",
            }}>{s}</span>
          ))}
          {(c.skills?.length || 0) > 7 && (
            <span style={{ fontSize: 11, color: "var(--text3)", padding: "2px 4px" }}>
              +{c.skills.length - 7}
            </span>
          )}
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div style={{
          padding: "16px 20px",
          borderTop: "1px solid var(--border)",
          display: "grid", gap: 16,
        }}>
          {/* Score breakdown */}
          <div style={{ display: "flex", gap: 28 }}>
            {[
              { label: "Vector Match", val: `${c.vectorScore}%` },
              { label: "AI Score",     val: `${c.aiScore}/100` },
              { label: "Experience",   val: `${c.experience_years}y` },
            ].map(({ label, val }) => (
              <div key={label}>
                <div style={{
                  fontSize: 10, color: "var(--text3)", marginBottom: 3,
                  fontFamily: "'DM Mono', monospace",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Syne', sans-serif" }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Reasoning */}
          {c.reasoning && (
            <p style={{
              fontSize: 13, color: "var(--text2)", lineHeight: 1.7,
              padding: "10px 14px", background: "var(--bg3)", borderRadius: 8,
              borderLeft: "3px solid var(--accent)",
            }}>{c.reasoning}</p>
          )}

          {/* Strengths + Gaps */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{
                fontSize: 10, color: "var(--green)", marginBottom: 8,
                fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
                fontFamily: "'DM Mono', monospace",
              }}>✓ Strengths</div>
              {(c.strengths || []).map(s => (
                <div key={s} style={{
                  fontSize: 13, color: "var(--text2)", marginBottom: 4,
                  display: "flex", gap: 6, lineHeight: 1.5,
                }}>
                  <span style={{ color: "var(--green)", flexShrink: 0 }}>·</span>{s}
                </div>
              ))}
            </div>
            <div>
              <div style={{
                fontSize: 10, color: "var(--amber)", marginBottom: 8,
                fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase",
                fontFamily: "'DM Mono', monospace",
              }}>⚠ Gaps</div>
              {(c.gaps || []).length > 0
                ? c.gaps.map(g => (
                    <div key={g} style={{
                      fontSize: 13, color: "var(--text2)", marginBottom: 4,
                      display: "flex", gap: 6, lineHeight: 1.5,
                    }}>
                      <span style={{ color: "var(--amber)", flexShrink: 0 }}>·</span>{g}
                    </div>
                  ))
                : <div style={{ fontSize: 13, color: "var(--text3)" }}>None identified</div>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SUGGESTIONS = [
  "Who's the strongest backend engineer?",
  "Who has the most relevant experience?",
  "Any candidates with startup background?",
  "Who has led a team before?",
];

function DashboardContent() {
  const params   = useSearchParams();
  const router   = useRouter();
  const jobId    = params.get("jobId") || "";
  const jobTitle = decodeURIComponent(params.get("jobTitle") || "Role");

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState("All");
  const [messages, setMessages]     = useState<{ q: string; a: string }[]>([]);
  const [question, setQuestion]     = useState("");
  const [asking, setAsking]         = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(`eval_${jobId}`);
    if (stored) setCandidates(JSON.parse(stored));
    setLoading(false);
  }, [jobId]);

  const ask = async () => {
    if (!question.trim() || asking) return;
    const q = question.trim();
    setQuestion("");
    setAsking(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_API_SECRET_KEY || "",
        },
        body: JSON.stringify({ question: q, job_id: jobId }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { q, a: data.answer || "No answer" }]);
    } catch {
      toast.error("Q&A failed");
    } finally {
      setAsking(false);
    }
  };

  const FILTERS   = ["All", "Strong Yes", "Yes", "Maybe", "No"];
  const filtered  = filter === "All" ? candidates : candidates.filter(c => c.recommendation === filter);
  const strongYes = candidates.filter(c => c.recommendation === "Strong Yes").length;
  const avg       = candidates.length
    ? Math.round(candidates.reduce((a, c) => a + c.finalScore, 0) / candidates.length)
    : 0;

  return (
    <div style={{ minHeight: "100vh" }}>
      <div className="mesh-bg" />

      {/* Nav */}
      <nav className="nav">
        <button onClick={() => router.push("/")} className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 13 }}>
          ← Back
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="nav-logo-icon" style={{ width: 28, height: 28, fontSize: 14 }}>⚡</div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>DevHire AI</span>
          <span style={{ color: "var(--text3)" }}>/</span>
          <span style={{ color: "var(--text2)", fontSize: 14 }}>{jobTitle}</span>
        </div>
        <button
          onClick={() => router.push(`/outreach?jobId=${jobId}`)}
          className="btn btn-primary"
          style={{ marginLeft: "auto", padding: "8px 16px", fontSize: 13 }}
        >
          ✉ View Outreach
        </button>
      </nav>

      <main style={{
        position: "relative", zIndex: 1,
        maxWidth: 1200, margin: "0 auto",
        padding: "80px 24px 40px",
      }}>
        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Ranked",     value: candidates.length,          icon: "👥", color: "var(--accent)" },
            { label: "Top Score",  value: candidates[0]?.finalScore || 0, icon: "🏆", color: "var(--green)" },
            { label: "Avg Score",  value: avg,                        icon: "📊", color: "var(--teal)" },
            { label: "Strong Yes", value: strongYes,                  icon: "⭐", color: "var(--amber)" },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10,
                background: `${color}15`, border: `1px solid ${color}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, flexShrink: 0,
              }}>{icon}</div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'Syne', sans-serif" }}>{value}</div>
                <div style={{
                  fontSize: 10, color: "var(--text3)",
                  fontFamily: "'DM Mono', monospace",
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Two-col layout */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>

          {/* Candidates */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>Candidates</h2>
              <div style={{ display: "flex", gap: 5, marginLeft: "auto" }}>
                {FILTERS.map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    background: filter === f ? "var(--accent)" : "var(--bg3)",
                    color: filter === f ? "#fff" : "var(--text2)",
                    border: `1px solid ${filter === f ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: 8, padding: "4px 10px", fontSize: 12,
                    cursor: "pointer", transition: "all 0.15s",
                    fontFamily: "'Instrument Sans', sans-serif",
                  }}>{f}</button>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: 60, color: "var(--text3)" }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--text3)" }}>
                {candidates.length === 0 ? (
                  <><div style={{ fontSize: 40, marginBottom: 12 }}>📭</div><p>No candidates yet — run the pipeline from home.</p></>
                ) : (
                  <><div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div><p>No candidates match this filter.</p></>
                )}
              </div>
            ) : (
              filtered.map((c, i) => (
                <CandidateCard key={c.candidateId} c={c} rank={i + 1} />
              ))
            )}
          </div>

          {/* Recruiter Chat */}
          <div style={{ position: "sticky", top: 80 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Recruiter Q&A</h2>
            <div className="card" style={{ display: "flex", flexDirection: "column", height: 500 }}>

              {/* Chat header */}
              <div style={{
                padding: "14px 18px", borderBottom: "1px solid var(--border)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: "var(--green)",
                  boxShadow: "0 0 8px var(--green)",
                }} />
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Syne', sans-serif" }}>
                  AI Assistant
                </span>
                <span className="badge badge-accent" style={{ marginLeft: "auto", fontSize: 10 }}>RAG</span>
              </div>

              {/* Messages */}
              <div style={{
                flex: 1, overflowY: "auto",
                padding: "14px 16px",
                display: "flex", flexDirection: "column", gap: 10,
              }}>
                {messages.length === 0 && (
                  <>
                    <div style={{ fontSize: 13, color: "var(--text3)", textAlign: "center", padding: "16px 0 8px" }}>
                      Ask anything about your candidates
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {SUGGESTIONS.map(s => (
                        <button key={s} onClick={() => setQuestion(s)} style={{
                          background: "var(--bg3)", border: "1px solid var(--border)",
                          borderRadius: 8, padding: "5px 10px", fontSize: 11,
                          color: "var(--text2)", cursor: "pointer",
                          fontFamily: "'Instrument Sans', sans-serif",
                          transition: "border-color 0.15s",
                        }}
                        onMouseOver={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                        onMouseOut={e => (e.currentTarget.style.borderColor = "var(--border)")}
                        >{s}</button>
                      ))}
                    </div>
                  </>
                )}
                {messages.map((m, i) => (
                  <div key={i}>
                    <div style={{
                      background: "rgba(124,109,250,0.1)",
                      border: "1px solid rgba(124,109,250,0.2)",
                      borderRadius: "10px 10px 4px 10px",
                      padding: "8px 12px", fontSize: 13, marginBottom: 6,
                    }}>{m.q}</div>
                    <div style={{
                      background: "var(--bg3)", border: "1px solid var(--border)",
                      borderRadius: "4px 10px 10px 10px",
                      padding: "10px 12px", fontSize: 13,
                      color: "var(--text2)", lineHeight: 1.6, whiteSpace: "pre-wrap",
                    }}>{m.a}</div>
                  </div>
                ))}
                {asking && (
                  <div style={{
                    background: "var(--bg3)", border: "1px solid var(--border)",
                    borderRadius: "4px 10px 10px 10px",
                    padding: "10px 12px", fontSize: 13, color: "var(--text3)",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <div className="spinner" style={{ width: 12, height: 12, borderWidth: 1.5 }} />
                    Searching candidates...
                  </div>
                )}
              </div>

              {/* Input */}
              <div style={{
                padding: "12px 14px", borderTop: "1px solid var(--border)",
                display: "flex", gap: 8,
              }}>
                <input
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && ask()}
                  placeholder="Ask about any candidate..."
                  disabled={asking}
                  style={{ flex: 1, fontSize: 13 }}
                />
                <button
                  onClick={ask}
                  disabled={asking || !question.trim()}
                  className="btn btn-primary"
                  style={{ padding: "10px 14px", flexShrink: 0, fontSize: 16 }}
                >→</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: 80, textAlign: "center", color: "var(--text3)" }}>
        Loading...
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}