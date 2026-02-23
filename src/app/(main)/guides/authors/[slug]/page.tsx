import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getSanityAuthorBySlug } from "@/lib/guides/guideService";
import { AuthorProfile } from "@/components/features/guides/AuthorProfile";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const author = await getSanityAuthorBySlug(slug);

  if (!author) {
    return { title: "Author Not Found | Koku Travel" };
  }

  return {
    title: `${author.name} — Local Guide | Koku Travel`,
    description:
      author.bio || `Read travel guides by ${author.name} on Koku Travel.`,
  };
}

export const revalidate = 3600;

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params;
  const author = await getSanityAuthorBySlug(slug);

  if (!author) {
    notFound();
  }

  return <AuthorProfile author={author} />;
}
