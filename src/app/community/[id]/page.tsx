import TopicDetailClient from "@/components/features/community/TopicDetailClient";
import { MOCK_TOPICS } from "@/data/mocks/mockCommunity";

export default async function CommunityTopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-surface pb-24">
      <TopicDetailClient id={id} seed={MOCK_TOPICS} />
    </div>
  );
}

