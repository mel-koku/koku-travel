import type { Guide } from "./guide";
import type { Itinerary } from "./itinerary";

export type ExpertProfile = {
  /**
   * Unique identifier for the expert (e.g., slugified name)
   */
  id: string;
  /**
   * Full name of the expert
   */
  name: string;
  /**
   * Bio/description of the expert
   */
  bio: string;
  /**
   * Areas of expertise
   */
  expertise: string[];
  /**
   * Languages spoken
   */
  languages: string[];
  /**
   * Avatar image URL
   */
  avatar?: string;
  /**
   * Cover image URL for profile header
   */
  coverImage?: string;
  /**
   * Location/city where they primarily operate
   */
  location?: string;
  /**
   * Years of experience
   */
  yearsExperience?: number;
  /**
   * All guides created by this expert
   */
  guides: Guide[];
  /**
   * All itineraries/tours created by this expert
   */
  itineraries: Array<{
    id: string;
    title: string;
    description: string;
    duration: string; // e.g., "3 days", "Full day"
    itinerary: Itinerary;
    image?: string;
  }>;
};

