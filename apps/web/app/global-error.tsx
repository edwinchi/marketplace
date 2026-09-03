"use client";

import { useEffect } from "react";

// Fires only when the root layout itself throws -- can't rely on layout.tsx's <html>/<body>, nav,
// or fonts here, since this replaces all of it. Deliberately plain rather than broken-looking.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#fff", color: "#082040" }}>
        <div style={{ maxWidth: 420, margin: "6rem auto", padding: "0 1rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.75rem" }}>Something went wrong</h1>
          <p style={{ color: "#666", marginBottom: "1.5rem" }}>
            AfroDeals hit an unexpected error. Try again in a moment.
          </p>
          <button
            onClick={reset}
            style={{ background: "#e89818", color: "#082040", border: "none", borderRadius: 8, padding: "0.6rem 1.5rem", fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
