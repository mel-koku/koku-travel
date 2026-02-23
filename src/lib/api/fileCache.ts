import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

/**
 * File-based cache that persists across dev server restarts.
 *
 * In dev mode, Turbopack compilation blocks the event loop and causes
 * Supabase fetch() calls to time out. The globalThis cache is cleared
 * on restart. This file cache provides a fallback so the first request
 * after a restart can serve data without a network call.
 *
 * Uses synchronous fs to avoid event-loop contention during compilation.
 */

const CACHE_DIR = join(tmpdir(), "koku-travel-cache");
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const STALE_FILE_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours

type CacheEnvelope<T> = { data: T; cachedAt: number };

let lastCleanup = 0;

function ensureDir() {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
  } catch {
    // Already exists or permission error — best-effort
  }
}

export function readFileCache<T>(key: string, ttlMs: number): T | null {
  try {
    const raw = readFileSync(join(CACHE_DIR, `${key}.json`), "utf-8");
    const envelope: CacheEnvelope<T> = JSON.parse(raw);
    if (Date.now() - envelope.cachedAt > ttlMs) return null;
    return envelope.data;
  } catch {
    return null;
  }
}

/**
 * Read from file cache ignoring TTL — returns data even if expired.
 * Used as a last-resort fallback when both network and fresh cache miss.
 */
export function readFileCacheStale<T>(key: string): T | null {
  try {
    const raw = readFileSync(join(CACHE_DIR, `${key}.json`), "utf-8");
    const envelope: CacheEnvelope<T> = JSON.parse(raw);
    return envelope.data;
  } catch {
    return null;
  }
}

export function writeFileCache<T>(key: string, data: T): void {
  try {
    ensureDir();
    const envelope: CacheEnvelope<T> = { data, cachedAt: Date.now() };
    writeFileSync(join(CACHE_DIR, `${key}.json`), JSON.stringify(envelope));
  } catch {
    // Best-effort — don't let cache writes break the request
  }

  // Lazily clean up old files (at most once per hour)
  cleanupFileCache();
}

/**
 * Remove .json files older than 48 hours from the cache directory.
 * Throttled to run at most once per hour.
 */
export function cleanupFileCache(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  try {
    const files = readdirSync(CACHE_DIR);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const filePath = join(CACHE_DIR, file);
      try {
        const stat = statSync(filePath);
        if (now - stat.mtimeMs > STALE_FILE_AGE_MS) {
          unlinkSync(filePath);
        }
      } catch {
        // Skip files we can't stat/delete
      }
    }
  } catch {
    // Best-effort — don't let cleanup break the request
  }
}
