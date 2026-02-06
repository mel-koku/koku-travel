// Trip Builder - 4-step flow with live preview

export { TripBuilderV2 } from "./TripBuilderV2";
export type { TripBuilderV2Props } from "./TripBuilderV2";

// Intro step
export { IntroStep } from "./IntroStep";

// Step 1 components
export { PlanStep } from "./PlanStep";
export { EssentialsForm } from "./EssentialsForm";
export { EntryPointSelector } from "./EntryPointSelector";
export type { EntryPointSelectorProps } from "./EntryPointSelector";
export { BudgetInput } from "./BudgetInput";
export type { BudgetInputProps, BudgetMode, BudgetValue } from "./BudgetInput";
export { InterestChips } from "./InterestChips";
export { CityList } from "./CityList";

// Step 2 components
export { ReviewStep } from "./ReviewStep";
export { SelectionReview } from "./SelectionReview";
export { PreferenceCards } from "./PreferenceCards";
export { SavedLocationsPreview } from "./SavedLocationsPreview";
export type { SavedLocationsPreviewProps } from "./SavedLocationsPreview";

// Preview components
export { LivePreview } from "./LivePreview";
export { ItineraryPreview } from "./ItineraryPreview";
export { TripMap } from "./TripMap";

// Mobile components
export { MobileBottomSheet, PreviewToggleButton } from "./MobileBottomSheet";
