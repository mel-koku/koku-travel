"use client";

import { MouseEvent } from "react";

import { useAppState } from "@/state/AppState";

type GuideBookmarkButtonProps = {
  guideId: string;
  variant?: "pill" | "icon";
  className?: string;
};

export default function GuideBookmarkButton({
  guideId,
  variant = "pill",
  className,
}: GuideBookmarkButtonProps) {
  const { isGuideBookmarked, toggleGuideBookmark, loadingBookmarks } = useAppState();
  const active = isGuideBookmarked(guideId);
  const isLoading = loadingBookmarks.has(guideId);

  function onClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (isLoading) return;
    toggleGuideBookmark(guideId);
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        aria-pressed={active}
        aria-busy={isLoading}
        aria-label={active ? "Remove guide bookmark" : "Save guide"}
        className={cx(
          "inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-400 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
          active && "text-indigo-600",
          isLoading && "opacity-50 cursor-not-allowed",
          className,
        )}
      >
        {isLoading ? (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        ) : (
          <BookmarkIcon active={active} />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading}
      aria-pressed={active}
      aria-busy={isLoading}
      className={cx(
        "inline-flex items-center gap-2 rounded-full border border-indigo-200 px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
        active
          ? "bg-indigo-600 text-white hover:bg-indigo-700"
          : "bg-white text-indigo-600 hover:bg-indigo-50",
        isLoading && "opacity-50 cursor-not-allowed",
        className,
      )}
    >
      {isLoading ? (
        <>
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          <span>Saving...</span>
        </>
      ) : (
        <>
          <BookmarkIcon active={active} />
          {active ? "Saved to bookmarks" : "Save guide"}
        </>
      )}
    </button>
  );
}

function BookmarkIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={cx("h-4 w-4", active ? "fill-current" : "stroke-current")}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d={
          active
            ? "M6 3.6C6 3.26863 6.26863 3 6.6 3H17.4C17.7314 3 18 3.26863 18 3.6V20.1571C18 20.7838 17.3028 21.1496 16.791 20.7829L12 17.4L7.20897 20.7829C6.69723 21.1496 6 20.7838 6 20.1571V3.6Z"
            : "M7 4H17C17.5523 4 18 4.44772 18 5V20L12 16L6 20V5C6 4.44772 6.44772 4 7 4Z"
        }
      />
    </svg>
  );
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

