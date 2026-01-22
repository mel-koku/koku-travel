/**
 * Filter option with value, label, and count
 */
export type FilterOption = {
  value: string;
  label: string;
  count: number;
};

/**
 * Tag option with additional metadata for partial loading state
 */
export type TagOption = {
  value: string;
  label: string;
  count: number;
  /**
   * Indicates if this tag count is based on partial data (still loading more locations)
   */
  isPartial?: boolean;
};

/**
 * Pre-computed filter metadata from server
 */
export type FilterMetadata = {
  cities: FilterOption[];
  categories: FilterOption[];
  regions: FilterOption[];
};
