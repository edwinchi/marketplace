"use client";

import { useEffect } from "react";

// Fires only when the root layout itself throws -- can't rely on layout.tsx's <html>/<body>, nav,
// or fonts here, since this replaces all of it. Deliberately plain rather than broken-looking.
//
// Same stale-deployment detection as app/error.tsx -- reset() only clears React error-boundary
// state, it can't fetch a fresh JS bundle, so a Server Action call referencing an id from a
// deployment that's since been replaced fails the exact same way every time "Try again" is
// clicked. A real reload is the only thing that actually fixes it.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Unhandled root layout error:", error);
  }, [error]);

  const isStaleDeployment = /failed to find server action|older or newer deployment/i.test(error.message);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#fff", color: "#082040" }}>
        <div style={{ maxWidth: 420, margin: "6rem auto", padding: "0 1rem", textAlign: "center" }}>
          {isStaleDeployment ? (
            <>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.75rem" }}>A new version of MarketitNow is ready</h1>
              <p style={{ color: "#666", marginBottom: "1.5rem" }}>
                This page was open from before an update — refresh to load the latest version and continue where you left off.
              </p>
              <button
                onClick={() => window.location.reload()}
                style={{ background: "#e89818", color: "#082040", border: "none", borderRadius: 8, padding: "0.6rem 1.5rem", fontWeight: 600, cursor: "pointer" }}
              >
                Refresh the page
              </button>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.75rem" }}>Something went wrong</h1>
              <p style={{ color: "#666", marginBottom: "1.5rem" }}>
                MarketitNow hit an unexpected error. Try again in a moment.
              </p>
              <button
                onClick={reset}
                style={{ background: "#e89818", color: "#082040", border: "none", borderRadius: 8, padding: "0.6rem 1.5rem", fontWeight: 600, cursor: "pointer" }}
              >
                Try again
              </button>
            </>
          )}
        </div>
      </body>
    </html>
  );
}
