"use client";

import Image from "next/image";
import { motion, useInView, type Variants } from "framer-motion";
import { useRef, useMemo, useState } from "react";

/* ─── Mock Data ─── */
const MOCK_LOCATIONS = [
  { name: "Fushimi Inari Taisha", city: "Kyoto", region: "Kansai", category: "shrine", rating: 4.7, reviews: 12400, image: "/images/regions/kansai-hero.jpg", summary: "Iconic trail of thousands of vermilion torii gates winding through a forested hillside." },
  { name: "Kenrokuen Garden", city: "Kanazawa", region: "Chubu", category: "nature", rating: 4.5, reviews: 3200, image: "/images/regions/chubu-hero.jpg", summary: "One of Japan's three most beautiful landscape gardens, stunning in every season." },
  { name: "Glover Garden", city: "Nagasaki", region: "Kyushu", category: "landmark", rating: 4.3, reviews: 1800, image: "/images/regions/kyushu-hero.jpg", summary: "Historic hilltop garden with Western-style homes and panoramic harbor views." },
  { name: "Matsumoto Castle", city: "Matsumoto", region: "Chubu", category: "landmark", rating: 4.6, reviews: 5400, image: "/images/regions/chubu-hero.jpg", summary: "One of Japan's premier historic castles, known as the 'Crow Castle' for its striking black exterior." },
];

const MOCK_GUIDES = [
  { title: "3 Days in Kyoto: Temples, Tea & Tradition", type: "Itinerary", location: "Kyoto", readTime: 8, image: "/images/regions/kansai-hero.jpg", summary: "A curated three-day route through Kyoto's most atmospheric temples, gardens, and tea houses." },
  { title: "Hokkaido's Best Onsen Towns", type: "Deep Dive", location: "Hokkaido", readTime: 12, image: "/images/regions/hokkaido-hero.jpg", summary: "From Noboribetsu's volcanic pools to Jozankei's riverside baths, the ultimate hot spring guide." },
  { title: "Where to Eat in Fukuoka", type: "Top Picks", location: "Fukuoka", readTime: 6, image: "/images/regions/kyushu-hero.jpg", summary: "Hakata ramen, mentaiko, and yatai street stalls — a food lover's guide to Kyushu's capital." },
  { title: "Cherry Blossom Season Guide", type: "Seasonal", location: "Japan", readTime: 10, image: "/images/regions/tohoku-hero.jpg", summary: "When and where to see sakura across Japan, from early blooms in Kyushu to late shows in Tohoku." },
];

/* ─── Inline SplitText for this preview ─── */
function PreviewSplitText({ children, className = "" }: { children: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });

  const words = useMemo(() => children.split(" ").map((word, i) => ({ key: `${word}-${i}`, content: word })), [children]);

  const containerVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.04, delayChildren: 0.15 } },
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
  };

  return (
    <motion.h1
      ref={ref}
      className={`${className} flex flex-wrap`}
      variants={containerVariants}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      aria-label={children}
    >
      {words.map((item) => (
        <motion.span key={item.key} variants={itemVariants} className="mr-[0.3em] inline-block" style={{ willChange: "transform, opacity" }} aria-hidden>
          {item.content}
        </motion.span>
      ))}
    </motion.h1>
  );
}

/* ─── ScrollReveal for this preview ─── */
function Reveal({ children, className = "", delay = 0, stagger = 0 }: { children: React.ReactNode; className?: string; delay?: number; stagger?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-10%" });

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.7, delay: delay + stagger, ease: [0.33, 1, 0.68, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Grain Texture Overlay ─── */
function GrainOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.03]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='256' height='256' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "256px 256px",
      }}
    />
  );
}

/* ─── Star Icon ─── */
function StarIcon() {
  return (
    <svg aria-hidden className="h-4 w-4 text-[#d4b83d]" viewBox="0 0 24 24" fill="currentColor">
      <path d="m12 17.27 5.18 3.11-1.64-5.81L20.9 9.9l-6-0.52L12 4 9.1 9.38l-6 .52 5.36 4.67L6.82 20.38 12 17.27z" />
    </svg>
  );
}

