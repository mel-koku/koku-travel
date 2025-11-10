"use client";

import { useEffect, useMemo, useState } from "react";

import type { CommunityTopic } from "@/data/mockCommunity";

import { loadTopics } from "@/lib/communityStorage";

import Link from "next/link";

import Avatar from "@/components/ui/Avatar";

import { timeAgo } from "@/lib/time";


const NAME_KEY = "koku_community_current_name";
const GRACE_MS = 5 * 60 * 1000; // 5 minutes


type ReplyVersion = { body: string; editedAt: string };
export type Reply = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  editedAt?: string;
  history?: ReplyVersion[];
};


const replyKey = (id: string) => `koku_community_replies_v1_${id}`;


function loadReplies(id: string): Reply[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(replyKey(id));
    const list: any[] = raw ? JSON.parse(raw) : [];
    return list.map((r) => ({
      id: r.id,
      author: r.author,
      body: r.body,
      createdAt: r.createdAt,
      editedAt: r.editedAt,
      history: Array.isArray(r.history) ? r.history : [],
    }));
  } catch {
    return [];
  }
}
function saveReplies(id: string, list: Reply[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(replyKey(id), JSON.stringify(list));
  // notify /community cards to update
  window.dispatchEvent(new StorageEvent("storage", { key: replyKey(id) }));
}
function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "r_" + Math.random().toString(36).slice(2, 10);
}
function canEditDelete(r: Reply, currentName: string) {
  if (!currentName) return false;
  if (r.author.trim() !== currentName.trim()) return false;
  const age = Date.now() - new Date(r.createdAt).getTime();
  return age <= GRACE_MS;
}
function remainingMs(r: Reply) {
  const used = Date.now() - new Date(r.createdAt).getTime();
  const remain = GRACE_MS - used;
  return Math.max(0, remain);
}
function fmtRemain(ms: number) {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return m > 0 ? `${m}m ${rs}s` : `${rs}s`;
}


