export type Guide = {
  /**
   * Canonical slug for the guide. Also used as the bookmark identifier.
   */
  id: string;
  slug: string;
  /**
   * Human-friendly name of the guide author.
   */
  name: string;
  /**
   * Headline shown on cards and hero sections.
   */
  title: string;
  category: string;
  /**
   * Full list of guide categories used for filtering and related content.
   */
  categories: string[];
  /**
   * Primary location/city for this guide (e.g., "tokyo", "kyoto").
   */
  location: string;
  summary: string;
  image: string;
  languages: string[];
  featured: boolean;
  experience?: string;
  lastUpdated: string | null;
};


