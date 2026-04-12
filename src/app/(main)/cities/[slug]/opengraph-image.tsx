import { ImageResponse } from "next/og";
import { CITY_TO_REGION, REGIONS } from "@/data/regions";
import { getCityPageData } from "@/lib/cities/cityData";
import { loadGoogleFontTtf } from "@/lib/seo/ogFont";
import type { KnownCityId } from "@/types/trip";

export const alt = "Yuku Japan city guide";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ slug: string }> };

const WORDMARK = "Yuku Japan";
const FALLBACK_TITLE = "Japan";
const FALLBACK_TAGLINE = "Discover Japan with Local Experts";

const BRAND_VERMILION = "#E23828";
const DEEP_VERMILION = "#C93022";
const WASHI_BG = "#FAF8F5";
const CHARCOAL = "#2C2825";

function regionName(slug: string): string | null {
  const regionId = CITY_TO_REGION[slug as KnownCityId];
  if (!regionId) return null;
  return REGIONS.find((r) => r.id === regionId)?.name ?? null;
}

function titleFontSize(title: string): number {
  if (title.length <= 10) return 180;
  if (title.length <= 16) return 140;
  if (title.length <= 24) return 110;
  return 88;
}

export default async function CityOpengraphImage({ params }: Props) {
  const { slug } = await params;
  const city = getCityPageData(slug);

  const name = city?.name ?? FALLBACK_TITLE;
  const kanji = city?.nameJapanese ?? "";
  const tagline = city?.tagline ?? FALLBACK_TAGLINE;
  const region = regionName(slug);
  const eyebrow = region ? `${region} Region` : WORDMARK;

  const latinGlyphs = `${name}${tagline}${WORDMARK}${eyebrow}`;
  const cormorantFont = await loadGoogleFontTtf({
    family: "Cormorant",
    weight: 600,
    text: latinGlyphs,
  });
  const kanjiFont = kanji
    ? await loadGoogleFontTtf({
        family: "Noto Serif JP",
        weight: 600,
        text: kanji,
      })
    : null;

  const fonts: NonNullable<
    ConstructorParameters<typeof ImageResponse>[1]
  >["fonts"] = [];
  if (cormorantFont) {
    fonts.push({
      name: "Cormorant",
      data: cormorantFont,
      style: "normal",
      weight: 600,
    });
  }
  if (kanjiFont) {
    fonts.push({
      name: "NotoSerifJP",
      data: kanjiFont,
      style: "normal",
      weight: 600,
    });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: `linear-gradient(135deg, ${BRAND_VERMILION} 0%, ${DEEP_VERMILION} 100%)`,
          fontFamily: cormorantFont ? "Cormorant" : "serif",
          color: WASHI_BG,
        }}
      >
        {kanji ? (
          <div
            style={{
              position: "absolute",
              right: -80,
              bottom: -120,
              fontFamily: kanjiFont ? "NotoSerifJP" : "serif",
              fontSize: 600,
              lineHeight: 1,
              opacity: 0.12,
              color: WASHI_BG,
              display: "flex",
            }}
          >
            {kanji}
          </div>
        ) : null}

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: "72px 80px",
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
                fontFamily: cormorantFont ? "Cormorant" : "serif",
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
                backgroundColor: WASHI_BG,
                opacity: 0.85,
              }}
            />
            <div
              style={{
                fontFamily: cormorantFont ? "Cormorant" : "serif",
                fontSize: titleFontSize(name),
                fontWeight: 600,
                lineHeight: 0.95,
                letterSpacing: "-0.02em",
                display: "flex",
              }}
            >
              {name}
            </div>
            <div
              style={{
                fontFamily: cormorantFont ? "Cormorant" : "serif",
                fontSize: 34,
                lineHeight: 1.25,
                fontStyle: "italic",
                opacity: 0.92,
                maxWidth: 900,
                display: "flex",
              }}
            >
              {tagline}
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
            backgroundColor: CHARCOAL,
            display: "flex",
          }}
        />
      </div>
    ),
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
    },
  );
}
