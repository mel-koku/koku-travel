/**
 * Types for the Before You Land cultural briefing system.
 *
 * Five philosophical pillars (Wa, Meiwaku, Kegare, Omotenashi, Ma) explain
 * Japanese social customs. Pillar content is authored in Sanity CMS.
 * A deterministic assembler selects and orders behaviors per trip.
 */

/** Severity of a cultural behavior */
export type BehaviorSeverity = "critical" | "important" | "nice_to_know";

/** A specific behavioral guideline within a pillar */
export type PillarBehavior = {
  situation: string;
  action: string;
  why: string;
  categories: string[];
  severity: BehaviorSeverity;
};

/** Raw pillar document shape from Sanity CMS */
export type CulturalPillar = {
  name: string;
  japanese: string;
  slug: string;
  pronunciation: string;
  tagline: string;
  concept: string;
  inPractice: string;
  forTravelers: string;
  briefIntro: string;
  icon: string;
  sortOrder: number;
  behaviors: PillarBehavior[];
};

/** Assembled pillar with behaviors filtered for a specific trip */
export type AssembledPillar = Omit<CulturalPillar, "sortOrder">;

/** Complete cultural briefing stored on a trip */
export type CulturalBriefing = {
  intro: string;
  pillars: AssembledPillar[];
};
