import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function ExperienceDetailPageB({ params }: Props) {
  const { slug } = await params;
  redirect(`/b/guides/${slug}`);
}