/* ─── Location Card (Locomotive) ─── */
function LLocationCard({ loc, index }: { loc: (typeof MOCK_LOCATIONS)[0]; index: number }) {
  return (
    <Reveal stagger={index * 0.05}>
      <article className="group overflow-hidden rounded-xl border border-[#3a332a]/50 bg-[#242019] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(196,80,79,0.1)]">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#1a1714]">
          <Image src={loc.image} alt={loc.name} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="(min-width:1280px) 25vw, (min-width:640px) 50vw, 100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1714]/60 via-transparent to-transparent" />
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-[#f0e8dc] line-clamp-1 transition-colors group-hover:text-[#c4504f]">{loc.name}</h3>
            <div className="flex shrink-0 items-center gap-1 text-sm">
              <StarIcon />
              <span className="text-[#f0e8dc]">{loc.rating}</span>
              <span className="text-[#b8ad9e]">({(loc.reviews / 1000).toFixed(1)}k)</span>
            </div>
          </div>
          <p className="text-sm text-[#b8ad9e]">{loc.city}, {loc.region}</p>
          <p className="text-sm text-[#b8ad9e] line-clamp-2">{loc.summary}</p>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs font-medium capitalize bg-[#3a332a]/50 text-[#b8ad9e] px-2.5 py-1 rounded-xl">{loc.category}</span>
          </div>
        </div>
      </article>
    </Reveal>
  );
}

/* ─── Guide Card (Locomotive) ─── */
function LGuideCard({ guide, index }: { guide: (typeof MOCK_GUIDES)[0]; index: number }) {
  return (
    <Reveal stagger={index * 0.05}>
      <article className="group overflow-hidden rounded-xl border border-[#3a332a]/50 bg-[#242019] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(196,80,79,0.1)]">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#1a1714]">
          <Image src={guide.image} alt={guide.title} fill className="object-cover transition-transform duration-300 group-hover:scale-105" sizes="(min-width:1280px) 25vw, (min-width:640px) 50vw, 100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1714]/60 via-transparent to-transparent" />
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center rounded-xl bg-[#242019]/90 px-2.5 py-1 text-xs font-medium text-[#f0e8dc] backdrop-blur-md">{guide.type}</span>
          </div>
          {guide.readTime && (
            <div className="absolute bottom-3 right-3">
              <span className="inline-flex items-center gap-1 rounded-xl bg-[#242019]/80 px-2.5 py-1 text-xs font-medium text-[#f0e8dc] backdrop-blur-md">{guide.readTime} min</span>
            </div>
          )}
        </div>
        <div className="p-4 space-y-2">
          <p className="text-sm text-[#b8ad9e]">{guide.location}</p>
          <h3 className="font-semibold text-[#f0e8dc] line-clamp-2 transition-colors group-hover:text-[#c4504f]">{guide.title}</h3>
          <p className="text-sm text-[#b8ad9e] line-clamp-2">{guide.summary}</p>
        </div>
      </article>
    </Reveal>
  );
}

/* ─── Section Wrapper ─── */
function Section({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`relative py-24 ${className}`}>
      <GrainOverlay />
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mb-8">
          <div className="h-px bg-gradient-to-r from-transparent via-[#c4504f]/20 to-transparent" />
          <span className="mt-3 block text-[0.75rem] font-medium uppercase tracking-[0.15em] text-[#b8ad9e]/60">{label}</span>
        </div>
        {children}
      </div>
    </section>
  );
}

/* ─── Transition Demo ─── */
function TransitionDemo() {
  const [showClip, setShowClip] = useState(false);
  const [showFade, setShowFade] = useState(false);

  return (
    <div className="grid gap-8 sm:grid-cols-2">
      {/* Clip-path wipe */}
      <div>
        <p className="mb-3 text-sm text-[#b8ad9e]">Clip-path wipe (Locomotive)</p>
        <button
          onClick={() => { setShowClip(false); setTimeout(() => setShowClip(true), 50); }}
          className="relative h-48 w-full overflow-hidden rounded-xl border border-[#3a332a]/50 bg-[#242019]"
        >
          <motion.div
            className="absolute inset-0"
            initial={{ clipPath: "inset(100% 0 0 0)" }}
            animate={showClip ? { clipPath: "inset(0 0 0 0)" } : { clipPath: "inset(100% 0 0 0)" }}
            transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
          >
            <Image src="/images/regions/kansai-hero.jpg" alt="" fill className="object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-[#1a1714]/50">
              <span className="font-serif text-2xl text-[#f0e8dc]">Page Content</span>
            </div>
          </motion.div>
          <span className="absolute inset-0 flex items-center justify-center text-sm text-[#b8ad9e]">Click to preview</span>
        </button>
      </div>
      {/* Simple fade */}
      <div>
        <p className="mb-3 text-sm text-[#b8ad9e]">Simple fade (standard)</p>
        <button
          onClick={() => { setShowFade(false); setTimeout(() => setShowFade(true), 50); }}
          className="relative h-48 w-full overflow-hidden rounded-xl border border-[#3a332a]/50 bg-[#242019]"
        >
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={showFade ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Image src="/images/regions/hokkaido-hero.jpg" alt="" fill className="object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-[#1a1714]/50">
              <span className="font-serif text-2xl text-[#f0e8dc]">Page Content</span>
            </div>
          </motion.div>
          <span className="absolute inset-0 flex items-center justify-center text-sm text-[#b8ad9e]">Click to preview</span>
        </button>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function PreviewLocomotivePage() {
  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <div className="min-h-screen bg-[#1a1714] text-[#f0e8dc]">
      {/* ── Direction Label ── */}
      <div className="fixed top-4 right-4 z-50 rounded-xl bg-[#c4504f] px-4 py-2 text-sm font-medium text-white shadow-lg">
        Locomotive — Dark, Immersive, Cinematic
      </div>

      {/* ══════════════════════════════════════════════
          Section 1: Dark Hero (50vh)
          ══════════════════════════════════════════════ */}
      <div ref={heroRef} className="relative flex min-h-[50vh] items-center justify-center overflow-hidden bg-[#1a1714] sm:min-h-[55vh]">
        {/* Background image with reduced opacity */}
        <div className="absolute inset-0">
          <Image src="/images/regions/kansai-hero.jpg" alt="" fill className="object-cover opacity-30" priority sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1714]/60 via-[#1a1714]/40 to-[#1a1714]/80" />
        </div>

        {/* Film grain */}
        <GrainOverlay />

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-20 text-center sm:py-28">
          <Reveal delay={0}>
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">3,952+ Curated Places</p>
          </Reveal>

          <PreviewSplitText className="mt-4 justify-center font-serif text-[clamp(2.5rem,8vw,5rem)] leading-[1.1] text-white">
            Explore
          </PreviewSplitText>

          <Reveal delay={0.3}>
            <p className="mx-auto mt-6 max-w-2xl text-base text-white/70 sm:text-lg">
              Discover temples, gardens, street food, and hidden gems across every region of Japan.
            </p>
          </Reveal>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          Section 2: Navigation Bar Preview
          ══════════════════════════════════════════════ */}
      <Section label="Section 2 — Navigation">
        <div className="rounded-xl bg-[#1a1714]/60 px-6 py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-serif text-xl text-[#f0e8dc]">Koku Travel</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#b8ad9e]/60">Japan Planner</div>
            </div>
            <nav className="hidden items-center gap-8 sm:flex">
              {["Explore", "Guides", "Trip Builder", "Favorites"].map((item, i) => (
                <span key={item} className="relative text-sm font-medium uppercase tracking-wide">
                  <span className={i === 0 ? "text-[#c4504f]" : "text-[#b8ad9e] transition-colors hover:text-[#f0e8dc]"}>
                    {item}
                  </span>
                  {/* Animated underline */}
                  <span className={`absolute -bottom-1 left-0 h-[2px] bg-[#c4504f] transition-all duration-300 ${i === 0 ? "w-full" : "w-0 group-hover:w-full"}`} />
                </span>
              ))}
            </nav>
          </div>
        </div>
        <div className="mt-6 space-y-2 text-sm text-[#b8ad9e]">
          <p><strong className="text-[#f0e8dc]">Uppercase + tracking</strong> — reads as luxe on dark backgrounds.</p>
          <p><strong className="text-[#f0e8dc]">Animated underline</strong> — crimson line slides in on hover. Beautiful on dark.</p>
          <p><strong className="text-[#f0e8dc]">&quot;Japan Planner&quot; kept</strong> — adds craft-like detail on dark bg.</p>
          <p><strong className="text-[#f0e8dc]">Always transparent + blur</strong> — header merges with page content.</p>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          Section 3: Card Grid (4-column)
          ══════════════════════════════════════════════ */}
      <Section label="Section 3 — Card Grid (4 columns, staggered entry)">
        <div className="mb-4">
          <h2 className="font-serif text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] text-[#f0e8dc]">Location Cards</h2>
          <p className="mt-2 text-sm text-[#b8ad9e]">Dark surface, warm crimson glow on hover. Image scale + card lift. Staggered scroll-in animation.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {MOCK_LOCATIONS.map((loc, i) => (
            <LLocationCard key={loc.name} loc={loc} index={i} />
          ))}
        </div>

        <div className="mt-16 mb-4">
          <h2 className="font-serif text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] text-[#f0e8dc]">Guide Cards</h2>
          <p className="mt-2 text-sm text-[#b8ad9e]">Same luminous treatment. Badges in surface/90 with blur instead of white/90.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {MOCK_GUIDES.map((guide, i) => (
            <LGuideCard key={guide.title} guide={guide} index={i} />
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          Section 4: Buttons
          ══════════════════════════════════════════════ */}
      <Section label="Section 4 — Buttons">
        <p className="mb-6 text-sm text-[#b8ad9e]">Rounded-xl (keep current). Brighter brand colors for dark bg contrast.</p>
        <div className="flex flex-wrap items-center gap-4">
          <button className="inline-flex h-10 items-center justify-center rounded-xl bg-[#c4504f] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#c4504f]/90">
            Primary
          </button>
          <button className="inline-flex h-10 items-center justify-center rounded-xl border border-[#3a332a]/50 px-6 text-sm font-semibold text-[#f0e8dc] transition-colors hover:bg-[#242019]">
            Outline
          </button>
          <button className="inline-flex h-10 items-center justify-center rounded-xl px-6 text-sm font-semibold text-[#b8ad9e] transition-colors hover:bg-[#242019] hover:text-[#f0e8dc]">
            Ghost
          </button>
          <button className="inline-flex h-10 items-center justify-center rounded-xl bg-[#3da193] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3da193]/90">
            Success / Nature
          </button>
          <button className="inline-flex h-10 items-center justify-center rounded-xl bg-[#daa54e] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#daa54e]/90">
            Secondary / Amber
          </button>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          Section 5: Typography Scale
          ══════════════════════════════════════════════ */}
      <Section label="Section 5 — Typography Scale">
        <div className="space-y-8">
          <div>
            <p className="text-[0.75rem] font-medium uppercase tracking-[0.15em] text-[#b8ad9e]/60 mb-1">heading-page — clamp(2.5rem, 5vw, 4rem)</p>
            <h1 className="font-serif text-[clamp(2.5rem,5vw,4rem)] leading-[1.05] tracking-[-0.02em] text-[#f0e8dc]">Discover Japan</h1>
          </div>
          <div>
            <p className="text-[0.75rem] font-medium uppercase tracking-[0.15em] text-[#b8ad9e]/60 mb-1">heading-section — clamp(1.75rem, 3vw, 2.5rem)</p>
            <h2 className="font-serif text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] text-[#f0e8dc]">Popular Destinations</h2>
          </div>
          <div>
            <p className="text-[0.75rem] font-medium uppercase tracking-[0.15em] text-[#b8ad9e]/60 mb-1">heading-card — 1.25rem / font-medium</p>
            <h3 className="text-[1.25rem] font-medium leading-[1.3] text-[#f0e8dc]">Fushimi Inari Taisha</h3>
          </div>
          <div>
            <p className="text-[0.75rem] font-medium uppercase tracking-[0.15em] text-[#b8ad9e]/60 mb-1">body-lead — 1.125rem</p>
            <p className="max-w-2xl text-[1.125rem] leading-[1.7] text-[#b8ad9e]">Create your perfect Japan itinerary with curated recommendations from local experts and seasoned travelers.</p>
          </div>
          <div>
            <p className="text-[0.75rem] font-medium uppercase tracking-[0.15em] text-[#b8ad9e]/60 mb-1">eyebrow — 0.75rem / uppercase / tracking-[0.15em]</p>
            <p className="text-[0.75rem] font-medium uppercase tracking-[0.15em] text-white/60">Featured Collection</p>
          </div>
          <div>
            <p className="text-[0.75rem] font-medium uppercase tracking-[0.15em] text-[#b8ad9e]/60 mb-1">body — 1rem (base)</p>
            <p className="max-w-2xl text-base leading-[1.6] text-[#b8ad9e]">Koku Travel helps you plan thoughtful trips to Japan. Browse curated places, save your favorites, and build day-by-day itineraries tailored to your travel style.</p>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          Section 6: Page Transition Preview
          ══════════════════════════════════════════════ */}
      <Section label="Section 6 — Page Transition Preview">
        <p className="mb-6 text-sm text-[#b8ad9e]">Locomotive pages don&apos;t just fade — they perform. Click each to compare.</p>
        <TransitionDemo />
      </Section>

      {/* ══════════════════════════════════════════════
          Section 7: Value Proposition Bar (Dark)
          ══════════════════════════════════════════════ */}
      <Section label="Section 7 — Value Prop Bar (Dark)" className="!py-0">
        <p className="mb-6 text-sm text-[#b8ad9e]">Dark background (natural in the dark scheme). Numbers in warm white, labels in muted. Counter animation on scroll.</p>
        <div className="py-12">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { num: "3,952+", label: "Curated Places" },
              { num: "47", label: "Cities Covered" },
              { num: "15+", label: "Travel Guides" },
              { num: "9", label: "Regions" },
            ].map((stat, i) => (
              <Reveal key={stat.label} stagger={i * 0.08}>
                <div className="text-center">
                  <div className="font-mono text-3xl text-[#f0e8dc]">{stat.num}</div>
                  <div className="mt-1 text-sm text-[#b8ad9e]">{stat.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          Section 8: Design Principles
          ══════════════════════════════════════════════ */}
      <Section label="Section 8 — Design Principles">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Dark-Dominant Palette", desc: "Warm charcoal (#1a1714) as primary surface. Cards and inputs in elevated dark (#242019). Text in warm white (#f0e8dc)." },
            { title: "Scroll-Driven Choreography", desc: "Staggered card entries (0.05s per card). SplitText word reveals on every page title. Movement tied to scroll position." },
            { title: "Cinematic Heroes", desc: "Every page gets a 50vh dark hero with parallax image, film grain, and SplitText title. Consistent timing everywhere." },
            { title: "Luminous Cards", desc: "Dark surface cards with warm crimson glow on hover. Image scale 105% + translate-y lift. Floating effect on dark bg." },
            { title: "Theatrical Transitions", desc: "Clip-path wipes between pages instead of simple fades. Fast enough (0.6s) to feel snappy, slow enough to register." },
            { title: "Custom Cursor + Magnetic", desc: "Context-aware cursor states (dot, ring, view, drag). Magnetic pull on interactive elements. Touch devices get native cursor." },
          ].map((item, i) => (
            <Reveal key={item.title} stagger={i * 0.05}>
              <div className="space-y-2">
                <h3 className="text-[1.25rem] font-medium leading-[1.3] text-[#f0e8dc]">{item.title}</h3>
                <p className="text-sm leading-relaxed text-[#b8ad9e]">{item.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── Footer spacer ── */}
      <div className="h-24" />
    </div>
  );
}
