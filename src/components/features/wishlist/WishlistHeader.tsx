import Link from "next/link";

import CapsuleHeader from "@/components/ui/CapsuleHeader";

export default function WishlistHeader({ count }: { count: number }) {
  return (
    <aside className="flex flex-col items-center px-4 mt-2">
      <CapsuleHeader
        title="Saved Locations"
        subtitle={`${count} ${count === 1 ? "place" : "places"}`}
        rightButton={
          <Link
            href="/explore"
            className="
              inline-flex items-center justify-center
              text-sm font-medium text-indigo-600 hover:text-indigo-700
              border border-indigo-200 px-4 py-2 rounded-2xl
              hover:bg-indigo-50 transition
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
            "
          >
            Add More
          </Link>
        }
      />
    </aside>
  );
}
