import "dotenv/config";

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MOCK_LOCATIONS } from "../src/data/mockLocations";
import { LOCATION_EDITORIAL_SUMMARIES } from "../src/data/locationEditorialSummaries";

const API_BASE_URL = process.env.LOCAL_API_BASE_URL ?? "http://localhost:3000";
const REQUEST_DELAY_MS = Number.parseInt(process.env.EDITORIAL_SUMMARY_DELAY_MS ?? "500", 10);
const ONLY_FILL_MISSING = process.env.EDITORIAL_SUMMARY_ONLY_MISSING === "true";

type LocationDetailsResponse = {
  details?: {
    editorialSummary?: string | null;
  };
};

const dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.resolve(dirname, "../src/data/locationEditorialSummaries.ts");

async function wait(ms: number) {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchEditorialSummary(id: string): Promise<string | null> {
  const response = await fetch(`${API_BASE_URL}/api/locations/${id}`);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed with status ${response.status}. Body: ${body}`);
  }

  const payload = (await response.json()) as LocationDetailsResponse;
  const summary = payload.details?.editorialSummary?.trim() ?? "";

  return summary.length > 0 ? summary : null;
}

async function main() {
  console.log(`📝 Generating editorial summaries using ${API_BASE_URL}`);
  const combined: Record<string, string> = { ...LOCATION_EDITORIAL_SUMMARIES };
  const missingSummaries: string[] = [];

  for (const { id } of MOCK_LOCATIONS) {
    const existingSummary = combined[id]?.trim();

    if (ONLY_FILL_MISSING && existingSummary) {
      console.log(`⏭️  Skipping ${id} (already has summary)`);
      continue;
    }

    try {
      const summary = await fetchEditorialSummary(id);

      if (summary) {
        combined[id] = summary;
        console.log(`✅ Updated summary for ${id}`);
      } else if (existingSummary) {
        console.log(`ℹ️  Keeping existing summary for ${id}`);
      } else {
        missingSummaries.push(id);
        console.warn(`⚠️  No summary returned for ${id}`);
      }
    } catch (error) {
      missingSummaries.push(id);
      console.error(`❌ Failed to fetch summary for ${id}`, error);
    }

    await wait(REQUEST_DELAY_MS);
  }

  const sortedEntries = Object.entries(combined)
    .filter(([, summary]) => summary?.trim().length)
    .sort(([left], [right]) => left.localeCompare(right));

  const lines = sortedEntries.map(
    ([id, summary]) => `  ${JSON.stringify(id)}: ${JSON.stringify(summary)},`,
  );

  const fileContents = [
    "export const LOCATION_EDITORIAL_SUMMARIES: Record<string, string> = {",
    ...lines,
    "};",
    "",
  ].join("\n");

  await writeFile(OUTPUT_PATH, fileContents);
  console.log(`\n📦 Wrote ${sortedEntries.length} summaries to ${OUTPUT_PATH}`);

  if (missingSummaries.length > 0) {
    console.warn(
      `⚠️  Missing summaries for ${missingSummaries.length} locations:\n${missingSummaries.join(
        "\n",
      )}`,
    );
  } else {
    console.log("🎉 All locations populated with editorial summaries.");
  }
}

main().catch((error) => {
  console.error("[generate-editorial-summaries] Unhandled error", error);
  process.exit(1);
});


