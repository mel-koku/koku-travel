"use client";

import { useWishlist } from "@/context/WishlistContext";
import { Location } from "@/types/location";

type LocationCardProps = {
  location: Location;
};

export function LocationCard({ location }: LocationCardProps) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const active = isInWishlist(location.id);

  return (
    <article className="relative rounded-2xl overflow-hidden border border-gray-200 bg-white hover:shadow-lg transition text-gray-900 focus-within:ring-2 focus-within:ring-indigo-500">
      <button
        aria-label={active ? "Remove from Trip" : "Add to Trip"}
        onClick={(event) => {
          event.stopPropagation();
          toggleWishlist(location.id);
        }}
        className={`absolute top-3 right-3 rounded-full border border-gray-200 bg-white/90 p-2 text-gray-400 transition hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${active ? "text-indigo-600" : "text-gray-400"}`}
      >
        <HeartIcon active={active} />
      </button>
      <img
        src={location.image}
        alt={location.name}
        className="h-48 w-full object-cover"
      />
      <div className="p-4 space-y-1">
        <h3 className="font-semibold text-gray-900">{location.name}</h3>
        <p className="text-sm text-gray-600">
          {location.city}, {location.region}
        </p>
        <span className="inline-block text-xs mt-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700">
          {location.category}
        </span>
      </div>
    </article>
  );
}

function HeartIcon({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={active ? "h-4 w-4 fill-indigo-600 stroke-indigo-600" : "h-4 w-4 stroke-current"}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19.5 13.572a24.064 24.064 0 0 1-7.5 7.178 24.064 24.064 0 0 1-7.5-7.178C3.862 12.334 3 10.478 3 8.52 3 5.989 5.014 4 7.5 4c1.54 0 2.994.757 4 1.955C12.506 4.757 13.96 4 15.5 4 17.986 4 20 5.989 20 8.52c0 1.958-.862 3.813-2.5 5.052Z" />
    </svg>
  );
}

