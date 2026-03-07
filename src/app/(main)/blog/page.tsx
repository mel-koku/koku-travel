import { getPublishedBlogPosts } from "@/lib/blog/blogService";
import { BlogListClient } from "@/components/features/blog/BlogListClient";

export const metadata = {
  title: "Blog | Koku Travel",
  description:
    "Stories, tips, and deep dives for planning your Japan trip. From ramen rankings to cherry blossom forecasts.",
  openGraph: {
    title: "Blog | Koku Travel",
    description:
      "Stories, tips, and deep dives for planning your Japan trip. From ramen rankings to cherry blossom forecasts.",
    siteName: "Koku Travel",
  },
};

export const revalidate = 3600;

export default async function BlogPage() {
  const posts = await getPublishedBlogPosts();

  const lcpImageUrl = posts[0]?.featuredImage?.url;

  return (
    <>
      {lcpImageUrl && <link rel="preload" as="image" href={lcpImageUrl} />}
      <div className="min-h-[100dvh] bg-background">
        <BlogListClient posts={posts} />
      </div>
    </>
  );
}
