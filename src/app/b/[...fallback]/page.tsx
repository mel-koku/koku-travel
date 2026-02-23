import { redirect } from "next/navigation";

export default async function VariantBFallback({
  params,
}: {
  params: Promise<{ fallback: string[] }>;
}) {
  const { fallback } = await params;
  redirect("/" + fallback.join("/"));
}
