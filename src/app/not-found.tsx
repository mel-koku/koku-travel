import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found | Koku Travel",
};

export default function RootNotFound() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100dvh",
        alignItems: "center",
        justifyContent: "center",
        background: "#1a1714",
        color: "#f0e8dc",
        fontFamily: "system-ui, sans-serif",
        padding: "2rem",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "28rem" }}>
        <p
          style={{
            fontSize: "0.75rem",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.3em",
            opacity: 0.5,
          }}
        >
          Page not found
        </p>
        <h1
          style={{
            marginTop: "1.5rem",
            fontSize: "clamp(2rem, 6vw, 3.5rem)",
            fontStyle: "italic",
            lineHeight: 1.1,
          }}
        >
          Lost in Translation
        </h1>
        <p style={{ marginTop: "1.5rem", opacity: 0.8 }}>
          This path leads nowhere — but Japan still has thousands waiting for
          you.
        </p>
        <a
          href="/"
          style={{
            display: "inline-block",
            marginTop: "2rem",
            padding: "0.875rem 2.5rem",
            background: "#c4504f",
            color: "#fff",
            borderRadius: "0.75rem",
            textDecoration: "none",
            fontSize: "0.875rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Take Me Home
        </a>
      </div>
    </div>
  );
}
