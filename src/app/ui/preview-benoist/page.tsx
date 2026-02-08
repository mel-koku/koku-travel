"use client";

import Image from "next/image";

/* ─── Mock Data ─── */
const MOCK_LOCATIONS = [
  { name: "Fushimi Inari Taisha", city: "Kyoto", region: "Kansai", category: "shrine", rating: 4.7, reviews: 12400, image: "/images/regions/kansai-hero.jpg", summary: "Iconic trail of thousands of vermilion torii gates winding through a forested hillside." },
  { name: "Kenrokuen Garden", city: "Kanazawa", region: "Chubu", category: "nature", rating: 4.5, reviews: 3200, image: "/images/regions/chubu-hero.jpg", summary: "One of Japan's three most beautiful landscape gardens, stunning in every season." },
  { name: "Glover Garden", city: "Nagasaki", region: "Kyushu", category: "landmark", rating: 4.3, reviews: 1800, image: "/images/regions/kyushu-hero.jpg", summary: "Historic hilltop garden with Western-style homes and panoramic harbor views." },
];

const MOCK_GUIDES = [
  { title: "3 Days in Kyoto: Temples, Tea & Tradition", type: "Itinerary", location: "Kyoto", readTime: 8, image: "/images/regions/kansai-hero.jpg", summary: "A curated three-day route through Kyoto's most atmospheric temples, gardens, and tea houses." },
  { title: "Hokkaido's Best Onsen Towns", type: "Deep Dive", location: "Hokkaido", readTime: 12, image: "/images/regions/hokkaido-hero.jpg", summary: "From Noboribetsu's volcanic pools to Jozankei's riverside baths, the ultimate hot spring guide." },
  { title: "Where to Eat in Fukuoka", type: "Top Picks", location: "Fukuoka", readTime: 6, image: "/images/regions/kyushu-hero.jpg", summary: "Hakata ramen, mentaiko, and yatai street stalls — a food lover's guide to Kyushu's capital." },
];

/* ─── Section Wrapper ─── */
function Section({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`py-[clamp(4rem,8vw,8rem)] ${className}`}>
      <div className="mx-auto max-w-6xl px-[clamp(1rem,3vw,2rem)]">
        <div className="mb-8 border-b border-[#e3d5c3] pb-3">
          <span className="text-[0.75rem] font-medium uppercase tracking-[0.15em] text-[#9a8d7e]">{label}</span>
        </div>
        {children}
      </div>
    </section>
  );
}

/* ─── Star Icon ─── */
function StarIcon() {
  return (
    <svg aria-hidden className="h-4 w-4 text-[#d4a017]" viewBox="0 0 24 24" fill="currentColor">
      <path d="m12 17.27 5.18 3.11-1.64-5.81L20.9 9.9l-6-0.52L12 4 9.1 9.38l-6 .52 5.36 4.67L6.82 20.38 12 17.27z" />
    </svg>
  );
}