export default function TopicDetailClient({
  id,
  seed,
}: {
  id: string;
  seed: CommunityTopic[];
}) {
  const [topics, setTopics] = useState<CommunityTopic[]>(seed);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [author, setAuthor] = useState("Guest"); // current poster name (also used for auth)
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  // edit UI state
  const [editing, setEditing] = useState<Reply | null>(null);
  const [editBody, setEditBody] = useState("");
  const [showHistory, setShowHistory] = useState<Reply | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [, setTick] = useState(0); // to refresh remaining time

  // load topics and replies
  useEffect(() => {
    setTopics(loadTopics(seed));
  }, [seed]);
  useEffect(() => {
    setReplies(loadReplies(id));
  }, [id]);

  // persist current name for author-only checks
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem(NAME_KEY);
    if (saved) setAuthor(saved);
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(NAME_KEY, author);
  }, [author]);

  // update countdown every second
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const topic = useMemo(() => topics.find((t) => t.id === id), [topics, id]);

  if (!topic) {
    return (
      <section className="max-w-3xl mx-auto px-6 md:px-0 pt-20">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-md p-6">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Topic not found</h1>
          <p className="text-sm text-gray-600">This discussion might have been removed or the link is incorrect.</p>
          <div className="mt-4">
            <Link href="/community" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
              ← Back to Community
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // create reply
  const handlePostReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (author.trim().length < 2) return setError("Name must be at least 2 characters.");
    if (body.trim().length < 5) return setError("Reply must be at least 5 characters.");
    const reply: Reply = {
      id: newId(),
      author: author.trim(),
      body: body.trim(),
      createdAt: new Date().toISOString(),
      history: [],
    };
    const next = [reply, ...replies];
    setReplies(next);
    saveReplies(id, next);
    setBody("");
    setError(null);
  };

  // edit reply (author-only + grace window)
  const beginEdit = (r: Reply) => {
    if (!canEditDelete(r, author)) {
      alert("You can only edit your own reply within 5 minutes of posting.");
      setMenuOpenFor(null);
      return;
    }
    setEditing(r);
    setEditBody(r.body);
    setMenuOpenFor(null);
  };
  const confirmEdit = () => {
    if (!editing) return;
    if (!canEditDelete(editing, author)) {
      setEditing(null);
      return alert("Edit window has expired.");
    }
    const newText = editBody.trim();
    if (newText.length < 5) return setError("Edited reply must be at least 5 characters.");
    setError(null);

    const now = new Date().toISOString();
    const next = replies.map((r) => {
      if (r.id !== editing.id) return r;
      const history = r.history && r.history.length
        ? [...r.history, { body: r.body, editedAt: now }]
        : [{ body: r.body, editedAt: now }];
      return { ...r, body: newText, editedAt: now, history };
    });
    setReplies(next);
    saveReplies(id, next);
    setEditing(null);
    setEditBody("");
  };

  // delete reply (author-only + grace window)
  const deleteReply = (rid: string) => {
    const r = replies.find((x) => x.id === rid);
    if (!r) return;
    if (!canEditDelete(r, author)) {
      setMenuOpenFor(null);
      return alert("You can only delete your own reply within 5 minutes of posting.");
    }
    if (!confirm("Delete this reply? This cannot be undone.")) return;
    const next = replies.filter((x) => x.id !== rid);
    setReplies(next);
    saveReplies(id, next);
    setMenuOpenFor(null);
  };

  return (
    <>
      {/* Header capsule */}
      <section className="max-w-screen-xl mx-auto px-8 pt-6">
        <div className="w-full max-w-4xl bg-white rounded-2xl border border-gray-200 shadow-md px-8 py-5 mx-auto">
          <p className="text-xs font-semibold text-indigo-600 tracking-wide uppercase">{topic.category}</p>
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mt-1">{topic.title}</h1>
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-3">
            <span className="inline-flex items-center gap-2">
              <Avatar name={topic.author} />
              <span className="text-gray-700">{topic.author}</span>
            </span>
            <span>•</span>
            <time dateTime={topic.createdAt} title={new Date(topic.createdAt).toLocaleString()}>
              {timeAgo(topic.createdAt)}
            </time>
            <span>•</span>
            <span>{replies.length} {replies.length === 1 ? "reply" : "replies"}</span>
          </div>
        </div>
      </section>

      {/* Body */}
      <article className="max-w-3xl mx-auto px-6 md:px-0 mt-8 text-gray-800 leading-relaxed">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-md p-6">
          <p className="whitespace-pre-wrap">{topic.body}</p>
        </div>
      </article>

      {/* Reply form */}
      <section className="max-w-3xl mx-auto px-6 md:px-0 mt-8">
        <form onSubmit={handlePostReply} className="rounded-2xl border border-gray-200 bg-white shadow-md p-6 space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Post a reply</h2>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <label className="text-sm text-gray-700 block">
            Name
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="mt-1 w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Your name"
            />
          </label>

          <label className="text-sm text-gray-700 block">
            Message
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Share tips, feedback, or resources…"
            />
          </label>

          <p className="text-xs text-gray-500">
            You can edit or delete your reply for 5 minutes after posting (matched to your Name).
          </p>

          <div className="flex items-center justify-end gap-3 pt-1">
            <Link href="/community" className="text-sm text-gray-600 hover:text-gray-800">Cancel</Link>
            <button
              type="submit"
              className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Reply
            </button>
          </div>
        </form>
      </section>

      {/* Replies list */}
      <section className="max-w-3xl mx-auto px-6 md:px-0 mt-6">
        {replies.length === 0 ? (
          <p className="text-center text-gray-500">No replies yet.</p>
        ) : (
          <ul className="space-y-3">
            {replies.map((r) => {
              const mine = r.author.trim() === author.trim();
              const remain = remainingMs(r);
              const allowed = canEditDelete(r, author);

              return (
                <li key={r.id} className="relative rounded-2xl border border-gray-200 bg-white shadow-md p-5">
                  {/* Meta */}
                  <div className="text-xs text-gray-500 mb-2 flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      <Avatar name={r.author} />
                      <span className="font-medium text-gray-700">{r.author}</span>
                      <span>•</span>
                      <time dateTime={r.createdAt} title={new Date(r.createdAt).toLocaleString()}>
                        {timeAgo(r.editedAt ?? r.createdAt)}
                      </time>
                      {r.editedAt && <span className="italic text-gray-400">(edited)</span>}
                      {mine && remain > 0 && (
                        <span className="ml-2 text-[11px] text-indigo-600 bg-indigo-50 rounded px-1.5 py-0.5">
                          {fmtRemain(remain)} left to edit/delete
                        </span>
                      )}
                    </span>

                    {/* Reply actions menu */}
                    <div className="relative">
                      <button
                        className="h-8 w-8 rounded-full hover:bg-gray-100 text-gray-600"
                        onClick={() => setMenuOpenFor(menuOpenFor === r.id ? null : r.id)}
                        aria-label="Reply actions"
                      >
                        ⋯
                      </button>
                      {menuOpenFor === r.id && (
                        <div className="absolute right-0 mt-2 w-40 rounded-lg border border-gray-200 bg-white shadow-lg text-sm z-10">
                          <button
                            className={`block w-full text-left px-3 py-2 hover:bg-gray-50 ${!allowed ? "opacity-50 cursor-not-allowed" : ""}`}
                            onClick={() => (allowed ? beginEdit(r) : null)}
                          >
                            Edit
                          </button>
                          <button
                            className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                            onClick={() => setShowHistory(r)}
                          >
                            View history
                          </button>
                          <button
                            className={`block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 ${!allowed ? "opacity-50 cursor-not-allowed" : ""}`}
                            onClick={() => (allowed ? deleteReply(r.id) : null)}
                          >
                            Delete
                          </button>
                          {!allowed && (
                            <div className="px-3 py-2 text-[11px] text-gray-500 border-t">
                              Only the author can edit/delete within 5 minutes.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <p className="whitespace-pre-wrap text-gray-800 text-sm">{r.body}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Back link */}
      <div className="max-w-3xl mx-auto mt-10 px-6 md:px-0">
        <Link href="/community" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
          ← Back to Community
        </Link>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative z-10 w-full max-w-xl rounded-2xl border border-gray-200 bg-white shadow-xl">
            <div className="p-6 space-y-4">
              <header className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Edit reply</h3>
                <button className="text-gray-500 hover:text-gray-700" onClick={() => setEditing(null)} aria-label="Close">✕</button>
              </header>
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={6}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Edits are visible to everyone (full history kept).</span>
                {editing && (
                  <span>{fmtRemain(remainingMs(editing))} left</span>
                )}
              </div>
              <div className="flex items-center justify-end gap-3">
                <button className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setEditing(null)}>
                  Cancel
                </button>
                <button className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700" onClick={confirmEdit}>
                  Save changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowHistory(null)} />
          <div className="relative z-10 w-full max-w-xl rounded-2xl border border-gray-200 bg-white shadow-xl">
            <div className="p-6 space-y-4">
              <header className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Edit history</h3>
                <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowHistory(null)} aria-label="Close">✕</button>
              </header>

              <ul className="space-y-3 text-sm text-gray-800 max-h-[60vh] overflow-auto">
                <li className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="text-xs text-gray-500 mb-1">
                    Original • <time dateTime={showHistory.createdAt}>{new Date(showHistory.createdAt).toLocaleString()}</time>
                  </div>
                  <pre className="whitespace-pre-wrap">
                    {(showHistory.history && showHistory.history.length)
                      ? showHistory.history[0]?.body
                      : showHistory.body}
                  </pre>
                </li>

                {showHistory.history && showHistory.history.length > 0 && showHistory.history.map((v, idx) => (
                  <li key={idx} className="rounded-lg border border-gray-200 p-3">
                    <div className="text-xs text-gray-500 mb-1">
                      Edited • <time dateTime={v.editedAt}>{new Date(v.editedAt).toLocaleString()}</time>
                    </div>
                    <pre className="whitespace-pre-wrap">{v.body}</pre>
                  </li>
                ))}

                {showHistory.editedAt && (
                  <li className="rounded-lg border border-gray-200 p-3">
                    <div className="text-xs text-gray-500 mb-1">
                      Current (last edited) • <time dateTime={showHistory.editedAt}>{new Date(showHistory.editedAt).toLocaleString()}</time>
                    </div>
                    <pre className="whitespace-pre-wrap">{showHistory.body}</pre>
                  </li>
                )}
              </ul>

              <div className="flex items-center justify-end">
                <button className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700" onClick={() => setShowHistory(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

