/**
 * Centralized icon-name → Lucide component mapper.
 *
 * Mirrors the `VIBE_ICON_MAP` pattern in `src/data/vibeIcons.tsx`. Data files
 * (prepChecklist, tipGenerator, packingAdvisor, activityCategories,
 * itineraryConflicts, etc.) store **icon name strings** rather than emoji
 * characters or JSX. Components render them through `<DataIcon name="..."/>`.
 *
 * Backwards-compat: `EMOJI_TO_ICON_NAME` resolves raw emoji strings (still
 * present in some Supabase rows like `travel_guidance.icon` and a few
 * not-yet-migrated data files) to icon names, so the component renders the
 * right glyph until a backfill runs.
 *
 * When a name has no entry in the map, we fall back to `Sparkles` rather than
 * rendering nothing — keeps the layout stable while making missing-mapping
 * regressions visible.
 */
import {
  Accessibility,
  AlertTriangle,
  Anchor,
  Armchair,
  ArrowRight,
  ArrowUpDown,
  Backpack,
  Banknote,
  Bath,
  Beef,
  Beer,
  Bell,
  Bike,
  Bird,
  BookOpen,
  Bookmark,
  Building,
  Bus,
  Cake,
  CalendarClock,
  Camera,
  Car,
  Castle,
  Cat,
  Cherry,
  Check,
  CheckCircle,
  Construction,
  CookingPot,
  Clock,
  Cloud,
  CloudDrizzle,
  CloudRain,
  Coffee,
  Coins,
  CreditCard,
  Dog,
  DoorOpen,
  Drumstick,
  Dumbbell,
  Egg,
  Eye,
  Feather,
  FerrisWheel,
  Fish,
  Flame,
  FlameKindling,
  Flower,
  Flower2,
  Footprints,
  Frown,
  Gift,
  Globe,
  GraduationCap,
  HandHeart,
  Hash,
  Heart,
  HelpCircle,
  Hotel,
  Hourglass,
  Image as ImageIcon,
  Info,
  JapaneseYen,
  Landmark,
  Languages,
  Leaf,
  Lightbulb,
  Link2,
  type LucideIcon,
  Luggage,
  Map as MapIcon,
  Mic,
  Moon,
  Mountain,
  MountainSnow,
  Music,
  Palette,
  Phone,
  Pill,
  Plug,
  Power,
  Receipt,
  Repeat,
  RefreshCw,
  Sailboat,
  Scissors,
  Scroll,
  Search,
  ShieldCheck,
  Ship,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Shuffle,
  Siren,
  Smartphone,
  Smile,
  Snowflake,
  Soup,
  Sparkles,
  Sprout,
  Star,
  Stethoscope,
  Sun,
  Sunrise,
  Sunset,
  Tag,
  Tent,
  TestTube,
  Thermometer,
  Ticket,
  TrainFront,
  Tractor,
  Trash,
  Trees,
  Type as TypeIcon,
  Umbrella,
  Unlock,
  UserRoundCheck,
  Users,
  Utensils,
  Waves,
  Wifi,
  Wind,
  Wine,
  Zap,
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
  zap: Zap,
  heart: Heart,
  gift: Gift,
  bell: Bell,
  image: ImageIcon,
  trash: Trash,

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
  flower: Flower,
  "flower-2": Flower2,
  cherry: Cherry,
  sprout: Sprout,

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
  ferry: Sailboat,
  ship: Ship,
  sailboat: Sailboat,
  anchor: Anchor,
  footprints: Footprints,
  luggage: Luggage,
  map: MapIcon,
  globe: Globe,
  hotel: Hotel,
  building: Building,

  // Money / payment
  coins: Coins,
  "credit-card": CreditCard,
  "shopping-cart": ShoppingCart,
  "shopping-bag": ShoppingBag,
  ticket: Ticket,
  "japanese-yen": JapaneseYen,
  banknote: Banknote,
  receipt: Receipt,

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
  "flame-kindling": FlameKindling,
  eye: Eye,
  bath: Bath,
  bird: Bird,

  // Nature / outdoors
  mountain: Mountain,
  "mountain-snow": MountainSnow,
  tree: Trees, // no singular Tree glyph in pinned lucide; Trees works as default
  trees: Trees,
  waves: Waves,
  tent: Tent,
  "ferris-wheel": FerrisWheel,

  // Cultural / craft
  landmark: Landmark,
  castle: Castle,
  "torii-gate": ToriiIcon,
  utensils: Utensils,
  coffee: Coffee,
  palette: Palette,
  scissors: Scissors,
  feather: Feather,
  pottery: Sparkles, // no pottery/vase glyph — fallback
  tractor: Tractor,
  "book-open": BookOpen,
  scroll: Scroll,

  // Food (specific)
  fish: Fish,
  beef: Beef,
  beer: Beer,
  wine: Wine,
  cake: Cake,
  egg: Egg,
  drumstick: Drumstick,
  soup: Soup,
  "cooking-pot": CookingPot,

  // Lab / science
  "test-tube": TestTube,

  // Security / docs
  "shield-check": ShieldCheck,
  unlock: Unlock,
  languages: Languages,

  // Vehicles / mobility
  car: Car,
  bike: Bike,
  "door-open": DoorOpen,
  siren: Siren,

  // People / fitness / mood
  frown: Frown,
  dumbbell: Dumbbell,

  // Building extensions
  construction: Construction,
  stethoscope: Stethoscope,

  // Furniture / objects
  armchair: Armchair,
  pill: Pill,

  // Education
  "graduation-cap": GraduationCap,

  // Music / audio
  music: Music,
  mic: Mic,

  // Symbols / arrows / utility
  "arrow-up-down": ArrowUpDown,
  "arrow-right": ArrowRight,
  search: Search,
  bookmark: Bookmark,
  tag: Tag,
  hash: Hash,
  type: TypeIcon,
  link: Link2,
  repeat: Repeat,
  shuffle: Shuffle,

  // Animals
  cat: Cat,
  dog: Dog,
};

