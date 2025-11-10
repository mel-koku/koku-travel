import { Guide } from "@/types/guide";

export const MOCK_GUIDES: Guide[] = [
  {
    id: "kyoto-culture",
    title: "A Day in Kyoto’s Temples",
    category: "culture",
    summary:
      "Discover Kyoto’s timeless shrines, tranquil gardens, and street eats.",
    image: "https://images.pexels.com/photos/2342479/pexels-photo-2342479.jpeg",
  },
  {
    id: "tokyo-nightlife",
    title: "Tokyo After Dark",
    category: "nightlife",
    summary:
      "Explore bars, izakayas, and skyline views in Japan’s sleepless city.",
    image: "https://cdn.pixabay.com/photo/2021/12/17/10/09/night-6876155_1280.jpg",
  },
  {
    id: "hokkaido-food",
    title: "Hokkaido for Food Lovers",
    category: "food",
    summary:
      "From soup curry to fresh uni — a culinary trail through the north.",
    image: "https://cdn.pixabay.com/photo/2020/04/12/13/03/ramen-5034166_1280.jpg",
  },
];

export const GUIDE_CATEGORIES = ["culture", "food", "nature", "nightlife"];


