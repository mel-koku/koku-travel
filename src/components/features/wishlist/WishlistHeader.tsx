import Link from "next/link";

import CapsuleHeader from "@/components/ui/CapsuleHeader";

export default function WishlistHeader({ count }: { count: number }) {
  return (
    <aside className="flex flex-col items-center px-4 mt-2">
      <CapsuleHeader
        title="Favorites"
        subtitle={`${count} ${count === 1 ? "favorite" : "favorites"}`}
        rightButton={
          <Link
            href="/explore"
            className="
              inline-flex items-center justify-center
              text-sm font-medium text-brand-primary hover:text-brand-primary/80
              border border-brand-primary/20 px-4 py-2 rounded-2xl
              hover:bg-brand-primary/10 transition
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary
            "
          >
            Add More
          </Link>
        }
      />
    </aside>
  );
}
