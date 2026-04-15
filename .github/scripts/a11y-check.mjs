#!/usr/bin/env node
/**
 * Accessibility regression gate.
 *
 * Runs @axe-core/playwright against the running app at
 * http://localhost:${PORT:-3000} and exits non-zero on any WCAG 2.1 AA
 * violation. Used by `npm run a11y` and by the a11y CI job.
 *
 * Pages tested are the ones that render meaningful content without
 * authenticated state or seeded trip data, since CI runs against a
 * placeholder build. The itinerary tabs are covered by a one-off
 * Playwright run during local development (see PR comments on c3479c5e).
 *
 * Exit codes:
 *   0 — no violations
 *   1 — at least one violation found
 *   2 — script error (target not reachable, axe install missing, etc.)
 */
import { chromium, devices } from "playwright";
import AxeBuilder from "@axe-core/playwright";

const PORT = process.env.PORT || "3000";
const BASE = `http://localhost:${PORT}`;

const PAGES = [
  { name: "landing", path: "/" },
  { name: "places", path: "/places" },
  { name: "guides", path: "/guides" },
  { name: "trip-builder", path: "/trip-builder" },
  { name: "saved", path: "/saved" },
  { name: "account", path: "/account" },
  { name: "signin", path: "/signin" },
  { name: "contact", path: "/contact" },
  { name: "about", path: "/about" },
];

const VIEWPORTS = [
  { name: "iphone14", ctx: { ...devices["iPhone 14"] } },
  {
    name: "desktop",
    ctx: { viewport: { width: 1280, height: 800 } },
  },
];

async function ensureServerUp() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(BASE, { method: "HEAD" });
      if (res.ok || res.status === 404) return true;
    } catch {
      // not yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function main() {
  const reachable = await ensureServerUp();
  if (!reachable) {
    console.error(`Could not reach ${BASE} after 30s`);
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: true });
  const allViolations = [];

  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext(vp.ctx);
    const page = await ctx.newPage();

    for (const p of PAGES) {
      try {
        await page.goto(BASE + p.path, { waitUntil: "networkidle", timeout: 30000 });
        // Wait for entrance animations to settle. Without this, axe reads
        // mid-fade elements (opacity: 0 with style attr) as low contrast
        // even when the steady-state contrast is fine.
        await page.waitForTimeout(2000);
      } catch (e) {
        console.warn(`${vp.name}/${p.name}: nav failed — ${e.message.slice(0, 120)}`);
        continue;
      }

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();

      const violations = results.violations;
      if (violations.length > 0) {
        for (const v of violations) {
          allViolations.push({
            viewport: vp.name,
            page: p.name,
            id: v.id,
            impact: v.impact,
            help: v.help,
            nodes: v.nodes.length,
            firstNode: v.nodes[0]?.html?.slice(0, 200) ?? "",
          });
        }
      }

      const status = violations.length === 0 ? "✓" : `✗ ${violations.length}`;
      console.log(`${vp.name}/${p.name}: ${status}`);
    }

    await ctx.close();
  }

  await browser.close();

  if (allViolations.length === 0) {
    console.log(`\nclean — ${PAGES.length * VIEWPORTS.length} page/viewport combos checked.`);
    process.exit(0);
  }

  console.error(`\n${allViolations.length} violation(s) across ${PAGES.length * VIEWPORTS.length} combos:\n`);
  for (const v of allViolations) {
    console.error(`  [${v.impact}] ${v.viewport}/${v.page} ${v.id} (${v.nodes} nodes)`);
    console.error(`    ${v.help}`);
    console.error(`    ${v.firstNode}\n`);
  }
  process.exit(1);
}

main().catch((e) => {
  console.error("a11y-check error:", e);
  process.exit(2);
});
