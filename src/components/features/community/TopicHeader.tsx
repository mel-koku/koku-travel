import Avatar from "@/components/ui/Avatar";
import { timeAgo } from "@/lib/time";
import type { CommunityTopic } from "@/data/mocks/mockCommunity";

type TopicHeaderProps = {
  topic: CommunityTopic;
  replyCount: number;
};

export function TopicHeader({ topic, replyCount }: TopicHeaderProps) {
  return (
    <section className="max-w-screen-xl mx-auto px-8 pt-6">
      <div className="w-full max-w-4xl bg-white rounded-2xl border border-gray-200 shadow-md px-8 py-5 mx-auto">
        <p className="text-xs font-semibold text-indigo-600 tracking-wide uppercase">
          {topic.category}
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mt-1">
          {topic.title}
        </h1>
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-3">
          <span className="inline-flex items-center gap-2">
            <Avatar name={topic.author} />
            <span className="text-gray-700">{topic.author}</span>
          </span>
          <span>•</span>
          <time
            dateTime={topic.createdAt}
            title={new Date(topic.createdAt).toLocaleString()}
          >
            {timeAgo(topic.createdAt)}
          </time>
          <span>•</span>
          <span>
            {replyCount} {replyCount === 1 ? "reply" : "replies"}
          </span>
        </div>
      </div>
    </section>
  );
}

