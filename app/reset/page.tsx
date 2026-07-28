"use client";

import { useEffect, useState } from "react";

/**
 * Clears this browser's saved progress and its "already submitted" lock.
 * Only touches localStorage — submitted responses in Firestore are untouched
 * (delete those from /admin).
 */
export default function ResetPage() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      localStorage.removeItem("mdm-drives-quiz");
      localStorage.removeItem("mdm-drives-quiz-submitted");
    } catch {
      /* ignore */
    }
    setDone(true);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#E3E6DA",
        color: "#1C3125",
        fontFamily: "var(--font-outfit), sans-serif",
        padding: 20,
      }}
    >
      <div style={{ background: "#fff", borderRadius: 20, padding: "26px 30px", maxWidth: 380, textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>{done ? "This browser has been reset" : "Resetting…"}</div>
        <p style={{ fontSize: 14, lineHeight: 1.55, color: "#48584B", margin: "0 0 16px" }}>
          Saved progress and the one-submission lock are cleared. Any response already sent to Firestore is still there — remove it from /admin if you need to.
        </p>
        <a href="/" style={{ fontSize: 14 }}>
          Start the quiz
        </a>
      </div>
    </div>
  );
}
