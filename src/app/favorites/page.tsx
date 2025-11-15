"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import WishlistShell from "@/components/features/wishlist/WishlistShell";

export default function FavoritesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check authentication on mount
  useEffect(() => {
    if (!supabase) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => setIsCheckingAuth(false), 0);
      return;
    }

    const checkAuth = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser) {
          router.push("/dashboard");
          return;
        }
      } catch {
        router.push("/dashboard");
        return;
      }
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, [supabase, router]);

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-4 pb-16">
      <WishlistShell />
    </div>
  );
}

