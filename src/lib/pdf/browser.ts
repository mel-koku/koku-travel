import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import type { Browser } from "puppeteer-core";

let cached: Browser | null = null;

/**
 * Returns a singleton headless Chromium browser. On Vercel, the Node process
 * is frozen between warm invocations — this singleton survives across them.
 * On cold start the process is fresh and we relaunch.
 */
export async function getBrowser(): Promise<Browser> {
  if (cached && cached.isConnected()) return cached;

  cached = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  return cached;
}
