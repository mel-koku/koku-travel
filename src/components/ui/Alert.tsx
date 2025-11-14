import { ReactElement, ReactNode, useMemo, useState } from "react";

import { cn } from "@/lib/cn";

type AlertTone = "info" | "success" | "warning" | "error";

type AlertProps = {
  tone?: AlertTone;
  title?: string;
  description?: ReactNode;
  children?: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
};

const toneStyles: Record<AlertTone, { border: string; icon: ReactElement }> = {
  info: {
    border: "border-indigo-500/70",
    icon: (
      <svg
        className="h-5 w-5 text-indigo-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7h.01M12 11v6" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  success: {
    border: "border-emerald-500/70",
    icon: (
      <svg
        className="h-5 w-5 text-emerald-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m6 12 4 4 8-8"
        />
      </svg>
    ),
  },
  warning: {
    border: "border-amber-500/70",
    icon: (
      <svg
        className="h-5 w-5 text-amber-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3l-8.47-14.14a2 2 0 0 0-3.42 0Z"
        />
      </svg>
    ),
  },
  error: {
    border: "border-rose-500/70",
    icon: (
      <svg
        className="h-5 w-5 text-rose-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
};

export function Alert({
  tone = "info",
  title,
  description,
  children,
  dismissible = false,
  onDismiss,
  className,
}: AlertProps) {
  const [visible, setVisible] = useState(true);

  const toneClassName = useMemo(() => toneStyles[tone], [tone]);

  if (!visible) return null;

  const handleDismiss = () => {
    onDismiss?.();
    setVisible(false);
  };

  return (
    <div
      role="alert"
      className={cn(
        "relative flex w-full gap-3 rounded-2xl border-l-4 bg-white p-5 shadow-sm ring-1 ring-gray-100",
        toneClassName.border,
        className,
      )}
    >
      <span aria-hidden="true" className="mt-0.5">
        {toneClassName.icon}
      </span>
      <div className="flex flex-1 flex-col gap-1">
        {title ? <h3 className="text-sm font-semibold text-gray-900">{title}</h3> : null}
        {description ? <p className="text-sm text-gray-600">{description}</p> : null}
        {children}
      </div>
      {dismissible ? (
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          aria-label="Dismiss alert"
        >
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 20 20"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l8 8M6 14 14 6" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

Alert.displayName = "Alert";


