import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getBlogPostBySlug, getPublishedBlogPosts, getAllBlogPostSlugs } from "@/lib/blog/blogService";
import { BlogDetailClient } from "@/components/features/blog/BlogDetailClient";

const getCachedPost = cache((slug: string) => getBlogPostBySlug(slug));

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await getAllBlogPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getCachedPost(slug);

  if (!post) {
    return { title: "Post Not Found | Koku Travel" };
  }

  const imageUrl = post.featuredImage?.url;

  return {
    title: `${post.title} | Koku Travel`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      ...(imageUrl ? { images: [imageUrl] } : {}),
      type: "article",
      publishedTime: post.publishedAt,
    },
  };
}

export const revalidate = 3600;

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getCachedPost(slug);

  if (!post) {
    notFound();
  }

  // Get related posts (same category, exclude current)
  const allPosts = await getPublishedBlogPosts();
  const related = allPosts
    .filter((p) => p.slug !== post.slug && p.category === post.category)
    .slice(0, 3);

  return <BlogDetailClient post={post} relatedPosts={related} />;
}
