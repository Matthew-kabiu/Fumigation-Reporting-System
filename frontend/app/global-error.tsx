"use client";

import { RotateCcw, ShieldAlert } from "lucide-react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main
          role="alert"
          style={{
            alignItems: "center",
            background: "#f3efe5",
            color: "#171a16",
            display: "flex",
            flexDirection: "column",
            fontFamily: "Arial, sans-serif",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <ShieldAlert aria-hidden="true" size={42} />
          <h1>Fumivanta could not load safely.</h1>
          <p>No raw error details have been exposed. Retry the application to restore the workspace.</p>
          <button
            onClick={reset}
            style={{
              alignItems: "center",
              background: "#171a16",
              border: 0,
              borderRadius: "999px",
              color: "#f3efe5",
              cursor: "pointer",
              display: "inline-flex",
              fontWeight: 700,
              gap: "0.5rem",
              marginTop: "1rem",
              padding: "0.8rem 1rem",
            }}
          >
            <RotateCcw aria-hidden="true" size={17} /> Retry application
          </button>
        </main>
      </body>
    </html>
  );
}
