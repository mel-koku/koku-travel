import { describe, it, expect, beforeEach } from "vitest";
import { LRUCache } from "@/lib/utils/lruCache";

describe("LRUCache", () => {
  let cache: LRUCache<string, number>;

  beforeEach(() => {
    cache = new LRUCache<string, number>({ maxSize: 3 });
  });

  describe("basic operations", () => {
    it("should store and retrieve values", () => {
      cache.set("key1", 1);
      cache.set("key2", 2);

      expect(cache.get("key1")).toBe(1);
      expect(cache.get("key2")).toBe(2);
    });

    it("should return undefined for non-existent keys", () => {
      expect(cache.get("nonexistent")).toBeUndefined();
    });

    it("should check if key exists", () => {
      cache.set("key1", 1);
      expect(cache.has("key1")).toBe(true);
      expect(cache.has("key2")).toBe(false);
    });

    it("should delete entries", () => {
      cache.set("key1", 1);
      expect(cache.delete("key1")).toBe(true);
      expect(cache.get("key1")).toBeUndefined();
      expect(cache.delete("nonexistent")).toBe(false);
    });

    it("should clear all entries", () => {
      cache.set("key1", 1);
      cache.set("key2", 2);
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get("key1")).toBeUndefined();
    });

    it("should track size correctly", () => {
      expect(cache.size).toBe(0);
      cache.set("key1", 1);
      expect(cache.size).toBe(1);
      cache.set("key2", 2);
      expect(cache.size).toBe(2);
      cache.delete("key1");
      expect(cache.size).toBe(1);
    });
  });

  describe("LRU eviction", () => {
    it("should evict least recently used entry when cache is full", () => {
      cache.set("key1", 1);
      cache.set("key2", 2);
      cache.set("key3", 3);
      // Cache is now full (size 3)

      // Add another entry - should evict key1 (least recently used)
      cache.set("key4", 4);

      expect(cache.get("key1")).toBeUndefined(); // Evicted
      expect(cache.get("key2")).toBe(2);
      expect(cache.get("key3")).toBe(3);
      expect(cache.get("key4")).toBe(4);
      expect(cache.size).toBe(3);
    });

    it("should update access order on get", () => {
      cache.set("key1", 1);
      cache.set("key2", 2);
      cache.set("key3", 3);

      // Access key1 to make it most recently used
      cache.get("key1");

      // Add key4 - should evict key2 (least recently used), not key1
      cache.set("key4", 4);

      expect(cache.get("key1")).toBe(1); // Still present
      expect(cache.get("key2")).toBeUndefined(); // Evicted
      expect(cache.get("key3")).toBe(3);
      expect(cache.get("key4")).toBe(4);
    });

    it("should update access order on set of existing key", () => {
      cache.set("key1", 1);
      cache.set("key2", 2);
      cache.set("key3", 3);

      // Update key1 to make it most recently used
      cache.set("key1", 10);

      // Add key4 - should evict key2 (least recently used), not key1
      cache.set("key4", 4);

      expect(cache.get("key1")).toBe(10); // Updated and still present
      expect(cache.get("key2")).toBeUndefined(); // Evicted
      expect(cache.get("key3")).toBe(3);
      expect(cache.get("key4")).toBe(4);
    });

    it("should evict multiple entries when adding many at once", () => {
      cache.set("key1", 1);
      cache.set("key2", 2);
      cache.set("key3", 3);

      // Add 5 more entries - should evict key1, key2, key3
      cache.set("key4", 4);
      cache.set("key5", 5);
      cache.set("key6", 6);

      expect(cache.get("key1")).toBeUndefined();
      expect(cache.get("key2")).toBeUndefined();
      expect(cache.get("key3")).toBeUndefined();
      expect(cache.get("key4")).toBe(4);
      expect(cache.get("key5")).toBe(5);
      expect(cache.get("key6")).toBe(6);
      expect(cache.size).toBe(3);
    });
  });

  describe("onEvict callback", () => {
    it("should call onEvict when entry is evicted", () => {
      const evictedKeys: string[] = [];
      const evictedValues: number[] = [];

      const cacheWithCallback = new LRUCache<string, number>({
        maxSize: 2,
        onEvict: (key, value) => {
          evictedKeys.push(key);
          evictedValues.push(value);
        },
      });

      cacheWithCallback.set("key1", 1);
      cacheWithCallback.set("key2", 2);
      cacheWithCallback.set("key3", 3); // Should evict key1

      expect(evictedKeys).toEqual(["key1"]);
      expect(evictedValues).toEqual([1]);
    });

    it("should call onEvict for each evicted entry", () => {
      const evictedKeys: string[] = [];

      const cacheWithCallback = new LRUCache<string, number>({
        maxSize: 2,
        onEvict: (key) => {
          evictedKeys.push(key);
        },
      });

      cacheWithCallback.set("key1", 1);
      cacheWithCallback.set("key2", 2);
      cacheWithCallback.set("key3", 3); // Evicts key1
      cacheWithCallback.set("key4", 4); // Evicts key2

      expect(evictedKeys).toEqual(["key1", "key2"]);
    });
  });

  describe("iteration methods", () => {
    beforeEach(() => {
      cache.set("key1", 1);
      cache.set("key2", 2);
      cache.set("key3", 3);
    });

    it("should return keys in order from least to most recently used", () => {
      // Access key1 to make it most recently used
      cache.get("key1");

      const keys = cache.keys();
      expect(keys).toEqual(["key2", "key3", "key1"]);
    });

    it("should return values in order from least to most recently used", () => {
      cache.get("key1");

      const values = cache.values();
      expect(values).toEqual([2, 3, 1]);
    });

    it("should return entries in order from least to most recently used", () => {
      cache.get("key1");

      const entries = cache.entries();
      expect(entries).toEqual([
        ["key2", 2],
        ["key3", 3],
        ["key1", 1],
      ]);
    });

    it("should iterate with forEach", () => {
      const keys: string[] = [];
      const values: number[] = [];

      cache.forEach((value, key) => {
        keys.push(key);
        values.push(value);
      });

      expect(keys).toEqual(["key1", "key2", "key3"]);
      expect(values).toEqual([1, 2, 3]);
    });
  });

  describe("edge cases", () => {
    it("should throw error if maxSize is 0", () => {
      expect(() => {
        new LRUCache<string, number>({ maxSize: 0 });
      }).toThrow("LRU Cache maxSize must be greater than 0");
    });

    it("should throw error if maxSize is negative", () => {
      expect(() => {
        new LRUCache<string, number>({ maxSize: -1 });
      }).toThrow("LRU Cache maxSize must be greater than 0");
    });

    it("should handle maxSize of 1", () => {
      const smallCache = new LRUCache<string, number>({ maxSize: 1 });
      smallCache.set("key1", 1);
      smallCache.set("key2", 2);

      expect(smallCache.get("key1")).toBeUndefined();
      expect(smallCache.get("key2")).toBe(2);
      expect(smallCache.size).toBe(1);
    });
  });
});

