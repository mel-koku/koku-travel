import { ImageResponse } from "next/og";
import {
  getGuideWithLocations,
  getSanityGuideWithLocations,
} from "@/lib/guides/guideService";
import { urlFor } from "@/sanity/image";
import { logger } from "@/lib/logger";
import { loadGoogleFontTtf } from "@/lib/seo/ogFont";

export const alt = "Yuku Japan travel guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ slug: string }> };

const WORDMARK = "Yuku Japan";
const FALLBACK_TITLE = "Discover Japan with Local Experts";

// Brand tokens mirrored from globals.css so Satori can render them.
const BRAND_VERMILION = "#E23828";
const WASHI_BG = "#FAF8F5";

type GuideShape = {
  title: string;
  featuredImageUrl: string | null;
  guideType?: string;
};

async function loadGuide(slug: string): Promise<GuideShape | null> {
  try {
    const sanityResult = await getSanityGuideWithLocations(slug);
    if (sanityResult?.guide) {
      const g = sanityResult.guide;
      const directUrl = g.featuredImage?.url ?? null;
      const builtUrl = g.featuredImage
        ? urlFor(g.featuredImage).width(1200).height(630).fit("crop").url()
        : null;
      return {
        title: g.title,
        featuredImageUrl: directUrl ?? builtUrl,
        guideType: g.guideType,
      };
    }
  } catch (error) {
    logger.warn("og-image: sanity guide fetch failed", {
      slug,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const dbResult = await getGuideWithLocations(slug);
    if (dbResult?.guide) {
      return {
        title: dbResult.guide.title,
        featuredImageUrl: dbResult.guide.featuredImage ?? null,
        guideType: dbResult.guide.guideType,
      };
    }
  } catch (error) {
    logger.warn("og-image: supabase guide fetch failed", {
      slug,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return null;
}

function formatGuideType(raw: string | undefined): string | null {
  if (!raw) return null;
  const map: Record<string, string> = {
    itinerary: "Itinerary",
    listicle: "Field Notes",
    deep_dive: "Deep Dive",
    seasonal: "Seasonal",
    activity: "Experience",
    blog: "Journal",
  };
  return map[raw] ?? null;
}

function titleFontSize(title: string): number {
  if (title.length <= 32) return 88;
  if (title.length <= 56) return 72;
  if (title.length <= 84) return 60;
  return 48;
}

export default async function GuideOpengraphImage({ params }: Props) {
  const { slug } = await params;
  const guide = await loadGuide(slug);

  const title = guide?.title ?? FALLBACK_TITLE;
  const featuredImage = guide?.featuredImageUrl ?? null;
  const eyebrow = formatGuideType(guide?.guideType) ?? WORDMARK;

  const glyphs = `${title}${WORDMARK}${eyebrow}`;
  const fontData = await loadGoogleFontTtf({
    family: "Cormorant",
    weight: 600,
    text: glyphs,
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: BRAND_VERMILION,
          fontFamily: fontData ? "Cormorant" : "serif",
        }}
      >
        {featuredImage ? (
           
          <img
            src={featuredImage}
            alt=""
            width={1200}
            height={630}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : null}

        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: `linear-gradient(180deg, rgba(44,40,37,0.25) 0%, rgba(44,40,37,0.55) 55%, rgba(44,40,37,0.90) 100%)`,
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "72px 80px",
            color: WASHI_BG,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                fontFamily: fontData ? "Cormorant" : "serif",
                fontSize: 28,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                opacity: 0.92,
              }}
            >
              {WORDMARK}
            </div>
            {eyebrow !== WORDMARK ? (
              <div
                style={{
                  display: "flex",
                  padding: "10px 22px",
                  borderRadius: 999,
                  border: `1px solid ${WASHI_BG}`,
                  fontSize: 22,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fontFamily: "sans-serif",
                  opacity: 0.95,
                }}
              >
                {eyebrow}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              maxWidth: 1040,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 72,
                height: 3,
                backgroundColor: BRAND_VERMILION,
              }}
            />
            <div
              style={{
                fontFamily: fontData ? "Cormorant" : "serif",
                fontSize: titleFontSize(title),
                fontWeight: 600,
                lineHeight: 1.05,
                letterSpacing: "-0.01em",
                color: WASHI_BG,
                display: "flex",
              }}
            >
              {title}
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 16,
            height: "100%",
            backgroundColor: BRAND_VERMILION,
            display: "flex",
          }}
        />
      </div>
    ),
    {
      ...size,
      fonts: fontData
        ? [
            {
              name: "Cormorant",
              data: fontData,
              style: "normal",
              weight: 600,
            },
          ]
        : undefined,
    },
  );
}
