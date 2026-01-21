"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { CommunityTopic } from "@/data/mocks/mockCommunity";
import { loadTopics } from "@/lib/communityStorage";
import {
  type Reply,
  loadReplies,
  saveReplies,
  newId,
  canEditDelete,
} from "./replyUtils";
import { TopicHeader } from "./TopicHeader";
import { ReplyForm } from "./ReplyForm";
import { ReplyList } from "./ReplyList";

const EditReplyModal = dynamic(
  () => import("./EditReplyModal").then((m) => ({ default: m.EditReplyModal })),
  { ssr: false }
);

const HistoryModal = dynamic(
  () => import("./HistoryModal").then((m) => ({ default: m.HistoryModal })),
  { ssr: false }
);

const NAME_KEY = "koku_community_current_name";


export default function TopicDetailClient({
  id,
  seed,
}: {
  id: string;
  seed: CommunityTopic[];
}) {
  const [topics, setTopics] = useState<CommunityTopic[]>(seed);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [author, setAuthor] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "Guest";
    }
    const saved = localStorage.getItem(NAME_KEY);
    return saved ?? "Guest";
  }); // current poster name (also used for auth)
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
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) {
        setTopics(loadTopics(seed));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [seed]);
  useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) {
        setReplies(loadReplies(id));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // persist current name for author-only checks
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
      <TopicHeader topic={topic} replyCount={replies.length} />

      {/* Body */}
      <article className="max-w-3xl mx-auto px-6 md:px-0 mt-8 text-gray-800 leading-relaxed">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-md p-6">
          <p className="whitespace-pre-wrap">{topic.body}</p>
        </div>
      </article>

      <ReplyForm
        author={author}
        body={body}
        error={error}
        onAuthorChange={setAuthor}
        onBodyChange={setBody}
        onSubmit={handlePostReply}
      />

      {/* Replies list */}
      <section className="max-w-3xl mx-auto px-6 md:px-0 mt-6">
        <ReplyList
          replies={replies}
          currentAuthor={author}
          menuOpenFor={menuOpenFor}
          onMenuToggle={(replyId) =>
            setMenuOpenFor(menuOpenFor === replyId ? null : replyId)
          }
          onEdit={beginEdit}
          onDelete={deleteReply}
          onShowHistory={setShowHistory}
        />
      </section>

      {/* Back link */}
      <div className="max-w-3xl mx-auto mt-10 px-6 md:px-0">
        <Link
          href="/community"
          className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
        >
          ← Back to Community
        </Link>
      </div>

      <EditReplyModal
        editing={editing}
        editBody={editBody}
        onEditBodyChange={setEditBody}
        onClose={() => setEditing(null)}
        onConfirm={confirmEdit}
      />

      <HistoryModal reply={showHistory} onClose={() => setShowHistory(null)} />
    </>
  );
}

