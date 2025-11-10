"use client";

import { useEffect, useRef, useState } from "react";

import { genId } from "@/lib/communityStorage";
import type { CommunityTopic } from "@/data/mockCommunity";

const CATEGORIES: CommunityTopic["category"][] = [
  "Travel Tips",
  "Food Spots",
  "Itineraries",
  "General",
];

export default function CreateDiscussionModal({
  open,
  onClose,
  onCreated,
  defaultAuthor = "Guest",
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (t: CommunityTopic) => void;
  defaultAuthor?: string;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<CommunityTopic["category"]>("General");
  const [author, setAuthor] = useState(defaultAuthor);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 50);
      setError(null);
    } else {
      setTitle(""); setCategory("General"); setAuthor(defaultAuthor); setBody("");
    }
  }, [open, defaultAuthor]);

  if (!open) return null;

  const validate = () => {
    if (title.trim().length < 6) return "Title must be at least 6 characters.";
    if (!category) return "Please choose a category.";
    if (author.trim().length < 2) return "Author name must be at least 2 characters.";
    if (body.trim().length < 20) return "Post body must be at least 20 characters.";
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    const excerpt = body.length > 120 ? body.slice(0, 117) + "..." : body;
    const topic: CommunityTopic = {
      id: genId(),
      title: title.trim(),
      category,
      author: author.trim(),
      replies: 0,
      excerpt,
      body,
      createdAt: new Date().toISOString(),
    };
    onCreated(topic);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-xl rounded-2xl border border-gray-200 bg-white shadow-xl">
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          <header className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Start a Discussion</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              ✕
            </button>
          </header>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
              {error}
            </div>
          )}

          <label className="text-sm text-gray-700 block">
            Title
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Budget Osaka Food Tour Tips"
              className="mt-1 w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="text-sm text-gray-700 block">
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="mt-1 w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <label className="text-sm text-gray-700 block">
              Author
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Your name"
                className="mt-1 w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </label>
          </div>

          <label className="text-sm text-gray-700 block">
            Body
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add details, tips, links, and context…"
              rows={6}
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Post
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

