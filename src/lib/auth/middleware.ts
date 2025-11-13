import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Checks if the current user is authenticated.
 * Returns the user if authenticated, otherwise redirects to account page.
 *
 * @returns The authenticated user
 * @throws Redirects to /account if not authenticated
 */
export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/account");
  }

  return user;
}

/**
 * Checks if the current user is authenticated.
 * Returns the user if authenticated, otherwise returns null.
 * Does not redirect - useful for conditional rendering.
 *
 * @returns The authenticated user or null
 */
export async function getAuthUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

