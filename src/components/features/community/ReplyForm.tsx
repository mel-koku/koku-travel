import Link from "next/link";
import type { FormEvent } from "react";

type ReplyFormProps = {
  author: string;
  body: string;
  error: string | null;
  onAuthorChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
};

export function ReplyForm({
  author,
  body,
  error,
  onAuthorChange,
  onBodyChange,
  onSubmit,
}: ReplyFormProps) {
  return (
    <section className="max-w-3xl mx-auto px-6 md:px-0 mt-8">
      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-gray-200 bg-white shadow-md p-6 space-y-3"
      >
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
            onChange={(e) => onAuthorChange(e.target.value)}
            className="mt-1 w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Your name"
          />
        </label>

        <label className="text-sm text-gray-700 block">
          Message
          <textarea
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Share tips, feedback, or resources…"
          />
        </label>

        <p className="text-xs text-gray-500">
          You can edit or delete your reply for 5 minutes after posting (matched to your
          Name).
        </p>

        <div className="flex items-center justify-end gap-3 pt-1">
          <Link href="/community" className="text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </Link>
          <button
            type="submit"
            className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Reply
          </button>
        </div>
      </form>
    </section>
  );
}

