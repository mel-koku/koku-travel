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
    <footer className="border-t border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-10 text-sm sm:px-6 md:flex-row md:items-center md:justify-between md:gap-0 md:px-10">
        <div className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-stone">
          <span>Koku Travel</span>
          <span className="tracking-[0.2em]">Japan Planner</span>
          <span className="text-[10px] tracking-[0.3em]">
            © {currentYear} All rights reserved
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-5 text-xs font-semibold uppercase tracking-[0.3em] text-warm-gray">
          {footerLinks.map((link) => (
            <a
              key={link.label}
              className="transition-colors hover:text-brand-primary"
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
              className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-stone text-xs font-semibold uppercase tracking-[0.3em] text-stone transition-colors hover:border-brand-primary hover:text-brand-primary"
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

