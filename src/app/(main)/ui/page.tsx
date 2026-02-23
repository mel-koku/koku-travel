import Link from "next/link";

const pages = [
  {
    title: "Colors",
    description: "Design tokens, semantic palette, and category color mapping.",
    path: "/ui/colors",
  },
  {
    title: "Typography",
    description:
      "Font families, type scale, letter spacing, and usage patterns.",
    path: "/ui/typography",
  },
  {
    title: "Motion",
    description:
      "Easing curves, duration scale, staggers, springs, and parallax presets.",
    path: "/ui/motion",
  },
  {
    title: "Components",
    description: "Buttons, form controls, and field wrappers.",
    path: "/ui/components",
  },
  {
    title: "Cards",
    description: "Location cards, activity cards, badges, and collection cards.",
    path: "/ui/cards",
  },
  {
    title: "Layout",
    description: "Grid patterns, spacing, and responsive layout utilities.",
    path: "/ui/layout",
  },
  {
    title: "Overlays",
    description: "Modals, dropdowns, tooltips, and alert banners.",
    path: "/ui/overlays",
  },
];

export default function DesignSystemHub() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-12 sm:px-10 sm:py-16">
      <header className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary">
          Design System
        </span>
        <h1 className="font-serif text-4xl italic leading-tight text-foreground">
          Koku Design System
        </h1>
        <p className="max-w-2xl text-lg text-foreground-secondary">
          A cohesive visual language for Japan travel planning. Dark-first
          tokens, editorial typography, and cinematic motion — all documented
          here as a living reference.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map(({ title, description, path }) => (
          <Link
            key={path}
            href={path}
            className="group flex flex-col gap-2 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-foreground-secondary/30"
          >
            <h2 className="text-base font-medium text-foreground transition-colors group-hover:text-brand-primary">
              {title}
            </h2>
            <p className="text-sm leading-relaxed text-foreground-secondary">
              {description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
