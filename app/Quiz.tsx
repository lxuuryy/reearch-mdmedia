"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { DRIVERS, LETTERS, REFLECT, SCENARIOS, STATEMENTS } from "@/lib/quiz-data";
import { firebaseConfigured, getDb } from "@/lib/firebase";

const ACCENT = "#1B3FE0";
const ON_ACCENT = "#FFFFFF";
const STORAGE_KEY = "mdm-drives-quiz";
const SUBMITTED_KEY = "mdm-drives-quiz-submitted";
const AUTO_ADVANCE = true;
const SHOW_FACILITATOR_NOTES = false;

type AnswerValue = number | string;
type Answers = Record<string, AnswerValue>;

type Screen =
  | { kind: "intro" }
  | { kind: "rating"; n: number }
  | { kind: "open"; n: number; reflect: true }
  | { kind: "choice"; n: number; reflect: true }
  | { kind: "choice"; n: number; scenario: true }
  | { kind: "results" };

type Person = { name: string; email: string; team: string };

const SCREENS: Screen[] = [
  { kind: "intro" },
  ...STATEMENTS.map((_, n) => ({ kind: "rating", n }) as Screen),
  ...REFLECT.map((r, n) => ({ kind: r.kind, n, reflect: true }) as Screen),
  ...SCENARIOS.map((_, n) => ({ kind: "choice", n, scenario: true }) as Screen),
  { kind: "results" },
];

const mono = "var(--font-plex-mono), ui-monospace, monospace";
const sans = "var(--font-outfit), sans-serif";

const label: CSSProperties = {
  fontFamily: mono,
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#A6AEA0",
};

