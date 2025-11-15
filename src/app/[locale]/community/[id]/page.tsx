import TopicDetailClient from "@/components/features/community/TopicDetailClient";
import { MOCK_TOPICS } from "@/data/mockCommunity";

export default async function CommunityTopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <TopicDetailClient id={id} seed={MOCK_TOPICS} />
    </div>
  );
}