/**
 * Map of raw emoji strings → kebab-case names registered in `DATA_ICON_MAP`.
 *
 * Used as a backwards-compat shim: components that render `<DataIcon
 * name={tip.icon}/>` continue to render the right icon for DB rows or data
 * files that still hold emoji values. Fall back to `"sparkles"` for emojis
 * with no good Lucide equivalent.
 *
 * Both base codepoints and emoji-presentation variants (`️`) of the same
 * glyph are listed where they appear in source.
 */
export const EMOJI_TO_ICON_NAME: Record<string, string> = {
  // Flora / seasons
  "🌸": "flower", // cherry blossom
  "🌺": "flower-2", // hibiscus
  "🌻": "flower-2", // sunflower
  "🌷": "flower",
  "🪷": "flower-2", // lotus
  "🍁": "leaf", // maple
  "🍂": "leaf", // fallen leaf
  "🍃": "leaf",
  "🌿": "leaf", // herb
  "🌱": "sprout",
  "🌲": "trees",
  "🌳": "trees",
  "🎋": "trees", // tanabata bamboo
  "🌶️": "flame", // hot pepper
  "🌶": "flame",
  "🍒": "cherry",

  // Sun / sky / weather / celestial
  "☀️": "sun",
  "☀": "sun",
  "🌅": "sunrise",
  "🌄": "sunrise", // sunrise over mountains
  "🌃": "moon", // night with stars
  "🌙": "moon",
  "🌟": "star",
  "⭐": "star",
  "✨": "sparkles",
  "💫": "sparkles",
  "🎆": "sparkles", // fireworks
  "🎇": "sparkles",
  "❄️": "snowflake",
  "❄": "snowflake",
  "⛄": "snowflake", // snowman
  "☁️": "cloud",
  "🌧️": "cloud-rain",
  "☔": "umbrella",
  "🌊": "waves",
  "💧": "cloud-drizzle",
  "⚡": "zap",

  // Landmarks / structures
  "⛩️": "torii-gate",
  "⛩": "torii-gate",
  "🛕": "landmark", // hindu temple
  "🏯": "castle", // japanese castle
  "🏰": "castle",
  "🏛️": "landmark",
  "🏛": "landmark",
  "🗼": "landmark", // tokyo tower
  "🗻": "mountain", // mount fuji
  "🗾": "map", // map of japan
  "🗺️": "map",
  "🗺": "map",
  "🏔️": "mountain-snow",
  "🏔": "mountain-snow",
  "🏖️": "umbrella", // beach
  "🏖": "umbrella",
  "🏝️": "trees", // desert island — no palm tree glyph
  "🏝": "trees",
  "🏪": "shopping-bag", // convenience store
  "🏧": "credit-card", // ATM
  "🏮": "flame", // izakaya lantern
  "🪔": "flame", // diya lamp
  "🕯️": "flame", // candle
  "🕯": "flame",

  // People / gestures / wellness
  "🙏": "hand-heart", // praying hands / thanks
  "🤲": "hand-heart", // palms up
  "🙇": "user-round-check", // person bowing
  "👋": "users", // waving hand
  "🚶": "footprints", // pedestrian
  "👟": "footprints", // sneaker
  "🧖": "bath", // person in steamy room
  "🛁": "bath",
  "😊": "smile",
  "💜": "heart",

  // Animals
  "🦌": "trees", // deer (Nara) — no deer glyph; trees evokes Nara Park
  "🦀": "fish", // crab
  "🐙": "fish", // octopus
  "🐟": "fish",
  "🐠": "fish",
  "🕊️": "bird", // dove (peace)
  "🕊": "bird",

  // Food & drink
  "🍵": "coffee", // matcha
  "☕": "coffee",
  "🍶": "wine", // sake
  "🍺": "beer",
  "🥃": "wine", // tumbler
  "🍸": "wine",
  "🥤": "coffee", // cup with straw
  "🍜": "soup", // ramen
  "🍲": "soup", // pot of food
  "🍣": "fish", // sushi
  "🍱": "utensils", // bento
  "🍙": "utensils", // rice ball
  "🍥": "soup", // fish cake
  "🍡": "utensils", // dango
  "🍢": "utensils", // oden
  "🍳": "egg",
  "🥩": "beef",
  "🥟": "drumstick", // dumpling
  "🥞": "cake", // pancakes
  "🥢": "utensils", // chopsticks
  "🍽️": "utensils",
  "🍽": "utensils",
  "🍰": "cake",

  // Money / commerce
  "💴": "japanese-yen",
  "💳": "credit-card",
  "🪙": "coins",
  "🛍️": "shopping-bag",
  "🛍": "shopping-bag",
  "🧾": "receipt",
  "🎫": "ticket",
  "🎁": "gift",

  // Tech / comms
  "📱": "smartphone",
  "📷": "camera",
  "📸": "camera",
  "🖼️": "image",
  "🖼": "image",

  // Symbols / misc
  "🔥": "flame",
  "🔔": "bell",
  "🔐": "shield-check",
  "💡": "lightbulb",
  "📜": "scroll",
  "📖": "book-open",
  "🪧": "info", // sign
  "🪨": "mountain", // rock
  "🎀": "gift", // ribbon
  "🎏": "sparkles", // carp streamer
  "🎨": "palette",
  "🎯": "star", // bullseye
  "🎷": "sparkles", // saxophone
  "🧪": "test-tube",
  "🚃": "train-front",
  "🚄": "train-front", // shinkansen
  "🚋": "train-tram",
  "🚢": "ship",
  "⚓": "anchor",
  "✈️": "luggage", // airplane — no Plane in pinned set; luggage closest semantic
  "✈": "luggage",
  "🇯🇵": "sparkles", // jp flag — no flag glyph in pinned set
  "♨️": "flame-kindling", // hot springs / onsen
  "♨": "flame-kindling",
  "🗑️": "trash",
  "🗑": "trash",
  "🔴": "alert-triangle", // red circle (used for holiday warnings)

  // ── Extended mappings (travel_guidance backfill 2026-04-28) ──
  // Transit & mobility
  "🚌": "bus",
  "🚇": "train-front",
  "🚊": "train-front",
  "🚂": "train-front",
  "🚆": "train-front",
  "🚉": "train-front",
  "🚅": "train-front",
  "🚗": "car",
  "🚕": "car",
  "🚲": "bike",
  "🚿": "cloud-drizzle",
  "🛏️": "bath",
  "🛏": "bath",
  "🚪": "door-open",
  "🚺": "users",
  "🚻": "users",
  "🚽": "users",
  "🚰": "cloud-drizzle",
  "🚨": "siren",
  "🚭": "alert-triangle",
  "🚫": "alert-triangle",
  "🚡": "sparkles",
  "🩴": "footprints",
  "🚶‍♂️": "footprints", // ZWJ variant of pedestrian
  "⛷️": "mountain",
  "⛷": "mountain",

  // People / emotions / poses
  "😰": "frown",
  "😔": "frown",
  "😬": "smile",
  "😄": "smile",
  "😋": "smile",
  "😌": "smile",
  "😷": "smile",
  "🤧": "smile",
  "🤫": "smile",
  "🙅": "users",
  "🙋": "users",
  "🙈": "users",
  "👥": "users",
  "👧": "users",
  "👶": "users",
  "👹": "users",
  "👨‍🍳": "utensils", // chef ZWJ
  "👨‍👩‍👧‍👦": "users", // family ZWJ
  "💃": "users",
  "🤝": "hand-heart",
  "🧘": "users",
  "🧎": "users",
  "🏃": "users",
  "🏋️": "dumbbell",
  "🏋": "dumbbell",
  "🤼": "users",
  "💇": "scissors",
  "💄": "sparkles",
  "👀": "eye",
  "🤖": "smartphone",

  // Food
  "🍻": "beer",
  "🥂": "wine",
  "🍞": "utensils",
  "🍠": "utensils",
  "🍚": "utensils",
  "🍗": "drumstick",
  "🍴": "utensils",
  "🥣": "soup",
  "🥬": "leaf",
  "🥚": "egg",
  "🥶": "snowflake",
  "🥵": "flame",

  // Buildings / places
  "🏘️": "building",
  "🏘": "building",
  "🏚️": "building",
  "🏚": "building",
  "🏨": "building",
  "🏩": "building",
  "🏬": "building",
  "🏢": "building",
  "🏗️": "construction",
  "🏗": "construction",
  "🏥": "stethoscope",
  "🏞️": "mountain",
  "🏞": "mountain",
  "🕌": "landmark",

  // Objects
  "💺": "armchair",
  "📚": "book-open",
  "📅": "calendar-clock",
  "📋": "scroll",
  "📐": "scroll",
  "📄": "scroll",
  "📵": "smartphone",
  "📲": "smartphone",
  "📿": "sparkles",
  "🛸": "sparkles",
  "🧳": "luggage",
  "🧥": "shirt",
  "🧴": "sparkles",
  "🧺": "sparkles",
  "🧻": "sparkles",
  "🧊": "snowflake",
  "🪦": "sparkles",
  "💊": "pill",
  "💚": "heart",
  "💐": "flower",
  "💯": "star",
  "💰": "coins",
  "💵": "coins",
  "📦": "shopping-bag",
  "🏷️": "ticket",
  "🏷": "ticket",
  "🥾": "mountain", // hiking boots

  // Symbols / arrows / status
  "↕️": "arrow-up-down",
  "↕": "arrow-up-down",
  "➡️": "arrow-right",
  "➡": "arrow-right",
  "♿": "accessibility",
  "♻️": "refresh-cw",
  "♻": "refresh-cw",
  "⚠️": "alert-triangle",
  "⚠": "alert-triangle",
  "⏰": "clock",
  "⏱️": "clock",
  "⏱": "clock",
  "❌": "alert-triangle",
  "☮️": "sparkles",
  "☮": "sparkles",
  "ℹ️": "info",
  "ℹ": "info",
  "🟢": "check",
  "🔁": "repeat",
  "🔄": "refresh-cw",
  "🔀": "shuffle",
  "🔇": "smartphone",
  "🔌": "plug",
  "🔢": "hash",
  "🔤": "type",
  "🔍": "search",
  "🔗": "link",
  "🔙": "arrow-right",
  "🔖": "bookmark",

  // Nature / decorations / weather
  "🌀": "wind",
  "🌍": "globe",
  "🌉": "landmark",
  "🌴": "trees",
  "🌬️": "wind",
  "🌬": "wind",
  "🌡️": "thermometer",
  "🌡": "thermometer",
  "🌆": "moon",
  "🎍": "trees", // kadomatsu
  "🎄": "trees",
  "🎌": "sparkles", // crossed flags

  // Entertainment / culture
  "🎮": "sparkles",
  "🎰": "sparkles",
  "🎢": "sparkles",
  "🎬": "sparkles",
  "🎭": "sparkles",
  "🎤": "mic",
  "🎵": "music",
  "🎶": "music",
  "🕹️": "sparkles",
  "🕹": "sparkles",
  "⚾": "sparkles",
  "🎓": "graduation-cap",
  "🎟️": "ticket",
  "🎟": "ticket",

  // Animals
  "🐱": "cat",
  "🐕": "dog",
  "🐄": "tractor",
  "🦑": "fish",

  // Final coverage pass (2026-04-28)
  "👘": "shirt", // kimono
  "👕": "shirt", // t-shirt
  "📶": "wifi", // signal bars
  "🧸": "gift", // teddy bear
  "🧭": "map", // compass
  "🗣️": "users", // speaking head
  "🗣": "users",
  "🛒": "shopping-cart",
  "🎒": "backpack",
  "🗿": "landmark", // moai
  "🏙️": "building", // cityscape
  "🏙": "building",

  // Material Icons strings (legacy data leaks from Sanity Studio)
  photo_camera: "camera",
  camera_off: "camera",
};

type DataIconProps = {
  /** kebab-case icon name from `DATA_ICON_MAP`, OR a raw emoji string covered by `EMOJI_TO_ICON_NAME`. Unknown values render `Sparkles`. */
  name: string;
  /** Tailwind classes (size + colour). Defaults to `h-4 w-4`. */
  className?: string;
  /** Defaults to true. Set to false if the icon is the only label. */
  "aria-hidden"?: boolean;
};

/**
 * Render a Lucide icon by name. Resolves raw emoji strings via
 * `EMOJI_TO_ICON_NAME` first (backwards compat), then looks up
 * `DATA_ICON_MAP`. Falls back to `Sparkles` if neither matches.
 */
export function DataIcon({
  name,
  className = "h-4 w-4",
  "aria-hidden": ariaHidden = true,
}: DataIconProps) {
  const resolvedName = EMOJI_TO_ICON_NAME[name] ?? name;
  const Icon = DATA_ICON_MAP[resolvedName] ?? Sparkles;
  return <Icon aria-hidden={ariaHidden} className={className} />;
}
