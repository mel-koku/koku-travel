/**
 * Centralized icon-name → Lucide component mapper.
 *
 * Mirrors the `VIBE_ICON_MAP` pattern in `src/data/vibeIcons.tsx`. Data files
 * (prepChecklist, tipGenerator, packingAdvisor, activityCategories,
 * itineraryConflicts, etc.) store **icon name strings** rather than emoji
 * characters or JSX. Components render them through `<DataIcon name="..."/>`.
 *
 * When a name has no entry in the map, we fall back to `Sparkles` rather than
 * rendering nothing — keeps the layout stable while making missing-mapping
 * regressions visible.
 */
import {
  Accessibility,
  AlertTriangle,
  Backpack,
  BookOpen,
  Bus,
  CalendarClock,
  Camera,
  Check,
  CheckCircle,
  Clock,
  Cloud,
  CloudDrizzle,
  CloudRain,
  Coffee,
  Coins,
  CreditCard,
  Eye,
  Feather,
  Flame,
  Footprints,
  Globe,
  HandHeart,
  HelpCircle,
  Hourglass,
  Info,
  Landmark,
  Languages,
  Leaf,
  Lightbulb,
  type LucideIcon,
  Luggage,
  Map as MapIcon,
  Moon,
  Mountain,
  Palette,
  Phone,
  Plug,
  Power,
  RefreshCw,
  Scissors,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Smile,
  Snowflake,
  Sparkles,
  Star,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Ticket,
  TrainFront,
  Tractor,
  Trees,
  Umbrella,
  Unlock,
  UserRoundCheck,
  Users,
  Utensils,
  Waves,
  Wifi,
  Wind,
} from "lucide-react";
import { ToriiIcon } from "@/data/vibeIcons";

/**
 * Map of icon-name strings (kebab-case) to Lucide components (or our local
 * SVG components like `ToriiIcon`). Add new names here as data files
 * introduce them.
 */
export const DATA_ICON_MAP: Record<string, LucideIcon | typeof ToriiIcon> = {
  // Generic / fallback
  sparkles: Sparkles,
  star: Star,
  info: Info,
  "alert-triangle": AlertTriangle,
  check: Check,
  "check-circle": CheckCircle,
  lightbulb: Lightbulb,
  "help-circle": HelpCircle,

  // Time / scheduling
  clock: Clock,
  hourglass: Hourglass,
  "calendar-clock": CalendarClock,
  "refresh-cw": RefreshCw,

  // Sun / sky / weather
  sunrise: Sunrise,
  sunset: Sunset,
  sun: Sun,
  cloud: Cloud,
  "cloud-rain": CloudRain,
  "cloud-drizzle": CloudDrizzle,
  umbrella: Umbrella,
  thermometer: Thermometer,
  snowflake: Snowflake,
  wind: Wind,
  leaf: Leaf,

  // People / culture
  users: Users,
  "user-round-check": UserRoundCheck,
  "hand-heart": HandHeart,
  smile: Smile,
  accessibility: Accessibility,
  camera: Camera,
  moon: Moon,

  // Travel / transport
  "train-front": TrainFront,
  "train-tram": TrainFront, // metro/light-rail closest match (no TrainTram in pinned lucide)
  bus: Bus,
  ferry: Waves, // no Ferry glyph in pinned lucide; Waves is closest semantic
  footprints: Footprints,
  luggage: Luggage,
  map: MapIcon,
  globe: Globe,

  // Money / payment
  coins: Coins,
  "credit-card": CreditCard,
  "shopping-cart": ShoppingCart,
  "shopping-bag": ShoppingBag,
  ticket: Ticket,

  // Tech / connectivity
  smartphone: Smartphone,
  wifi: Wifi,
  plug: Plug,
  power: Power,

  // Comms
  phone: Phone,

  // Apparel / gear
  shirt: Shirt,
  backpack: Backpack,

  // Body / wellness / hot springs
  flame: Flame,
  eye: Eye,

  // Nature / outdoors
  mountain: Mountain,
  tree: Trees, // no singular Tree glyph in pinned lucide; Trees works as default
  trees: Trees,
  waves: Waves,

  // Cultural / craft
  landmark: Landmark,
  "torii-gate": ToriiIcon,
  utensils: Utensils,
  coffee: Coffee,
  palette: Palette,
  scissors: Scissors,
  feather: Feather,
  pottery: Sparkles, // no pottery/vase glyph — fallback
  tractor: Tractor,
  "book-open": BookOpen,

  // Security / docs
  "shield-check": ShieldCheck,
  unlock: Unlock,
  languages: Languages,
};

type DataIconProps = {
  /** kebab-case icon name from `DATA_ICON_MAP`. Unknown names render `Sparkles`. */
  name: string;
  /** Tailwind classes (size + colour). Defaults to `h-4 w-4`. */
  className?: string;
  /** Defaults to true. Set to false if the icon is the only label. */
  "aria-hidden"?: boolean;
};

/**
 * Render a Lucide icon by name. Falls back to `Sparkles` if the name is not
 * registered in `DATA_ICON_MAP`.
 */
export function DataIcon({
  name,
  className = "h-4 w-4",
  "aria-hidden": ariaHidden = true,
}: DataIconProps) {
  const Icon = DATA_ICON_MAP[name] ?? Sparkles;
  return <Icon aria-hidden={ariaHidden} className={className} />;
}
