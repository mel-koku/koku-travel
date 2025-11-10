export type CommunityTopic = {
  id: string;
  title: string;
  category: "Travel Tips" | "Food Spots" | "Itineraries" | "General";
  author: string;
  replies: number;
  excerpt: string;
  body: string;
  createdAt: string; // ISO
};

export const MOCK_TOPICS: CommunityTopic[] = [
  {
    id: "kyoto-cafes",
    title: "Best Hidden Cafes in Kyoto",
    category: "Food Spots",
    author: "AikoMatsuda",
    replies: 14,
    excerpt:
      "Let’s share favorite local cafés around Gion and Nishiki Market — bonus points for photo spots!",
    body:
      "I’ll start: % Arabica Arashiyama for the view, and Weekenders Coffee for beans. What else?",
    createdAt: "2025-01-08T09:15:00.000Z",
  },
  {
    id: "japan-rail-pass",
    title: "Is the JR Pass worth it in 2025?",
    category: "Travel Tips",
    author: "NomadKenji",
    replies: 23,
    excerpt:
      "After the price jump, how are you planning long-distance trips affordably?",
    body:
      "I’m comparing regional passes vs point-to-point tickets. Any recent math from Kansai↔Tokyo?",
    createdAt: "2024-12-12T14:45:00.000Z",
  },
  {
    id: "tokyo-itinerary",
    title: "3-Day Tokyo Itinerary Help",
    category: "Itineraries",
    author: "TravelerMia",
    replies: 9,
    excerpt:
      "Feedback on my 3-day plan — Asakusa, Odaiba, and night views.",
    body:
      "Day 1: Asakusa/SkyTree. Day 2: Odaiba teamLab/Palette Town. Day 3: Shibuya night views. Thoughts?",
    createdAt: "2025-02-18T07:30:00.000Z",
  },
];

