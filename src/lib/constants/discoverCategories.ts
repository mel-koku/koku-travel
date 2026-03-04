export const CATEGORY_CHIPS = [
  { id: "", label: "All" },
  { id: "restaurant", label: "Food" },
  { id: "culture", label: "Culture" },
  { id: "nature", label: "Nature" },
  { id: "bar", label: "Nightlife" },
  { id: "shopping", label: "Shopping" },
] as const;

export type DiscoverCategoryId = (typeof CATEGORY_CHIPS)[number]["id"];
