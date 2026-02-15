import { readFileSync, writeFileSync, mkdirSync } from "fs";
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

type CacheEnvelope<T> = { data: T; cachedAt: number };

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

export function writeFileCache<T>(key: string, data: T): void {
  try {
    ensureDir();
    const envelope: CacheEnvelope<T> = { data, cachedAt: Date.now() };
    writeFileSync(join(CACHE_DIR, `${key}.json`), JSON.stringify(envelope));
  } catch {
    // Best-effort — don't let cache writes break the request
  }
}
