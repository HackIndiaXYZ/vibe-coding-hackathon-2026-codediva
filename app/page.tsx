"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";

const STEPS = [
  { icon: "⬆", label: "Upload" },
  { icon: "⚡", label: "Parse" },
  { icon: "🧠", label: "Embed" },
  { icon: "🎯", label: "Rank" },
  { icon: "✉", label: "Outreach" },
];

export default function HomePage() {
  const router = useRouter();
  const [jdText, setJdText]     = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany]   = useState("");
  const [files, setFiles]       = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [currentStep, setStep]  = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: File[]) => {
    const pdfs = newFiles.filter(f =>
      f.name.endsWith(".pdf") || f.type === "application/pdf"
    );
    if (!pdfs.length) { toast.error("Only PDF files accepted"); return; }
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...pdfs.filter(f => !names.has(f.name))];
    });
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (i: number) =>
    setFiles(prev => prev.filter((_, idx) => idx !== i));

  const fmt = (b: number) =>
    b < 1024 * 1024
      ? `${(b / 1024).toFixed(0)}KB`
      : `${(b / 1024 / 1024).toFixed(1)}MB`;

  const run = async () => {
    if (!jdText.trim())   return toast.error("Job description required");
    if (!jobTitle.trim()) return toast.error("Job title required");
    if (!files.length)    return toast.error("Upload at least one resume");

    setLoading(true);
    const jobId = `job_${Date.now()}`;

    try {
      // Step 1 — Ingest
      setStep(0);
      const fd = new FormData();
      files.forEach(f => fd.append("resumes", f));
      const r1 = await fetch("/api/ingest", {
        method: "POST",
        headers: { "x-api-key": process.env.NEXT_PUBLIC_API_SECRET_KEY || "" },
        body: fd,
      });
      const d1 = await r1.json();
      if (!d1.success) throw new Error(d1.error || "Ingest failed");
      toast.success(`${d1.count} resume${d1.count !== 1 ? "s" : ""} parsed`);

      // Step 2 — Evaluate
      setStep(2);
      const r2 = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_API_SECRET_KEY || "",
        },
        body: JSON.stringify({ jd_text: jdText, job_id: jobId }),
      });
      const d2 = await r2.json();
      if (!d2.success) throw new Error(d2.error || "Evaluation failed");
      toast.success(`${d2.count} candidates ranked`);
      sessionStorage.setItem(`eval_${jobId}`, JSON.stringify(d2.candidates));

      // Step 3 — Outreach
      setStep(4);
      const r3 = await fetch("/api/outreach", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_API_SECRET_KEY || "",
        },
        body: JSON.stringify({
          candidates: d2.candidates.slice(0, 10),
          job_title: jobTitle,
          company_name: company,
        }),
      });
      const d3 = await r3.json();
      if (d3.success) toast.success("Outreach emails drafted");

      router.push(
        `/dashboard?jobId=${jobId}&jobTitle=${encodeURIComponent(jobTitle)}`
      );
    } catch (err: any) {
      toast.error(err.message || "Pipeline failed");
      setLoading(false);
      setStep(-1);
    }
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <div className="mesh-bg" />

      {/* Nav */}
<nav className="nav">
  <Link href="/" className="nav-logo">
    <div className="nav-logo-icon">⚡</div>
    DevHire AI
  </Link>

  <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
    <Link
      href="/"
      className="badge badge-accent"
      style={{ opacity: 0.8 }}
    >
      Intake
    </Link>

    <Link
      href="/dashboard"
      className="badge badge-accent"
      style={{ opacity: 0.8 }}
    >
      Evaluate
    </Link>

    <Link
      href="/outreach"
      className="badge badge-accent"
      style={{ opacity: 0.8 }}
    >
      Outreach
    </Link>

    <Link
      href="/qa"
      className="badge badge-accent"
      style={{ opacity: 0.8 }}
    >
      Q&A
    </Link>
  </div>
</nav>

<main
  style={{
    position: "relative",
    zIndex: 1,
    maxWidth: 820,
    margin: "0 auto",
    padding: "100px 24px 60px",
  }}
