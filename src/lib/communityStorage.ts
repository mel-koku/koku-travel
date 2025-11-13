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

export function loadTopics<T extends TopicWithId>(seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw);
    if (!isTopicArray(parsed)) {
      localStorage.setItem(KEY, JSON.stringify(seed));
      return seed;
    }
    const existingIds = new Set(parsed.map((topic) => topic.id));
    const merged = [
      ...parsed,
      ...seed.filter((topic) => !existingIds.has(topic.id)),
    ] as T[];
    localStorage.setItem(KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return seed;
  }
}

export function saveTopics<T extends TopicWithId>(list: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
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

