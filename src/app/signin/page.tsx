import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/middleware";
import { getPagesContent } from "@/lib/sanity/contentService";
import { SignInClient } from "./SignInClient";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const [authUser, content] = await Promise.all([
    getAuthUser(),
    getPagesContent(),
  ]);

  if (authUser) {
    redirect("/dashboard");
  }

  return <SignInClient content={content ?? undefined} />;
}
