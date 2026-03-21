"use client";

type TipCalloutCProps = {
  value: {
    tipType: "pro_tip" | "cultural" | "budget" | "warning" | "seasonal";
    title?: string;
    body: string;
  };
};

function getBorderColor(tipType: string): string {
  switch (tipType) {
    case "warning":
      return "var(--error, #d44535)";
    case "budget":
      return "var(--warning, #d4b83d)";
    default:
      return "var(--primary)";
  }
}

const TIP_CONFIG = {
  pro_tip: {
    label: "Pro Tip",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
  cultural: {
    label: "Cultural Note",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  budget: {
    label: "Budget Tip",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    label: "Warning",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
  },
  seasonal: {
    label: "Seasonal",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
  },
} as const;

export function TipCalloutBlockC({ value }: TipCalloutCProps) {
  const config = TIP_CONFIG[value.tipType] || TIP_CONFIG.pro_tip;
  const borderColor = getBorderColor(value.tipType);

  return (
    <div className="my-12">
      <div
        className="border-l-2 p-6"
        style={{
          borderColor,
          backgroundColor: "var(--surface)",
        }}
      >
        <div className="mb-3 flex items-center gap-2">
          <span style={{ color: borderColor }}>{config.icon}</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
            {value.title || config.label}
          </span>
        </div>
        <p className="text-base leading-relaxed text-[var(--muted-foreground)]">
          {value.body}
        </p>
      </div>
    </div>
  );
}
