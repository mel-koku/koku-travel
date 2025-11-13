 "use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { MOCK_TOPICS } from "@/data/mockCommunity";
import Avatar from "@/components/ui/Avatar";
import { timeAgo } from "@/lib/time";

function getReplyCount(id: string) {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(`koku_community_replies_v1_${id}`);
    return raw ? JSON.parse(raw).length : 0;
  } catch {
    return 0;
  }
}

function getLastActivity(id: string, fallbackISO: string) {
  if (typeof window === "undefined") return fallbackISO;
  try {
    const raw = localStorage.getItem(`koku_community_replies_v1_${id}`);
    const list = raw ? JSON.parse(raw) : [];
    if (Array.isArray(list) && list.length) return list[0].createdAt; // newest first
    return fallbackISO;
  } catch {
    return fallbackISO;
  }
}

type CommunityTopicCardProps = {
  topic: (typeof MOCK_TOPICS)[number];
};

export default function CommunityTopicCard({ topic }: CommunityTopicCardProps) {
  const [replyCount, setReplyCount] = useState<number>(() => getReplyCount(topic.id));
  const [lastISO, setLastISO] = useState<string>(() =>
    getLastActivity(topic.id, topic.createdAt ?? new Date().toISOString()),
  );

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key.includes(`koku_community_replies_v1_${topic.id}`)) {
        setReplyCount(getReplyCount(topic.id));
        setLastISO(getLastActivity(topic.id, topic.createdAt));
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [topic.id, topic.createdAt]);

  return (
    <Link href={`/community/${topic.id}`} className="group">
      <article
        className="
        rounded-2xl border border-gray-200 bg-white shadow-md
        hover:shadow-lg transition p-5 flex flex-col justify-between
      "
      >
        <div className="space-y-2">
          <p className="text-xs font-semibold text-indigo-600 tracking-wide uppercase">
            {topic.category}
          </p>
          <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition">
            {topic.title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-3">{topic.excerpt}</p>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <span className="inline-flex items-center gap-2">
            <Avatar name={topic.author} />
            <span className="text-gray-700">{topic.author}</span>
          </span>
          <span className="inline-flex items-center gap-3">
            <span>
              💬 {replyCount} {replyCount === 1 ? "reply" : "replies"}
            </span>
            <span>•</span>
            <time dateTime={lastISO}>{timeAgo(lastISO)}</time>
          </span>
        </div>
      </article>
    </Link>
  );
}

