"use client";

type ExperienceHighlightProps = {
  value: {
    highlightType: "key_moment" | "sensory" | "practical";
    title?: string;
    body: string;
  };
};

const HIGHLIGHT_CONFIG = {
  key_moment: {
    label: "Key Moment",
    borderColor: "border-brand-primary/40",
    bgColor: "bg-brand-primary/5",
    iconColor: "text-brand-primary",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  sensory: {
    label: "Sensory Detail",
    borderColor: "border-sage/40",
    bgColor: "bg-sage/5",
    iconColor: "text-sage",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  practical: {
    label: "Practical Note",
    borderColor: "border-brand-secondary/40",
    bgColor: "bg-brand-secondary/5",
    iconColor: "text-brand-secondary",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
  },
} as const;

export function ExperienceHighlightBlock({ value }: ExperienceHighlightProps) {
  const config = HIGHLIGHT_CONFIG[value.highlightType] || HIGHLIGHT_CONFIG.key_moment;

  return (
    <div className="mx-auto my-12 max-w-2xl px-6">
      <div
        className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-6`}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className={config.iconColor}>{config.icon}</span>
          <span className="font-mono text-xs uppercase tracking-wide text-stone">
            {value.title || config.label}
          </span>
        </div>
        <p className="text-base leading-relaxed text-foreground-secondary">
          {value.body}
        </p>
      </div>
    </div>
  );
}
