function hashColor(name: string) {
  // deterministic soft color from name
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return `hsl(${hue} 80% 90%)`; // pastel bg
}

export default function Avatar({
  name,
  size = 28,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  const bg = hashColor(name || "Guest");
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full text-[11px] font-semibold text-gray-700 ring-1 ring-gray-200 ${className}`}
      style={{ width: size, height: size, background: bg }}
      aria-hidden="true"
    >
      {initials || "G"}
    </span>
  );
}

