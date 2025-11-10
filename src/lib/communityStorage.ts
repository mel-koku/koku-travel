const KEY = "koku_community_topics_v1";

export function loadTopics(seed: any[]) {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      localStorage.setItem(KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw);
    // merge new seeds if any
    const existingIds = new Set(parsed.map((t: any) => t.id));
    const merged = [...parsed, ...seed.filter((t) => !existingIds.has(t.id))];
    localStorage.setItem(KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return seed;
  }
}

export function saveTopics(list: any[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function addTopic(list: any[], topic: any) {
  const next = [topic, ...list];
  saveTopics(next);
  return next;
}

export function genId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "t_" + Math.random().toString(36).slice(2, 10);
}