export default function Quiz() {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [person, setPerson] = useState<Person>({ name: "", email: "", team: "" });
  const [flip, setFlip] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [save, setSave] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedRef = useRef(false);
  const pdfBlobRef = useRef<Blob | null>(null);

  const screen = SCREENS[i] ?? SCREENS[0];

  // Restoring saved progress from localStorage; runs once on mount.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.i === "number") setI(parsed.i);
        if (parsed.answers) setAnswers(parsed.answers);
        if (parsed.person) setPerson(parsed.person);
      }
      const done = localStorage.getItem(SUBMITTED_KEY);
      if (done) {
        savedRef.current = true;
        setSave("saved");
        try {
          setSubmittedAt(JSON.parse(done).at ?? "");
        } catch {
          setSubmittedAt("");
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const persist = useCallback((next: { i: number; answers: Answers; person: Person }) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const canNext = useCallback(
    (idx: number, a: Answers, p: Person) => {
      const s = SCREENS[idx];
      if (!s) return false;
      if (s.kind === "intro") return p.name.trim().length > 0;
      if (s.kind === "rating") return a["r" + s.n] !== undefined;
      if (s.kind === "choice") return a[("scenario" in s ? "s" : "c") + s.n] !== undefined;
      return true;
    },
    [],
  );

  const go = useCallback(
    (delta: number) => {
      setI((cur) => {
        const next = Math.max(0, Math.min(SCREENS.length - 1, cur + delta));
        if (next === cur) return cur;
        setFlip((f) => !f);
        persist({ i: next, answers, person });
        return next;
      });
    },
    [answers, person, persist],
  );

  const next = useCallback(() => {
    if (canNext(i, answers, person)) go(1);
  }, [canNext, i, answers, person, go]);
  const back = useCallback(() => go(-1), [go]);

  const answer = useCallback(
    (key: string, val: AnswerValue) => {
      setAnswers((prev) => {
        const merged = { ...prev, [key]: val };
        persist({ i, answers: merged, person });
        return merged;
      });
      if (AUTO_ADVANCE) {
        if (advanceTimer.current) clearTimeout(advanceTimer.current);
        advanceTimer.current = setTimeout(() => go(1), 240);
      }
    },
    [go, i, person, persist],
  );

  // Every screen change starts at the top — otherwise you land mid-page on
  // mobile after a long screen. Instant, not smooth: smooth can be cancelled
  // by the browser mid-scroll on touch devices.
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [i]);

  // Keyboard shortcuts — 1-5 for ratings, a-e for choices, arrows/enter to move.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = SCREENS[i];
      if (!s || submittedAt !== null) return;
      const el = document.activeElement;
      if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT")) return;
      if (s.kind === "rating" && /^[1-5]$/.test(e.key)) {
        answer("r" + s.n, Number(e.key));
      } else if (s.kind === "choice") {
        const opts = "scenario" in s ? SCENARIOS[s.n].o : REFLECT[s.n].options ?? [];
        const idx = LETTERS.indexOf(e.key.toLowerCase());
        if (idx > -1 && idx < opts.length) answer(("scenario" in s ? "s" : "c") + s.n, idx);
      }
      if (e.key === "Enter" || e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, answer, next, back, submittedAt]);

  const totals = DRIVERS.map((d) => ({
    d,
    score: d.qs.reduce((sum, q) => sum + (Number(answers["r" + (q - 1)]) || 0), 0),
  }));
  const ranked = [...totals].sort((a, b) => b.score - a.score);
  const topNames = ranked.slice(0, 2).map((t) => t.d.name);

  const transcript: { q: string; a: string }[] = [];
  REFLECT.forEach((r, n) => {
    const v = answers["c" + n];
    if (r.kind === "open") {
      transcript.push({ q: r.q, a: typeof v === "string" && v.trim() ? v : "—" });
    } else {
      transcript.push({ q: r.q, a: v === undefined ? "—" : r.options[Number(v)] });
    }
  });
  SCENARIOS.forEach((sc, n) => {
    const v = answers["s" + n];
    transcript.push({
      q: `${n + 1}. ${sc.q}`,
      a: v === undefined ? "—" : `${LETTERS[Number(v)]}) ${sc.o[Number(v)]}`,
    });
  });

  // Save to Firestore once, when the results screen is first reached.
  useEffect(() => {
    if (screen.kind !== "results" || savedRef.current || !hydrated) return;
    const db = getDb();
    if (!db) return;
    savedRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSave("saving");
    addDoc(collection(db, "responses"), {
      person: { name: person.name.trim(), email: person.email.trim(), team: person.team.trim() },
      ratings: Object.fromEntries(STATEMENTS.map((s, n) => [`r${n}`, answers["r" + n] ?? null])),
      statements: STATEMENTS,
      reflections: REFLECT.map((r, n) => ({
        q: r.q,
        answer: r.kind === "open" ? (answers["c" + n] ?? "") : (r.options?.[Number(answers["c" + n])] ?? null),
        index: r.kind === "choice" ? (answers["c" + n] ?? null) : null,
      })),
      scenarios: SCENARIOS.map((sc, n) => ({
        q: sc.q,
        index: answers["s" + n] ?? null,
        answer: answers["s" + n] === undefined ? null : sc.o[Number(answers["s" + n])],
      })),
      scores: Object.fromEntries(totals.map((t) => [t.d.name, t.score])),
      topTwo: topNames,
      completedAt: serverTimestamp(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    })
      .then(() => {
        setSave("saved");
        const at = new Date().toISOString();
        setSubmittedAt(at);
        try {
          localStorage.setItem(SUBMITTED_KEY, JSON.stringify({ at, name: person.name.trim() }));
        } catch {
          /* ignore */
        }
      })
      .catch((err: unknown) => {
        savedRef.current = false;
        setSave("error");
        setSaveError(err instanceof Error ? err.message : String(err));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen.kind, hydrated]);

  // Builds a real PDF in the browser and downloads it — no print dialog, so
  // pages break where we say they do. The renderer is ~1MB, so it is only
  // fetched when someone actually asks for the file.
  const pdfFilename = `what-drives-you-${(person.name || "results").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;

  async function buildPdfBlob() {
    const [{ pdf }, { ResultsPdf }] = await Promise.all([import("@react-pdf/renderer"), import("@/lib/ResultsPdf")]);
    const stamp = submittedAt ? new Date(submittedAt) : new Date();
    const data = {
      person,
      completedAt: stamp.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      totals,
      topTwo: ranked.slice(0, 2),
      transcript,
    };
    return pdf(<ResultsPdf data={data} />).toBlob();
  }

  async function downloadPdf() {
    setPdfBusy(true);
    try {
      const blob = pdfBlobRef.current ?? (await buildPdfBlob());
      pdfBlobRef.current = blob;
      const file = new File([blob], pdfFilename, { type: "application/pdf" });

      // iOS Safari ignores the download attribute on blob URLs — it just opens
      // the PDF in a new tab. The share sheet is the real "save" on iOS: it has
      // "Save to Files". Must run inside the click gesture, so the blob is
      // pre-built while the results screen is on screen.
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        try {
          await nav.share({ files: [file], title: pdfFilename });
          return;
        } catch (err) {
          // AbortError = they dismissed the sheet; anything else falls through.
          if (err instanceof DOMException && err.name === "AbortError") return;
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.rel = "noopener";
      a.download = pdfFilename;
      // Safari only honours the click on an anchor that is in the document.
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Revoking immediately cancels the download in Safari and Firefox.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setPdfBusy(false);
    }
  }

  // Build the PDF ahead of time once the results are up. On iOS the share sheet
  // must open inside the tap gesture — no time for a 1MB import and a render.
  useEffect(() => {
    if (screen.kind !== "results" || pdfBlobRef.current) return;
    let cancelled = false;
    buildPdfBlob()
      .then((blob) => {
        if (!cancelled) pdfBlobRef.current = blob;
      })
      .catch(() => {
        /* the click path will retry and surface the error */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen.kind, answers, person, submittedAt]);

  const SEGS = 12;
  const filled = Math.round((i / (SCREENS.length - 1)) * SEGS);
  const ready = canNext(i, answers, person);

  const isRating = screen.kind === "rating";
  const isChoice = screen.kind === "choice";
  const isOpen = screen.kind === "open";
  const isResults = screen.kind === "results";
  const isIntro = screen.kind === "intro";

  let qLabel = "";
  let qText = "";
  let helper = "";
  if (isRating) {
    qLabel = `Statement ${String(screen.n + 1).padStart(2, "0")} / 24`;
    qText = STATEMENTS[screen.n];
    helper = "1 = not like me · 5 = exactly me";
  } else if ("reflect" in screen && screen.reflect) {
    qLabel = `Reflection ${String(screen.n + 1).padStart(2, "0")} / 03`;
    qText = REFLECT[screen.n].q;
    helper = screen.kind === "open" ? "Worth more than the scores" : "Pick one";
  } else if ("scenario" in screen && screen.scenario) {
    qLabel = `Scenario ${String(screen.n + 1).padStart(2, "0")} / 12`;
    qText = `${SCENARIOS[screen.n].q} You:`;
    helper = "What you'd genuinely do";
  }

  const n = "n" in screen ? screen.n : 0;
  const choiceKey = ("scenario" in screen ? "s" : "c") + n;
  const rawOpts = isChoice ? ("scenario" in screen ? SCENARIOS[n].o : REFLECT[n].options ?? []) : [];

  // Already submitted from this browser — no second run, results stay readable.
  const locked = submittedAt !== null && !isResults;

  return (
    <div
      className="page"
      style={{
        minHeight: "100vh",
        width: "100%",
        fontFamily: sans,
        color: "#1C3125",
        backgroundColor: "#E3E6DA",
        backgroundImage:
          "repeating-linear-gradient(90deg, rgba(28,49,37,0.055) 0px, rgba(28,49,37,0.055) 1px, transparent 1px, transparent 152px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
      }}
    >
      <div className="shell" style={{ position: "relative", width: "100%", maxWidth: 520 }}>
        <div
          className="no-print decor"
          style={{ position: "absolute", inset: "20px -16px -10px 20px", background: "#FFFFFF", opacity: 0.45, borderRadius: 24, transform: "rotate(2deg)" }}
        />
        <div
          className="no-print decor"
          style={{ position: "absolute", inset: "10px 10px -4px -15px", background: "#FFFFFF", opacity: 0.6, borderRadius: 24, transform: "rotate(-1.8deg)" }}
        />

        <div
          className="card"
          style={{
            position: "relative",
            background: "#FFFFFF",
            borderRadius: 24,
            boxShadow: "0 20px 44px -26px rgba(28,49,37,0.35)",
            padding: "26px 30px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", gap: 5, flex: 1 }}>
              {Array.from({ length: SEGS }, (_, k) => (
                <div key={k} style={{ height: 3, borderRadius: 2, flex: 1, background: k < filled ? "#1C3125" : "#E3E6DA", transition: "background .25s ease" }} />
              ))}
            </div>
          </div>

          <div
            key={i}
            className="content"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              animationDuration: ".32s",
              animationTimingFunction: "cubic-bezier(.2,.7,.3,1)",
              animationFillMode: "both",
              animationName: flip ? "fadeUpA" : "fadeUpB",
            }}
          >
            {locked && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, justifyContent: "center" }}>
                <div style={label}>MD Media · Already submitted</div>
                <h1 style={{ fontSize: 28, lineHeight: 1.1, letterSpacing: "-0.025em", fontWeight: 500, margin: 0 }}>You&apos;ve already done this one</h1>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "#48584B", maxWidth: "44ch" }}>
                  Your answers were submitted{submittedAt ? ` on ${new Date(submittedAt).toLocaleDateString()}` : ""} and they&apos;re with Divina and Abby. You
                  can still read your results below.
                </p>
                <button
                  onClick={() => setI(SCREENS.length - 1)}
                  style={{
                    alignSelf: "flex-start",
                    border: "none",
                    padding: "12px 26px",
                    borderRadius: 12,
                    fontSize: 14.5,
                    fontWeight: 500,
                    cursor: "pointer",
                    background: ACCENT,
                    color: ON_ACCENT,
                  }}
                >
                  View my results
                </button>
                <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: "#A6AEA0", maxWidth: "44ch" }}>
                  Need to redo it? Ask Divina or Abby to delete your submission.
                </p>
              </div>
            )}

            {!locked && isIntro && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
                <div style={label}>MD Media · 10 minutes</div>
                <h1 style={{ fontSize: 32, lineHeight: 1.08, letterSpacing: "-0.025em", fontWeight: 500, margin: 0 }}>What drives you</h1>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 14, lineHeight: 1.55, color: "#48584B", maxWidth: "48ch" }}>
                  <p style={{ margin: 0 }}>
                    This isn&apos;t a performance test and there are no right answers. It doesn&apos;t go in your file, it isn&apos;t used in reviews, and nobody
                    passes or fails it.
                  </p>
                  <p style={{ margin: 0 }}>
                    We&apos;re about to set goals and change how rewards work, and people are motivated by genuinely different things. Recognition. Freedom.
                    Learning. Seeing a client&apos;s business actually change. Hand everyone the same thing and it lands for two people and does nothing for the
                    rest.
                  </p>
                  <p style={{ margin: 0, color: "#1C3125" }}>
                    <strong style={{ fontWeight: 600 }}>You keep your results.</strong> Bring your top two to your goal-setting conversation and we&apos;ll build
                    your quarter around them.
                  </p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Field label="Your name" value={person.name} onChange={(v) => updatePerson("name", v)} placeholder="Jane Doe" />
                  <div style={{ display: "flex", gap: 10 }}>
                    <Field label="Email (optional)" value={person.email} onChange={(v) => updatePerson("email", v)} placeholder="jane@mdmedia.com" type="email" />
                    <Field label="Team (optional)" value={person.team} onChange={(v) => updatePerson("team", v)} placeholder="Accounts" />
                  </div>
                </div>

                <div style={{ paddingTop: 2, ...label, letterSpacing: "0.1em" }}>
                  Answer how you actually are — not how you think you should be
                </div>
              </div>
            )}

            {!locked && (isRating || isChoice || isOpen) && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
                <div style={label}>{qLabel}</div>
                <h2 style={{ fontSize: 23, lineHeight: 1.22, letterSpacing: "-0.02em", fontWeight: 500, margin: 0, maxWidth: "26ch" }}>{qText}</h2>
                <div style={{ ...label, fontSize: 10, letterSpacing: "0.12em", color: "#C3C9BB", marginTop: 0 }}>{helper}</div>

                {isRating && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 2 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[1, 2, 3, 4, 5].map((v) => {
                        const on = answers["r" + n] === v;
                        return (
                          <button
                            key={v}
                            onClick={() => answer("r" + n, v)}
                            style={{
                              flex: 1,
                              height: 50,
                              borderRadius: 12,
                              border: "1.5px solid",
                              fontSize: 16,
                              fontWeight: 500,
                              cursor: "pointer",
                              transition: "all .16s ease",
                              background: on ? ACCENT : "#FFFFFF",
                              borderColor: on ? ACCENT : "#E3E6DA",
                              color: on ? ON_ACCENT : "#1C3125",
                            }}
                          >
                            {v}
                          </button>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", ...label, fontSize: 9.5, letterSpacing: "0.08em" }}>
                      <span>Not like me</span>
                      <span>Sometimes</span>
                      <span>Exactly me</span>
                    </div>
                  </div>
                )}

                {isChoice && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
                    {rawOpts.map((opt, k) => {
                      const on = answers[choiceKey] === k;
                      return (
                        <button
                          key={k}
                          onClick={() => answer(choiceKey, k)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 11,
                            textAlign: "left",
                            padding: "10px 12px",
                            margin: "0 -10px",
                            border: "none",
                            borderRadius: 10,
                            background: on ? "#F4F6EF" : "transparent",
                            cursor: "pointer",
                            fontSize: 14.5,
                            lineHeight: 1.35,
                            color: "#1C3125",
                            transition: "background .16s ease",
                          }}
                        >
                          <span
                            style={{
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              border: "1.5px solid",
                              flex: "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderColor: on ? "#1C3125" : "#C3C9BB",
                            }}
                          >
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: on ? "#1C3125" : "transparent" }} />
                          </span>
                          <span style={{ flex: 1 }}>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {isOpen && (
                  <textarea
                    value={String(answers["c" + n] ?? "")}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAnswers((prev) => {
                        const merged = { ...prev, ["c" + n]: val };
                        persist({ i, answers: merged, person });
                        return merged;
                      });
                    }}
                    placeholder="Take your time."
                    style={{
                      width: "100%",
                      minHeight: 140,
                      resize: "vertical",
                      border: "1.5px solid #E3E6DA",
                      borderRadius: 12,
                      padding: 14,
                      fontSize: 14.5,
                      lineHeight: 1.55,
                      color: "#1C3125",
                      background: "#FBFCF9",
                      outline: "none",
                    }}
                  />
                )}
              </div>
            )}

            {isResults && (
              <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  <div style={label}>Your results</div>
                  <h2 style={{ fontSize: 28, lineHeight: 1.1, letterSpacing: "-0.025em", fontWeight: 500, margin: 0 }}>{topNames.join(" & ")}</h2>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "#48584B", maxWidth: "46ch" }}>
                    Everyone has all six. Your top two are the ones that, when they&apos;re missing, make work feel flat.
                  </p>
                  <SaveStatus state={save} error={saveError} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {totals.map((t) => {
                    const top = topNames.includes(t.d.name);
                    return (
                      <div key={t.d.name} className="pb" style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
                          <span style={{ fontSize: 14.5, fontWeight: 500, color: top ? "#1C3125" : "#8A9488" }}>{t.d.name}</span>
                          <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.08em", color: "#A6AEA0" }}>{t.score}/20</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: "#EFF2E9", overflow: "hidden" }}>
                          <div
                            style={{
                              height: "100%",
                              borderRadius: 4,
                              transition: "width .6s cubic-bezier(.2,.7,.3,1)",
                              width: `${Math.round((t.score / 20) * 100)}%`,
                              background: top ? "#1C3125" : "#C9D2BE",
                            }}
                          />
                        </div>
                        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#6C7A6E" }}>{t.d.blurb}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="pb" style={{ display: "flex", flexDirection: "column", gap: 13, padding: 18, background: "#F4F6EF", borderRadius: 16 }}>
                  <div style={label}>What your top two mean</div>
                  {ranked.slice(0, 2).map((t) => (
                    <div key={t.d.name} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ fontSize: 16, fontWeight: 500 }}>{t.d.name}</div>
                      <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "#48584B" }}>{t.d.desc}</div>
                      <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#8A9488" }}>{t.d.watch}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={label}>Your answers</div>
                  {transcript.map((row, k) => (
                    <div key={k} className="pb" style={{ display: "flex", flexDirection: "column", gap: 3, paddingBottom: 9, borderBottom: "1px solid #EFF2E9" }}>
                      <div style={{ fontSize: 12.5, lineHeight: 1.45, color: "#8A9488" }}>{row.q}</div>
                      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: "#1C3125" }}>{row.a}</div>
                    </div>
                  ))}
                </div>

                <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "#48584B" }}>
                  Bring your top two and your answer to the third reflection question to your goal-setting conversation. We&apos;ll use it to shape your quarter
                  and how your work gets recognised — because &quot;well done&quot; means different things to different people.
                </div>

                {SHOW_FACILITATOR_NOTES && (
                  <div className="pb" style={{ display: "flex", flexDirection: "column", gap: 11, padding: 18, border: "1.5px dashed #D2D8C7", borderRadius: 16 }}>
                    <div style={label}>For Divina and Abby only</div>
                    {DRIVERS.map((d) => (
                      <div key={d.name} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{d.name}</div>
                        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#48584B" }}>Lands: {d.lands}</div>
                        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "#8A9488" }}>Falls flat: {d.flat}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ fontSize: 11.5, lineHeight: 1.5, color: "#A6AEA0" }}>
                  Framework: the six human needs (Tony Robbins) — a lens for reading what people want from work, not a validated psychometric. Scenario format
                  adapted from Steven Bartlett&apos;s culture test.
                </div>
              </div>
            )}
          </div>

          <div
            className="no-print"
            style={{ display: locked ? "none" : "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 2 }}
          >
            <button
              onClick={back}
              style={{ border: "none", background: "none", padding: "9px 4px", fontSize: 14, cursor: "pointer", color: i === 0 ? "transparent" : "#6C7A6E" }}
            >
              {i === 0 ? "" : "Back"}
            </button>
            <button
              onClick={() => (isResults ? downloadPdf() : next())}
              style={{
                border: "none",
                padding: "12px 26px",
                borderRadius: 12,
                fontSize: 14.5,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all .18s ease",
                background: isResults ? "#1C3125" : ready ? ACCENT : "#EFF2E9",
                color: isResults ? "#FFFFFF" : ready ? ON_ACCENT : "#A6AEA0",
              }}
            >
              {isIntro ? "Start" : isResults ? (pdfBusy ? "Building PDF…" : "Download my results") : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  function updatePerson(key: keyof Person, value: string) {
    setPerson((prev) => {
      const merged = { ...prev, [key]: value };
      persist({ i, answers, person: merged });
      return merged;
    });
  }
}

function Field({
  label: text,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
      <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "#A6AEA0" }}>{text}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          border: "1.5px solid #E3E6DA",
          borderRadius: 10,
          padding: "9px 12px",
          fontSize: 14,
          color: "#1C3125",
          background: "#FBFCF9",
          outline: "none",
          width: "100%",
        }}
      />
    </label>
  );
}

function SaveStatus({ state, error }: { state: "idle" | "saving" | "saved" | "error"; error: string }) {
  if (!firebaseConfigured) {
    return (
      <div className="no-print" style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#C08A2E" }}>
        Not saved — Firebase env vars missing
      </div>
    );
  }
  const map = {
    idle: { text: "", color: "#A6AEA0" },
    saving: { text: "Saving your responses…", color: "#A6AEA0" },
    saved: { text: "Responses saved", color: "#4A6B3F" },
    error: { text: `Could not save: ${error}`, color: "#B4483C" },
  } as const;
  const s = map[state];
  if (!s.text) return null;
  return (
    <div className="no-print" style={{ fontFamily: mono, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: s.color }}>
      {s.text}
    </div>
  );
}
