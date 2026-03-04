import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ExperienceDetailPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/guides/${slug}`);
}
