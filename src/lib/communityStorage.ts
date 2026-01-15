import { getLocal, setLocal } from "./storageHelpers";

const KEY = "koku_community_topics_v1";

type TopicWithId = { id: string };

function isTopicArray(value: unknown): value is TopicWithId[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        "id" in item &&
        typeof (item as { id: unknown }).id === "string",
    )
  );
}

/**
 * Loads community topics from localStorage, merging with seed data.
 * Uses unified storage helper for consistency.
 */
export function loadTopics<T extends TopicWithId>(seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  
  const stored = getLocal<T[]>(KEY);
  if (!stored) {
    setLocal(KEY, seed);
    return seed;
  }
  
  if (!isTopicArray(stored)) {
    setLocal(KEY, seed);
    return seed;
  }
  
  const existingIds = new Set(stored.map((topic) => topic.id));
  const merged = [
    ...stored,
    ...seed.filter((topic) => !existingIds.has(topic.id)),
  ] as T[];
  setLocal(KEY, merged);
  return merged;
}

/**
 * Saves community topics to localStorage.
 * Uses unified storage helper for consistency.
 */
export function saveTopics<T extends TopicWithId>(list: T[]): void {
  setLocal(KEY, list);
}

export function addTopic<T extends TopicWithId>(list: T[], topic: T): T[] {
  const next = [topic, ...list];
  saveTopics(next);
  return next;
}

export function genId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "t_" + Math.random().toString(36).slice(2, 10);
}

