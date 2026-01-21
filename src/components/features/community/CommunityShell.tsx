"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { MOCK_TOPICS, type CommunityTopic } from "@/data/mocks/mockCommunity";
import CommunityTopicCard from "./CommunityTopicCard";

const CreateDiscussionModal = dynamic(() => import("./CreateDiscussionModal"), {
  ssr: false,
});
import { addTopic, loadTopics } from "@/lib/communityStorage";

export default function CommunityShell() {
  const [open, setOpen] = useState(false);
  const [topics, setTopics] = useState<CommunityTopic[]>(() => loadTopics(MOCK_TOPICS));

  const handleCreated = (t: CommunityTopic) => {
    setTopics((prev) => addTopic(prev, t));
  };

  return (
    <section className="max-w-7xl mx-auto px-8">
      <aside className="flex flex-col items-center mt-6 mb-8">
        <div className="w-full max-w-4xl bg-white rounded-2xl border border-gray-200 shadow-md px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Community Discussions</h1>
              <p className="text-sm text-gray-500">Connect with travelers & locals across Japan</p>
            </div>
            <button
              onClick={() => setOpen(true)}
              className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Start Discussion
            </button>
          </div>
        </div>
      </aside>

      {topics.length === 0 ? (
        <p className="text-center text-gray-500 mt-16">No discussions yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {topics.map((topic) => (
            <CommunityTopicCard key={topic.id} topic={topic} />
          ))}
        </div>
      )}

      <CreateDiscussionModal
        open={open}
        onClose={() => setOpen(false)}
        onCreated={handleCreated}
      />
    </section>
  );
}

