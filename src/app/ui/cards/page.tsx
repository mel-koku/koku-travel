import { ActivityCard } from "@/components/ui/ActivityCard";
import { Badge, Tag } from "@/components/ui/Badge";
import { CollectionCard } from "@/components/ui/CollectionCard";
import { LocationCard } from "@/components/ui/LocationCard";

const activityCards = [
  {
    timeRange: "08:30 – 11:00",
    title: "Tsukiji Outer Market Tasting Tour",
    location: "Tokyo · Tsukiji",
    description:
      "Sample freshly prepared sushi, wagyu skewers, and market specialties with a local guide leading the way.",
    highlights: ["Private guide", "Seafood focused", "Kid friendly"],
    tags: [
      { label: "Foodie", tone: "amber" },
      { label: "Morning", tone: "indigo" },
    ],
  },
  {
    timeRange: "15:00 – 17:30",
    title: "Kyoto Craft Tea Ceremony",
    location: "Kyoto · Gion",
    description:
      "Meet a fourth-generation tea master, explore a machiya townhouse, and whisk your own matcha alongside wagashi treats.",
    highlights: ["Cultural", "Small group", "Shoes-off space"],
    tags: [
      { label: "Culture", tone: "rose" },
      { label: "Tea", tone: "emerald" },
    ],
  },
];

const locationCards = [
  {
    title: "Naoshima Art Island",
    prefecture: "Kagawa Prefecture",
    description:
      "Futuristic Tadao Ando architecture, playful Yayoi Kusama sculptures, and hidden beach coves. Best explored via rental bike.",
    imageUrl:
      "https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&w=1200&q=80",
    season: "Spring 2026",
    tags: [
      { label: "Art & Design", tone: "rose" },
      { label: "Island Hopping", tone: "indigo" },
      { label: "2 hours from Osaka", tone: "slate" },
    ],
    metrics: [
      { label: "Travel time", value: "2h 15m" },
      { label: "Ideal stay", value: "1-2 nights" },
      { label: "Must-see", value: "Benesse House" },
    ],
  },
  {
    title: "Noboribetsu Onsen",
    prefecture: "Hokkaido",
    description:
      "A volcanic valley with nine mineral-rich hot springs, dramatic winter steam vents, and lantern-lit evening strolls.",
    imageUrl:
      "https://images.unsplash.com/photo-1473187983305-f615310e7daa?auto=format&fit=crop&w=1200&q=80",
    season: "Winter 2025",
    tags: [
      { label: "Hot Springs", tone: "emerald" },
      { label: "Snow Country", tone: "amber" },
    ],
    metrics: [
      { label: "Travel time", value: "1h 10m from Sapporo" },
      { label: "Ideal stay", value: "2 nights" },
      { label: "Core vibe", value: "Slow wellness" },
    ],
  },
];

const collectionCards = [
  {
    theme: "Seasonal spotlight",
    title: "Autumn Colors Across Japan",
    description:
      "Handpicked ryokan stays, foliage-viewing trails, and limited-edition dining experiences spanning Kyoto, Nikko, and Hokkaido.",
    tags: [
      { label: "7-day itinerary", tone: "amber" },
      { label: "Leaf peeping", tone: "rose" },
      { label: "Limited release", tone: "indigo" },
    ],
    tripCount: 18,
  },
  {
    theme: "Designer's picks",
    title: "Hyper-Modern Tokyo Weekend",
    description:
      "Bold architecture walks, Michelin ramen, neon night photography, and future-forward boutiques curated by our Tokyo field team.",
    tags: [
      { label: "3-day mini", tone: "indigo" },
      { label: "Nightlife", tone: "rose" },
      { label: "Photo ops", tone: "emerald" },
    ],
    tripCount: 9,
  },
];

export default function CardsDemoPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-10 py-16">
      <header className="flex flex-col gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-600">
          Phase 1 · UI Kit
        </span>
        <h1 className="text-4xl font-bold leading-tight text-gray-900">Card Library</h1>
        <p className="max-w-2xl text-lg text-gray-600">
          Base surfaces and their feature variants. Use these to showcase activities, explorer grid
          items, and curated collections across the app.
        </p>
      </header>

      <section className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900">Base Elements</h2>
          <p className="text-sm text-gray-600">
            The building blocks—mix badges and tags to compose rich hierarchies inside cards.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="indigo">Primary</Badge>
          <Badge tone="rose" variant="outline">
            Outline
          </Badge>
          <Badge tone="emerald" variant="solid">
            Solid
          </Badge>
          <Tag tone="amber">Seasonal</Tag>
          <Tag tone="slate">Walking distance</Tag>
        </div>
      </section>

      <section className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900">Activity Cards</h2>
          <p className="text-sm text-gray-600">
            Designed for itinerary timelines—pair time blocks with location context and highlights.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {activityCards.map((activity) => (
            <ActivityCard key={activity.title} {...activity} />
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900">Location Cards</h2>
          <p className="text-sm text-gray-600">
            Grid-friendly hero cards for the Explore surfaces. Imagery, travel stats, and category
            tags surface the vibe instantly.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {locationCards.map((location) => (
            <LocationCard key={location.title} {...location} />
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-gray-900">Collection Cards</h2>
          <p className="text-sm text-gray-600">
            Themed guide surfaces that bundle activities by mood, pace, and season. Use CTAs to drive
            deeper exploration.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {collectionCards.map((collection) => (
            <CollectionCard key={collection.title} {...collection} />
          ))}
        </div>
      </section>
    </main>
  );
}

