/**
 * Parse a duration string into minutes.
 * Handles both plain integer (minutes) and legacy text formats
 * like "2 hours", "90 minutes", "1 day".
 */
export function parseDuration(value?: string): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  // After normalization, most durations are plain integers (minutes)
  const asInt = parseInt(trimmed, 10);
  if (!isNaN(asInt) && String(asInt) === trimmed) return asInt;
  // Legacy text formats (backward compat)
  const normalized = trimmed.toLowerCase();
  const match = normalized.match(
    /([0-9]+(?:\.[0-9]+)?)\s*(hour|hours|hr|hrs|minute|minutes|day|days)/
  );
  if (!match || !match[1] || !match[2]) return null;
  const amount = Number.parseFloat(match[1]);
  if (Number.isNaN(amount)) return null;
  const unit = match[2];
  if (unit.startsWith("day")) return amount * 24 * 60;
  if (unit.startsWith("hour") || unit.startsWith("hr")) return amount * 60;
  if (unit.startsWith("minute")) return amount;
  return null;
}
