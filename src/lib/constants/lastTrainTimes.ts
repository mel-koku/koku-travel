/**
 * Last train departure times by city (minutes since midnight).
 * Used to warn travelers about evening activities that may strand them.
 *
 * Times represent the approximate last departure from major stations
 * on the city's primary transit network.
 */
export const LAST_TRAIN_TIMES: Record<string, number> = {
  tokyo: 1470,      // 00:30
  osaka: 1455,      // 00:15
  kyoto: 1410,      // 23:30
  nagoya: 1425,     // 23:45
  sapporo: 1440,    // 00:00
  fukuoka: 1440,    // 00:00
  hiroshima: 1410,  // 23:30
  sendai: 1410,     // 23:30
  yokohama: 1455,   // 00:15
  kobe: 1440,       // 00:00
  nara: 1395,       // 23:15
  kanazawa: 1380,   // 23:00
  nagasaki: 1380,   // 23:00
  hakodate: 1350,   // 22:30
  matsuyama: 1380,  // 23:00
  takamatsu: 1380,  // 23:00
  naha: 1395,       // 23:15 — Yui Rail monorail
};

/**
 * Format minutes-since-midnight to a 24-hour time string (e.g., "23:30").
 */
export function formatLastTrainTime(minutes: number): string {
  const hours24 = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours24.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}