>

        {/* Hero */}
        <div className="fade-up" style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(124,109,250,0.08)",
            border: "1px solid rgba(124,109,250,0.2)",
            borderRadius: 20, padding: "6px 14px", marginBottom: 20,
            fontSize: 12, color: "var(--accent2)",
            fontFamily: "'DM Mono', monospace",
          }}>
            ◆ Multi-agent recruitment pipeline
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.1, marginBottom: 16 }}>
            Screen 40 resumes<br />
            <span style={{
              background: "linear-gradient(135deg, var(--accent), var(--teal))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              in 60 seconds
            </span>
          </h1>
          <p style={{ color: "var(--text2)", fontSize: 16, maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
            Upload resumes + a job description. Three AI agents parse,
            rank semantically, and draft personalized outreach — automatically.
          </p>
        </div>

        {/* Pipeline steps */}
        <div className="fade-up" style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 0, marginBottom: 40,
        }}>
          {STEPS.map((s, i) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center" }}>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                padding: "10px 14px", borderRadius: 12,
                background: loading && currentStep === i
                  ? "rgba(124,109,250,0.15)" : "transparent",
                border: loading && currentStep === i
                  ? "1px solid rgba(124,109,250,0.3)" : "1px solid transparent",
                transition: "all 0.3s",
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, fontSize: 17,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: loading && currentStep === i
                    ? "var(--accent)" : "var(--bg3)",
                  border: `1px solid ${loading && currentStep === i
                    ? "var(--accent)" : "var(--border)"}`,
                  transition: "all 0.3s",
                }}>{s.icon}</div>
                <span style={{
                  fontSize: 10, fontWeight: 600, letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: loading && currentStep === i
                    ? "var(--accent2)" : "var(--text3)",
                }}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  width: 20, height: 1,
                  background: "var(--border)", marginBottom: 14,
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="fade-up card" style={{ padding: 32 }}>

          {/* Job title + company */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{
                fontSize: 11, fontWeight: 600, color: "var(--text3)",
                display: "block", marginBottom: 6,
                letterSpacing: "0.07em", textTransform: "uppercase",
                fontFamily: "'DM Mono', monospace",
              }}>Job Title *</label>
              <input
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder="Senior Backend Engineer"
              />
            </div>
            <div>
              <label style={{
                fontSize: 11, fontWeight: 600, color: "var(--text3)",
                display: "block", marginBottom: 6,
                letterSpacing: "0.07em", textTransform: "uppercase",
                fontFamily: "'DM Mono', monospace",
              }}>Company</label>
              <input
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Acme Corp"
              />
            </div>
          </div>

          {/* JD */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              fontSize: 11, fontWeight: 600, color: "var(--text3)",
              display: "block", marginBottom: 6,
              letterSpacing: "0.07em", textTransform: "uppercase",
              fontFamily: "'DM Mono', monospace",
            }}>Job Description *</label>
            <textarea
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              placeholder="Paste full job description — responsibilities, requirements, nice-to-haves..."
              style={{ minHeight: 150, resize: "vertical", lineHeight: 1.7 }}
            />
          </div>

          {/* Drop zone */}
          <div style={{ marginBottom: 24 }}>
            <label style={{
              fontSize: 11, fontWeight: 600, color: "var(--text3)",
              display: "block", marginBottom: 6,
              letterSpacing: "0.07em", textTransform: "uppercase",
              fontFamily: "'DM Mono', monospace",
            }}>
              Resumes * — {files.length} loaded
            </label>

            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              style={{
                border: `2px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
                borderRadius: 12, padding: "28px 20px", textAlign: "center",
                cursor: "pointer",
                background: dragging ? "rgba(124,109,250,0.05)" : "var(--bg3)",
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
              <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 4 }}>
                Drop PDF resumes here or{" "}
                <span style={{ color: "var(--accent)" }}>browse</span>
              </p>
              <p style={{ fontSize: 12, color: "var(--text3)" }}>
                Multiple files · PDF only · Max 8MB each
              </p>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf"
                multiple
                style={{ display: "none" }}
                onChange={e => addFiles(Array.from(e.target.files || []))}
              />
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                {files.map((f, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: "var(--bg3)", border: "1px solid var(--border)",
                    borderRadius: 8, padding: "8px 12px",
                  }}>
                    <span style={{ fontSize: 14 }}>📄</span>
                    <span style={{
                      flex: 1, fontSize: 13,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{f.name}</span>
                    <span style={{
                      fontSize: 11, color: "var(--text3)",
                      fontFamily: "'DM Mono', monospace",
                    }}>{fmt(f.size)}</span>
                    <span style={{ color: "var(--green)", fontSize: 13 }}>✓</span>
                    <button
                      onClick={() => removeFile(i)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--text3)", fontSize: 18, lineHeight: 1, padding: "0 2px",
                      }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Run button */}
          <button
            className="btn btn-primary"
            onClick={run}
            disabled={loading}
            style={{
              width: "100%", justifyContent: "center",
              padding: "14px 24px", fontSize: 15, borderRadius: 12,
            }}
          >
            {loading ? (
              <>
                <div className="spinner" />
                {currentStep === 0 ? `Parsing ${files.length} resume${files.length !== 1 ? "s" : ""}...`
                  : currentStep === 2 ? "Running AI evaluation..."
                  : currentStep === 4 ? "Drafting outreach emails..."
                  : "Processing..."}
              </>
            ) : (
              <>⚡ Run Pipeline — {files.length || 0} Resume{files.length !== 1 ? "s" : ""}</>
            )}
          </button>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "var(--text3)" }}>
          Powered by Gemini · MongoDB Atlas Vector Search · Google Cloud Agent Builder
        </p>
      </main>
    </div>
  );
}