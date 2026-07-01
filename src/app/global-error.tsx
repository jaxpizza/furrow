"use client";

import { useEffect } from "react";

/** Root error boundary — catches errors in the root layout itself. Renders its
 *  own <html>/<body> with inline styles so it works even if the app CSS never
 *  loaded. Last-resort fallback; the per-route error.tsx handles the common case. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] root error", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100dvh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          margin: 0,
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0c0a09",
          color: "#e7e5e4",
        }}
      >
        <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#efb23e" }}>Furrow</div>
        <p style={{ fontSize: "0.9rem", color: "#9ba29e", maxWidth: "24rem" }}>
          Something went wrong. Please refresh the page.
        </p>
        <button
          onClick={reset}
          style={{
            border: "1px solid #292524",
            borderRadius: 6,
            padding: "6px 12px",
            color: "inherit",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
