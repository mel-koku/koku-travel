const footerLinks = [
  { label: "About", href: "#" },
  { label: "FAQ", href: "#" },
  { label: "Contact", href: "#" },
  { label: "Privacy", href: "#" },
];

const socialIcons = [
  { label: "IG", href: "#" },
  { label: "X", href: "#" },
  { label: "YT", href: "#" },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/70">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-10 py-10 text-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-zinc-500">
          <span>Koku Travel</span>
          <span className="tracking-[0.2em]">Japan Planner</span>
          <span className="text-[10px] tracking-[0.3em]">
            © {currentYear} All rights reserved
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-5 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-700 dark:text-zinc-300">
          {footerLinks.map((link) => (
            <a
              key={link.label}
              className="transition-colors hover:text-red-500"
              href={link.href}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {socialIcons.map((icon) => (
            <a
              key={icon.label}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-zinc-300 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 transition-colors hover:border-red-500 hover:text-red-500 dark:border-zinc-700 dark:text-zinc-300"
              href={icon.href}
              aria-label={icon.label}
            >
              {icon.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

