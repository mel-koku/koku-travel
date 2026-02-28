/**
 * Types for the Itinerary Guide feature.
 * Guide segments provide narrative context between activities —
 * day intros, transitions, cultural moments, and summaries.
 */

export type GuideContentType =
  | "trip_overview"
  | "day_intro"
  | "activity_context"
  | "cultural_moment"
  | "practical_tip"
  | "day_summary"
  | "neighborhood_narrative"
  | "neighborhood_walk";

export type GuideSegment = {
  id: string;
  type: GuideContentType;
  content: string;
  icon?: string;
  dayId?: string;
  /** null or undefined = before first activity */
  afterActivityId?: string | null;
  /** When set, this segment renders before the referenced activity (prep content). */
  beforeActivityId?: string;
  templateId?: string;
};

export type DayGuide = {
  dayId: string;
  intro?: GuideSegment;
  segments: GuideSegment[];
  summary?: GuideSegment;
};

export type TripGuide = {
  overview?: GuideSegment;
  days: DayGuide[];
};

/**
 * Resolved category info from activity tags.
 */
export type ResolvedCategory = {
  sub: string;
  parent: string;
};

/**
 * Template types for each guide data file.
 */
export type DayIntroTemplate = {
  id: string;
  key: string; // "city:category:season:position" e.g. "kyoto:shrine:spring:first"
  content: string;
  icon?: string;
};

export type TransitionTemplate = {
  id: string;
  key: string; // "fromParent:toParent:city" e.g. "culture:food:kyoto"
  content: string;
};

export type CulturalMomentTemplate = {
  id: string;
  key: string; // "subCategory:city" e.g. "shrine:kyoto"
  content: string;
  icon?: string;
};

export type PracticalTipTemplate = {
  id: string;
  key: string; // "topic" e.g. "ic-card"
  content: string;
  icon?: string;
};

export type DaySummaryTemplate = {
  id: string;
  key: string; // "city:vibe" e.g. "kyoto:cultural"
  content: string;
  icon?: string;
};

export type TripOverviewTemplate = {
  id: string;
  key: string; // "city1+city2:season" e.g. "kyoto+osaka:spring"
  content: string;
  icon?: string;
};

export type NeighborhoodNarrativeTemplate = {
  id: string;
  key: string; // "city:neighborhood" e.g. "kyoto:higashiyama" or "any:any"
  content: string;
  icon?: string;
};
