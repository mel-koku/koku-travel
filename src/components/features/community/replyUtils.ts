export type ReplyVersion = { body: string; editedAt: string };
export type Reply = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  editedAt?: string;
  history?: ReplyVersion[];
};

const GRACE_MS = 5 * 60 * 1000; // 5 minutes

const replyKey = (id: string) => `koku_community_replies_v1_${id}`;

type StoredReply = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  editedAt?: string;
  history?: ReplyVersion[];
};

function isStoredReply(value: unknown): value is StoredReply {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.author === "string" &&
    typeof record.body === "string" &&
    typeof record.createdAt === "string"
  );
}

function isStoredReplyList(value: unknown): value is StoredReply[] {
  return Array.isArray(value) && value.every((item) => isStoredReply(item));
}

function isReplyVersionList(value: unknown): ReplyVersion[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is ReplyVersion => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    const record = entry as Record<string, unknown>;
    return typeof record.body === "string" && typeof record.editedAt === "string";
  });
}

export function loadReplies(id: string): Reply[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(replyKey(id));
    const parsed = raw ? JSON.parse(raw) : [];
    if (!isStoredReplyList(parsed)) {
      return [];
    }
    return parsed.map((entry) => ({
      id: entry.id,
      author: entry.author,
      body: entry.body,
      createdAt: entry.createdAt,
      editedAt: typeof entry.editedAt === "string" ? entry.editedAt : undefined,
      history: isReplyVersionList(entry.history),
    }));
  }catch {
    return [];
  }
}

export function saveReplies(id: string, list: Reply[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(replyKey(id), JSON.stringify(list));
  // notify /community cards to update
  window.dispatchEvent(new StorageEvent("storage", { key: replyKey(id) }));
}

export function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "r_" + Math.random().toString(36).slice(2, 10);
}

export function canEditDelete(r: Reply, currentName: string) {
  if (!currentName) return false;
  if (r.author.trim() !== currentName.trim()) return false;
  const age = Date.now() - new Date(r.createdAt).getTime();
  return age <= GRACE_MS;
}

export function remainingMs(r: Reply) {
  const used = Date.now() - new Date(r.createdAt).getTime();
  const remain = GRACE_MS - used;
  return Math.max(0, remain);
}

export function fmtRemain(ms: number) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return m > 0 ? `${m}m ${rs}s` : `${rs}s`;
}

