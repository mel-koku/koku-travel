/**
 * LRU (Least Recently Used) Cache implementation
 * Evicts least recently used entries when the cache reaches its size limit
 */

export interface LRUCacheOptions<K, V> {
  /**
   * Maximum number of entries in the cache
   */
  maxSize: number;
  /**
   * Optional function to call when an entry is evicted
   */
  onEvict?: (key: K, value: V) => void;
}

/**
 * LRU Cache implementation using a Map with access-order tracking
 * 
 * @template K - Key type
 * @template V - Value type
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;
  private onEvict?: (key: K, value: V) => void;

  constructor(options: LRUCacheOptions<K, V>) {
    if (options.maxSize <= 0) {
      throw new Error("LRU Cache maxSize must be greater than 0");
    }
    this.maxSize = options.maxSize;
    this.onEvict = options.onEvict;
    this.cache = new Map();
  }

  /**
   * Get a value from the cache
   * Moves the entry to the end (most recently used)
   * 
   * @param key - Cache key
   * @returns The cached value, or undefined if not found
   */
  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  /**
   * Set a value in the cache
   * If the cache is full, evicts the least recently used entry
   * 
   * @param key - Cache key
   * @param value - Value to cache
   */
  set(key: K, value: V): void {
    // If key already exists, remove it first to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Cache is full, evict least recently used (first entry)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        const evictedValue = this.cache.get(firstKey);
        this.cache.delete(firstKey);
        if (evictedValue !== undefined && this.onEvict) {
          this.onEvict(firstKey, evictedValue);
        }
      }
    }
    
    // Add new entry at the end (most recently used)
    this.cache.set(key, value);
  }

  /**
   * Check if a key exists in the cache
   * Does not update access order
   * 
   * @param key - Cache key
   * @returns True if key exists, false otherwise
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete a value from the cache
   * 
   * @param key - Cache key
   * @returns True if key was deleted, false if it didn't exist
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current number of entries in the cache
   * 
   * @returns Number of entries
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys in the cache (in order from least to most recently used)
   * 
   * @returns Array of keys
   */
  keys(): K[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get all values in the cache (in order from least to most recently used)
   * 
   * @returns Array of values
   */
  values(): V[] {
    return Array.from(this.cache.values());
  }

  /**
   * Get all entries in the cache (in order from least to most recently used)
   * 
   * @returns Array of [key, value] pairs
   */
  entries(): Array<[K, V]> {
    return Array.from(this.cache.entries());
  }

  /**
   * Iterate over all entries in the cache
   * 
   * @param callback - Function to call for each entry
   */
  forEach(callback: (value: V, key: K, cache: LRUCache<K, V>) => void): void {
    this.cache.forEach((value, key) => {
      callback(value, key, this);
    });
  }
}

