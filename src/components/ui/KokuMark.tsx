type KokuMarkProps = {
  className?: string;
};

/**
 * Minimal "K" monogram mark for the Koku Travel brand.
 * Stylized compass-inspired K inside a subtle circle.
 */
export function KokuMark({ className = "h-6 w-6" }: KokuMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M9 6v12M9 12l6-6M9 12l6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
