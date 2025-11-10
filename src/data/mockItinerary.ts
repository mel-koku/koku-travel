import { Itinerary } from "../types/itinerary";

export const MOCK_ITINERARY: Itinerary = {
  days: [
    {
      dateLabel: "Day 1 (Kyoto)",
      activities: [
        {
          kind: "place",
          id: "1",
          title: "Fushimi Inari Taisha",
          timeOfDay: "morning",
          durationMin: 120,
          neighborhood: "Fushimi",
          tags: ["culture", "photography"],
        },
        {
          kind: "place",
          id: "2",
          title: "Nishiki Market",
          timeOfDay: "afternoon",
          durationMin: 90,
          neighborhood: "Downtown",
          tags: ["food", "shopping"],
        },
        {
          kind: "place",
          id: "3",
          title: "Gion evening stroll",
          timeOfDay: "evening",
          durationMin: 120,
          neighborhood: "Gion",
          tags: ["culture"],
        },
      ],
    },
    {
      dateLabel: "Day 2 (Arashiyama)",
      activities: [
        {
          kind: "place",
          id: "4",
          title: "Arashiyama Bamboo Grove",
          timeOfDay: "morning",
          durationMin: 90,
          neighborhood: "Arashiyama",
          tags: ["nature", "photography"],
        },
        {
          kind: "place",
          id: "5",
          title: "Tenryu-ji Temple",
          timeOfDay: "afternoon",
          durationMin: 60,
          neighborhood: "Arashiyama",
          tags: ["culture"],
        },
        {
          kind: "place",
          id: "6",
          title: "Katsura Riverside Cafe",
          timeOfDay: "evening",
          durationMin: 90,
          neighborhood: "Katsura",
          tags: ["food"],
        },
      ],
    },
  ],
};


