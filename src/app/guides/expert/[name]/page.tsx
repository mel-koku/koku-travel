import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import GuideCard from "@/components/features/guides/GuideCard";
import { getExpertById } from "@/data/mockExperts";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FALLBACK_IMAGE_SRC =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

type ExpertProfileParams = {
  name: string | string[];
};

type ExpertProfileProps = {
  params: ExpertProfileParams | Promise<ExpertProfileParams>;
};

export default async function ExpertProfilePage(props: ExpertProfileProps) {
  const params = await Promise.resolve(props.params);
  const rawName = params.name;
  const nameSlug = Array.isArray(rawName) ? rawName[0] : rawName;

  if (!nameSlug) {
    return notFound();
  }

  const expert = getExpertById(nameSlug);

  if (!expert) {
    return notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Cover Image */}
      {expert.coverImage && (
        <section className="relative w-full h-64 md:h-80 overflow-hidden">
          <Image
            src={expert.coverImage}
            alt={`${expert.name} profile cover`}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-black/40" />
        </section>
      )}

      {/* Profile Header */}
      <section className="max-w-screen-xl mx-auto px-8 -mt-16 md:-mt-20 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                {expert.avatar ? (
                  <Image
                    src={expert.avatar}
                    alt={expert.name}
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                ) : (
                  <Avatar name={expert.name} size={128} />
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                    {expert.name}
                  </h1>
                  {expert.location && (
                    <p className="text-gray-600 mb-2">{expert.location}</p>
                  )}
                  {expert.yearsExperience && (
                    <p className="text-sm text-gray-500">
                      {expert.yearsExperience} years of experience
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {expert.languages.map((lang) => (
                    <Badge key={lang} tone="secondary" variant="soft">
                      {lang}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Bio */}
              <p className="text-gray-700 leading-relaxed mb-6">{expert.bio}</p>

              {/* Expertise */}
              <div>
                <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
                  Areas of Expertise
                </h2>
                <div className="flex flex-wrap gap-2">
                  {expert.expertise.map((area) => (
                    <Badge key={area} tone="brand" variant="soft">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Guides Section */}
      {expert.guides.length > 0 && (
        <section className="max-w-screen-xl mx-auto px-8 mt-12 pb-12">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
              Guides & Tours
            </h2>
            <Link
              href="/guides"
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              View all guides →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {expert.guides.map((guide) => (
              <GuideCard key={guide.id} guide={guide} />
            ))}
          </div>
        </section>
      )}

      {/* Itineraries Section */}
      {expert.itineraries.length > 0 && (
        <section className="max-w-screen-xl mx-auto px-8 mt-12 pb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
            Curated Itineraries
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {expert.itineraries.map((itinerary) => (
              <Link
                key={itinerary.id}
                href={`/itinerary?tour=${itinerary.id}`}
                className="group block"
              >
                <article className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md transition hover:shadow-lg h-full">
                  {itinerary.image && (
                    <div className="relative h-48 w-full">
                      <Image
                        src={itinerary.image}
                        alt={itinerary.title}
                        fill
                        className="object-cover transition group-hover:scale-105"
                        sizes="(min-width: 768px) 50vw, 100vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <Badge tone="success" variant="soft" className="text-xs">
                        {itinerary.duration}
                      </Badge>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition">
                      {itinerary.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {itinerary.description}
                    </p>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        {itinerary.itinerary.days.length} day
                        {itinerary.itinerary.days.length !== 1 ? "s" : ""} •{" "}
                        {itinerary.itinerary.days.reduce(
                          (acc, day) => acc + day.activities.length,
                          0,
                        )}{" "}
                        stops
                      </p>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Back Links */}
      <div className="max-w-screen-xl mx-auto px-8 pb-12">
        <div className="flex flex-wrap gap-4">
          <Link
            href="/guides/experts"
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
          >
            ← Browse All Experts
          </Link>
          <span className="text-gray-300">|</span>
          <Link
            href="/guides"
            className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
          >
            Back to Guides
          </Link>
        </div>
      </div>
    </main>
  );
}

