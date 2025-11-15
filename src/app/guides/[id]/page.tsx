import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { draftMode } from "next/headers";

import GuideBookmarkButton from "@/components/features/guides/GuideBookmarkButton";
import RelatedGuides from "@/components/features/guides/RelatedGuides";
import { fetchGuideBySlug, fetchGuides } from "@/lib/sanity/guides";

// Force dynamic rendering because we use draftMode() which is a dynamic function
export const dynamic = "force-dynamic";

const FALLBACK_IMAGE_SRC =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

type GuideDetailParams = {
  id: string | string[];
};

type GuideDetailProps = {
  params: GuideDetailParams | Promise<GuideDetailParams>;
};

export default async function GuideDetail(props: GuideDetailProps) {
  const params = await Promise.resolve(props.params);
  const rawSlug = params.id;
  const slug = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;

  if (!slug) {
    return notFound();
  }

  const { isEnabled } = await draftMode();
  const guide = await fetchGuideBySlug(slug, { preview: isEnabled });

  if (!guide) {
    return notFound();
  }

  const guides = await fetchGuides({ preview: isEnabled });
  const relatedPool = guides.some((entry) => entry.slug === guide.slug)
    ? guides
    : [guide, ...guides];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Hero */}
      <section className="relative w-full h-80 overflow-hidden">
        <Image
          src={guide.image || FALLBACK_IMAGE_SRC}
          alt={guide.title}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 mx-auto flex h-full max-w-screen-xl flex-col justify-end px-8 pb-12">
          <span className="text-sm font-medium uppercase tracking-wide text-indigo-200">
            {guide.category}
          </span>
          <h1 className="mt-2 text-3xl font-semibold text-white md:text-4xl">
            {guide.title}
          </h1>
          <p className="mt-3 max-w-2xl text-gray-200">{guide.summary}</p>
          <GuideBookmarkButton guideId={guide.id} className="mt-6 w-fit" />
        </div>
      </section>

      {/* Body */}
      <article className="max-w-3xl mx-auto px-6 md:px-0 mt-16 text-gray-800 leading-relaxed space-y-6">
        <p>
          Welcome to <strong>{guide.title}</strong>. This is placeholder content until the rich text
          body is migrated from Sanity.
        </p>

        <p>Use the related guides below to keep exploring similar topics.</p>
      </article>

      {/* Back link */}
      <div className="max-w-3xl mx-auto mt-12 px-6 md:px-0">
        <Link href="/guides" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
          ← Back to Guides
        </Link>
      </div>

      {/* Related Guides */}
      <RelatedGuides currentId={guide.slug} category={guide.category} guides={relatedPool} />
    </div>
  );
}
