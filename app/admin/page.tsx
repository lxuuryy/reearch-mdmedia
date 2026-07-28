"use client";

import { useState } from "react";
import { DRIVERS } from "@/lib/quiz-data";

const mono = "var(--font-plex-mono), ui-monospace, monospace";
const sans = "var(--font-outfit), sans-serif";

type Response = {
  id: string;
  person?: { name?: string; email?: string; team?: string };
  scores?: Record<string, number>;
  topTwo?: string[];
  reflections?: { q: string; answer: string | null }[];
  scenarios?: { q: string; answer: string | null }[];
  completedAt?: string | null;
};

const labelStyle = {
  fontFamily: mono,
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase" as const,
  color: "#A6AEA0",
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [rows, setRows] = useState<Response[] | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  async function load(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setRows(data.responses as Response[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setRows(null);
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    if (!rows) return;
    const names = DRIVERS.map((d) => d.name);
    const head = ["Name", "Email", "Team", "Completed", ...names, "Top two"];
    const lines = [head, ...rows.map((r) => [
      r.person?.name ?? "",
      r.person?.email ?? "",
      r.person?.team ?? "",
      r.completedAt ?? "",
      ...names.map((n) => String(r.scores?.[n] ?? "")),
      (r.topTwo ?? []).join(" & "),
    ])];
    const csv = lines.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "what-drives-you-responses.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ minHeight: "100vh", fontFamily: sans, color: "#1C3125", background: "#E3E6DA", padding: "32px 16px" }}>
      <div style={{ maxWidth: rows ? 900 : 420, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ background: "#FFFFFF", borderRadius: 20, padding: "24px 26px", boxShadow: "0 20px 44px -26px rgba(28,49,37,0.35)" }}>
          <div style={labelStyle}>MD Media · Admin</div>
          <h1 style={{ fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em", margin: "10px 0 14px" }}>Quiz results</h1>

          {!rows && (
            <form onSubmit={load} style={{ display: "flex", gap: 8 }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoFocus
                style={{ flex: 1, border: "1.5px solid #E3E6DA", borderRadius: 10, padding: "9px 12px", fontSize: 14, background: "#FBFCF9", outline: "none" }}
              />
              <button
                type="submit"
                disabled={loading}
                style={{ border: "none", borderRadius: 10, padding: "9px 20px", fontSize: 14, fontWeight: 500, background: "#1B3FE0", color: "#fff", cursor: "pointer" }}
              >
                {loading ? "…" : "Enter"}
              </button>
            </form>
          )}

          {rows && (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 14, color: "#48584B" }}>{rows.length} response{rows.length === 1 ? "" : "s"}</span>
              <button onClick={() => load()} style={btn}>Refresh</button>
              <button onClick={exportCsv} style={btn}>Export CSV</button>
            </div>
          )}

          {error && <div style={{ marginTop: 10, fontSize: 13, color: "#B4483C" }}>{error}</div>}
        </div>

        {rows?.length === 0 && (
          <div style={{ background: "#fff", borderRadius: 20, padding: 26, fontSize: 14, color: "#6C7A6E" }}>No responses yet.</div>
        )}

        {rows?.map((r) => (
          <div key={r.id} style={{ background: "#FFFFFF", borderRadius: 20, padding: "20px 24px", boxShadow: "0 20px 44px -30px rgba(28,49,37,0.3)" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 500 }}>{r.person?.name || "Anonymous"}</div>
                <div style={{ fontSize: 12.5, color: "#8A9488" }}>
                  {[r.person?.team, r.person?.email].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              <div style={{ ...labelStyle, textAlign: "right" }}>
                {(r.topTwo ?? []).join(" & ")}
                <div style={{ letterSpacing: "0.06em", color: "#C3C9BB" }}>
                  {r.completedAt ? new Date(r.completedAt).toLocaleString() : "—"}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginTop: 14 }}>
              {DRIVERS.map((d) => {
                const score = r.scores?.[d.name] ?? 0;
                const top = (r.topTwo ?? []).includes(d.name);
                return (
                  <div key={d.name} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: top ? "#1C3125" : "#8A9488" }}>
                      <span>{d.name}</span>
                      <span style={{ fontFamily: mono, fontSize: 10.5 }}>{score}/20</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: "#EFF2E9", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(score / 20) * 100}%`, background: top ? "#1C3125" : "#C9D2BE" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <button onClick={() => setOpen(open === r.id ? null : r.id)} style={{ ...btn, marginTop: 14 }}>
              {open === r.id ? "Hide answers" : "Show answers"}
            </button>

            {open === r.id && (
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 9 }}>
                {[...(r.reflections ?? []), ...(r.scenarios ?? [])].map((row, k) => (
                  <div key={k} style={{ borderBottom: "1px solid #EFF2E9", paddingBottom: 8 }}>
                    <div style={{ fontSize: 12.5, color: "#8A9488", lineHeight: 1.45 }}>{row.q}</div>
                    <div style={{ fontSize: 13.5, color: "#1C3125", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{row.answer || "—"}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const btn: React.CSSProperties = {
  border: "1.5px solid #E3E6DA",
  background: "#FBFCF9",
  borderRadius: 10,
  padding: "7px 14px",
  fontSize: 13,
  cursor: "pointer",
  color: "#1C3125",
};
