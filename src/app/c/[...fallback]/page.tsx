import { redirect } from "next/navigation";

export default async function VariantCFallback({
  params,
}: {
  params: Promise<{ fallback: string[] }>;
}) {
  const { fallback } = await params;
  redirect("/" + fallback.join("/"));
}