/* ─── Location Card (Benoist) ─── */
function BLocationCard({ loc }: { loc: (typeof MOCK_LOCATIONS)[0] }) {
  return (
    <article className="group overflow-hidden rounded-lg border border-[#e3d5c3] bg-[#faf5ef] transition-shadow duration-300 hover:shadow-[0_2px_40px_rgba(31,26,20,0.1)]">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#f2ebe0]">
        <Image src={loc.image} alt={loc.name} fill className="object-cover" sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" />
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-[#1f1a14] line-clamp-1">{loc.name}</h3>
          <div className="flex shrink-0 items-center gap-1 text-sm">
            <StarIcon />
            <span className="text-[#1f1a14]">{loc.rating}</span>
            <span className="text-[#9a8d7e]">({(loc.reviews / 1000).toFixed(1)}k)</span>
          </div>
        </div>
        <p className="text-sm text-[#9a8d7e]">{loc.city}, {loc.region}</p>
        <p className="text-sm text-[#9a8d7e] line-clamp-2">{loc.summary}</p>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs font-medium capitalize bg-[#f2ebe0] text-[#5a4f44] px-2.5 py-1 rounded-lg">{loc.category}</span>
        </div>
      </div>
    </article>
  );
}

/* ─── Guide Card (Benoist) ─── */
function BGuideCard({ guide }: { guide: (typeof MOCK_GUIDES)[0] }) {
  return (
    <article className="group overflow-hidden rounded-lg border border-[#e3d5c3] bg-[#faf5ef] transition-shadow duration-300 hover:shadow-[0_2px_40px_rgba(31,26,20,0.1)]">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#f2ebe0]">
        <Image src={guide.image} alt={guide.title} fill className="object-cover" sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" />
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center rounded-lg bg-white/90 px-2.5 py-1 text-xs font-medium text-[#1f1a14] backdrop-blur-sm">{guide.type}</span>
        </div>
        {guide.readTime && (
          <div className="absolute bottom-3 right-3">
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#1f1a14]/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">{guide.readTime} min read</span>
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <p className="text-sm text-[#9a8d7e]">{guide.location}</p>
        <h3 className="font-semibold text-[#1f1a14] line-clamp-2">{guide.title}</h3>
        <p className="text-sm text-[#9a8d7e] line-clamp-2">{guide.summary}</p>
      </div>
    </article>
  );
}

/* ─── Page ─── */
export default function PreviewBenoistPage() {
  return (
    <div className="min-h-screen bg-[#faf5ef]">
      {/* ── Direction Label ── */}
      <div className="fixed top-4 right-4 z-50 rounded-lg bg-[#1f1a14] px-4 py-2 text-sm font-medium text-white shadow-lg">
        Benoist — Light, Typographic, Restrained
      </div>

      {/* ══════════════════════════════════════════════
          Section 1: Page Header
          ══════════════════════════════════════════════ */}
      <div className="bg-[#faf5ef] pt-24 pb-16 sm:pt-32 sm:pb-20">
        <div className="mx-auto max-w-6xl px-[clamp(1rem,3vw,2rem)]">
          <p className="text-[0.75rem] font-medium uppercase tracking-[0.15em] text-[#5a4f44]">3,952+ Curated Places</p>
          <h1 className="mt-3 font-serif text-[clamp(2.5rem,5vw,4rem)] leading-[1.05] tracking-[-0.02em] text-[#1f1a14]">
            Explore
          </h1>
          <p className="mt-4 max-w-2xl text-[1.125rem] leading-[1.7] text-[#5a4f44]">
            Discover temples, gardens, street food, and hidden gems across every region of Japan.
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          Section 2: Navigation Bar Preview
          ══════════════════════════════════════════════ */}
      <Section label="Section 2 — Navigation">
        <div className="rounded-lg border border-[#e3d5c3]/50 bg-[#faf5ef]/90 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="font-serif text-xl text-[#1f1a14]">Koku Travel</div>
            <nav className="hidden items-center gap-8 sm:flex">
              {["Explore", "Guides", "Trip Builder", "Favorites"].map((item, i) => (
                <span
                  key={item}
                  className={`text-sm font-normal tracking-normal transition-colors ${
                    i === 0 ? "text-[#8c2f2f]" : "text-[#5a4f44] hover:text-[#1f1a14]"
                  }`}
                >
                  {item}
                </span>
              ))}
            </nav>
          </div>
        </div>
        <div className="mt-6 space-y-2 text-sm text-[#5a4f44]">
          <p><strong className="text-[#1f1a14]">Sentence case</strong> — not uppercase. Quieter, less shouty.</p>
          <p><strong className="text-[#1f1a14]">Color transition only</strong> — no animated underlines. Active state uses brand-primary.</p>
          <p><strong className="text-[#1f1a14]">No subtitle</strong> — &quot;Japan Planner&quot; removed. Brand name alone is sufficient.</p>
          <p><strong className="text-[#1f1a14]">Solid background</strong> — bg-background/90 with backdrop-blur on scroll.</p>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          Section 3: Card Grid (3-column)
          ══════════════════════════════════════════════ */}
      <Section label="Section 3 — Card Grid (3 columns)">
        <div className="mb-4">
          <h2 className="font-serif text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] text-[#1f1a14]">Location Cards</h2>
          <p className="mt-2 text-sm text-[#5a4f44]">Shadow change only on hover. No translate-y, no image scale. Rounded-lg corners.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
          {MOCK_LOCATIONS.map((loc) => (
            <BLocationCard key={loc.name} loc={loc} />
          ))}
        </div>

        <div className="mt-16 mb-4">
          <h2 className="font-serif text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] text-[#1f1a14]">Guide Cards</h2>
          <p className="mt-2 text-sm text-[#5a4f44]">Same family as location cards. 4:3 aspect ratio. Rounded-lg badges.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
          {MOCK_GUIDES.map((guide) => (
            <BGuideCard key={guide.title} guide={guide} />
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          Section 4: Buttons
          ══════════════════════════════════════════════ */}
      <Section label="Section 4 — Buttons">
        <p className="mb-6 text-sm text-[#5a4f44]">Rounded-lg (not rounded-full/pill). Editorial feel, not consumer-app.</p>
        <div className="flex flex-wrap items-center gap-4">
          <button className="inline-flex h-10 items-center justify-center rounded-lg bg-[#8c2f2f] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#8c2f2f]/90">
            Primary
          </button>
          <button className="inline-flex h-10 items-center justify-center rounded-lg border border-[#e3d5c3] bg-[#faf5ef] px-6 text-sm font-semibold text-[#1f1a14] shadow-sm transition-colors hover:bg-[#f2ebe0]">
            Outline
          </button>
          <button className="inline-flex h-10 items-center justify-center rounded-lg px-6 text-sm font-semibold text-[#5a4f44] transition-colors hover:bg-[#f2ebe0] hover:text-[#1f1a14]">
            Ghost
          </button>
          <button className="inline-flex h-10 items-center justify-center rounded-lg bg-[#2d7a6f] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2d7a6f]/90">
            Success / Nature
          </button>
          <button className="inline-flex h-10 items-center justify-center rounded-lg bg-[#c6923a] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#c6923a]/90">
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
            <p className="text-[0.75rem] font-medium uppercase tracking-[0.15em] text-[#9a8d7e] mb-1">heading-page — clamp(2.5rem, 5vw, 4rem)</p>
            <h1 className="font-serif text-[clamp(2.5rem,5vw,4rem)] leading-[1.05] tracking-[-0.02em] text-[#1f1a14]">Discover Japan</h1>
          </div>
          <div>
            <p className="text-[0.75rem] font-medium uppercase tracking-[0.15em] text-[#9a8d7e] mb-1">heading-section — clamp(1.75rem, 3vw, 2.5rem)</p>
            <h2 className="font-serif text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.1] text-[#1f1a14]">Popular Destinations</h2>
          </div>
          <div>
            <p className="text-[0.75rem] font-medium uppercase tracking-[0.15em] text-[#9a8d7e] mb-1">heading-card — 1.25rem / font-medium</p>
            <h3 className="text-[1.25rem] font-medium leading-[1.3] text-[#1f1a14]">Fushimi Inari Taisha</h3>
          </div>
          <div>
            <p className="text-[0.75rem] font-medium uppercase tracking-[0.15em] text-[#9a8d7e] mb-1">body-lead — 1.125rem</p>
            <p className="max-w-2xl text-[1.125rem] leading-[1.7] text-[#5a4f44]">Create your perfect Japan itinerary with curated recommendations from local experts and seasoned travelers.</p>
          </div>
          <div>
            <p className="text-[0.75rem] font-medium uppercase tracking-[0.15em] text-[#9a8d7e] mb-1">eyebrow — 0.75rem / uppercase / tracking-[0.15em]</p>
            <p className="text-[0.75rem] font-medium uppercase tracking-[0.15em] text-[#5a4f44]">Featured Collection</p>
          </div>
          <div>
            <p className="text-[0.75rem] font-medium uppercase tracking-[0.15em] text-[#9a8d7e] mb-1">body — 1rem (base)</p>
            <p className="max-w-2xl text-base leading-[1.6] text-[#5a4f44]">Koku Travel helps you plan thoughtful trips to Japan. Browse curated places, save your favorites, and build day-by-day itineraries tailored to your travel style.</p>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          Section 6: Value Proposition Bar (Light)
          ══════════════════════════════════════════════ */}
      <Section label="Section 6 — Value Prop Bar (Light)" className="!py-0">
        <p className="mb-6 text-sm text-[#5a4f44]">Light bg with top border. Numbers in charcoal, labels in warm-gray. Simple ScrollReveal, no spring animations.</p>
        <div className="border-t border-[#e3d5c3] bg-[#faf5ef] py-12">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { num: "3,952+", label: "Curated Places" },
              { num: "47", label: "Cities Covered" },
              { num: "15+", label: "Travel Guides" },
              { num: "9", label: "Regions" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-serif text-3xl text-[#1f1a14]">{stat.num}</div>
                <div className="mt-1 text-sm text-[#5a4f44]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════
          Section 7: Feature Comparison Notes
          ══════════════════════════════════════════════ */}
      <Section label="Section 7 — Design Principles">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Typography-Driven", desc: "Hierarchy communicated through type scale and weight, not color or decoration. Serif for headings, sans for body." },
            { title: "Whitespace as Structure", desc: "Generous section spacing (clamp 4rem–8rem). Content breathes. The page feels calm and unhurried." },
            { title: "Restrained Animation", desc: "ScrollReveal with opacity fade and 20px shift. No SplitText word reveals, no parallax, no magnetic effects." },
            { title: "Shadow-Only Hover", desc: "Cards change shadow on hover (shadow-soft). No translate-y lift, no image zoom. Confidence through stillness." },
            { title: "Consistent Containers", desc: "max-w-6xl everywhere. 3-column grids. Predictable rhythm that feels intentional, not random." },
            { title: "Light & Warm", desc: "Parchment background (#faf5ef), cream surfaces, sand borders. The warm palette stays — it's the animation and layout that changes." },
          ].map((item) => (
            <div key={item.title} className="space-y-2">
              <h3 className="text-[1.25rem] font-medium leading-[1.3] text-[#1f1a14]">{item.title}</h3>
              <p className="text-sm leading-relaxed text-[#5a4f44]">{item.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Footer spacer ── */}
      <div className="h-24" />
    </div>
  );
}
