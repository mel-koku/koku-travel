/**
 * Client-side regex-based flight details parser.
 * Extracts airport codes, times, airlines, and flight numbers from pasted text.
 */

export type ParsedFlight = {
  iataCode?: string;
  time?: string; // HH:MM 24h
  airline?: string;
  flightNumber?: string;
  confidence: number; // 0-1
};

export type ParseFlightResult = {
  arrival?: ParsedFlight;
  departure?: ParsedFlight;
};

type KnownAirport = {
  iataCode: string;
  name: string;
  city: string;
};

/** Common airline 2-letter codes → display names */
const AIRLINE_CODES: Record<string, string> = {
  NH: "ANA",
  JL: "JAL",
  UA: "United",
  AA: "American",
  DL: "Delta",
  BA: "British Airways",
  SQ: "Singapore Airlines",
  CX: "Cathay Pacific",
  QF: "Qantas",
  EK: "Emirates",
  TG: "Thai Airways",
  KE: "Korean Air",
  OZ: "Asiana",
  CI: "China Airlines",
  BR: "EVA Air",
  MH: "Malaysia Airlines",
  PR: "Philippine Airlines",
  VN: "Vietnam Airlines",
  CA: "Air China",
  MU: "China Eastern",
  CZ: "China Southern",
  HX: "Hong Kong Airlines",
  MM: "Peach Aviation",
  GK: "Jetstar Japan",
  BC: "Skymark",
  "7G": "StarFlyer",
  JW: "Vanilla Air",
  NU: "Japan Transocean Air",
};

/** Keywords that indicate arrival */
const ARRIVAL_KEYWORDS = [
  "arriv", "land", "touch down", "inbound", "into japan", "into nrt",
  "into hnd", "into kix", "into cts", "into fuk", "into oka", "into ngo",
  "arriving", "landing", "到着",
];

/** Keywords that indicate departure */
const DEPARTURE_KEYWORDS = [
  "depart", "return", "leav", "takeoff", "take off", "outbound",
  "from japan", "from nrt", "from hnd", "from kix", "home",
  "departing", "leaving", "出発",
];

/**
 * Match an IATA code from text against known airports.
 * Tries: exact 3-letter uppercase match, then airport name/city fuzzy match.
 */
function matchAirport(
  text: string,
  knownAirports: KnownAirport[],
): string | undefined {
  const upper = text.toUpperCase();

  // 1. Direct 3-letter IATA match
  const iataMatches = upper.match(/\b([A-Z]{3})\b/g);
  if (iataMatches) {
    for (const code of iataMatches) {
      if (knownAirports.some((a) => a.iataCode === code)) {
        return code;
      }
    }
  }

  // 2. Airport name fuzzy match
  const lower = text.toLowerCase();
  for (const airport of knownAirports) {
    const nameTokens = [
      airport.name.toLowerCase(),
      airport.city.toLowerCase(),
    ];
    // Also match short names like "narita", "haneda", "kansai", "chitose"
    const shortNames = airport.name
      .toLowerCase()
      .replace(/\b(international|airport|domestic|new)\b/g, "")
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 3);

    for (const token of [...nameTokens, ...shortNames]) {
      if (token && lower.includes(token)) {
        return airport.iataCode;
      }
    }
  }

  return undefined;
}

/**
 * Extract time from text, handling both 24h and 12h formats.
 * Returns HH:MM in 24h format.
 */
function extractTime(text: string): string | undefined {
  // 12h format: 2:30 PM, 2:30PM, 2:30 pm
  const match12 = text.match(
    /\b(\d{1,2}):(\d{2})\s*(am|pm|AM|PM|a\.m\.|p\.m\.)\b/,
  );
  if (match12) {
    let hours = parseInt(match12[1]!, 10);
    const minutes = parseInt(match12[2]!, 10);
    const period = match12[3]!.toLowerCase().replace(/\./g, "");
    if (period === "pm" && hours < 12) hours += 12;
    if (period === "am" && hours === 12) hours = 0;
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    }
  }

  // 24h format: 14:30, 9:00
  const match24 = text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (match24) {
    const hours = parseInt(match24[1]!, 10);
    const minutes = parseInt(match24[2]!, 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    }
  }

  return undefined;
}

/**
 * Extract flight number (airline code + digits) from text.
 * Returns { airline, flightNumber } if found.
 */
function extractFlightNumber(
  text: string,
): { airline?: string; flightNumber?: string } | undefined {
  // Match patterns like: NH203, NH 203, JL 5, UA837
  const match = text.match(
    /\b([A-Z]{2}|\d[A-Z])\s*(\d{1,4})\b/i,
  );
  if (!match) return undefined;

  const code = match[1]!.toUpperCase();
  const number = match[2]!;
  const fullFlightNumber = `${code}${number}`;
  const airlineName = AIRLINE_CODES[code] || code;

  return { airline: airlineName, flightNumber: fullFlightNumber };
}

/**
 * Determine if a text segment refers to arrival or departure.
 */
function detectDirection(
  text: string,
): "arrival" | "departure" | "unknown" {
  const lower = text.toLowerCase();
  const hasArrival = ARRIVAL_KEYWORDS.some((kw) => lower.includes(kw));
  const hasDeparture = DEPARTURE_KEYWORDS.some((kw) => lower.includes(kw));

  if (hasArrival && !hasDeparture) return "arrival";
  if (hasDeparture && !hasArrival) return "departure";
  return "unknown";
}

/**
 * Parse pasted flight details text and extract arrival/departure information.
 *
 * Handles various formats:
 * - "NH 203 NRT 14:30"
 * - "Landing Narita 2:30 PM"
 * - "Arrive NRT 14:30, Depart KIX 18:00"
 * - Multi-line with separate arrival/departure
 */
export function parseFlightDetails(
  text: string,
  knownAirports: KnownAirport[],
): ParseFlightResult {
  if (!text || !text.trim()) {
    return {};
  }

  // Split by common delimiters: newlines, semicolons, " / ", or arrival/departure keywords
  const segments = text
    .split(/[\n;]|(?:\s*\/\s*)|\s*(?:,)\s*(?=\S)/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // If only one segment, try splitting on direction keywords
  const processedSegments: string[] = [];
  for (const seg of segments) {
    const lower = seg.toLowerCase();
    // Check if segment has both arrival and departure keywords
    const arrIdx = ARRIVAL_KEYWORDS.reduce(
      (min, kw) => {
        const idx = lower.indexOf(kw);
        return idx !== -1 && (min === -1 || idx < min) ? idx : min;
      },
      -1,
    );
    const depIdx = DEPARTURE_KEYWORDS.reduce(
      (min, kw) => {
        const idx = lower.indexOf(kw);
        return idx !== -1 && (min === -1 || idx < min) ? idx : min;
      },
      -1,
    );

    if (arrIdx !== -1 && depIdx !== -1) {
      // Both present — split at the second keyword
      const splitIdx = Math.max(arrIdx, depIdx);
      processedSegments.push(seg.slice(0, splitIdx).trim());
      processedSegments.push(seg.slice(splitIdx).trim());
    } else {
      processedSegments.push(seg);
    }
  }

  const finalSegments = processedSegments.filter((s) => s.length > 0);

  // Parse each segment
  const parsed: Array<{
    direction: "arrival" | "departure" | "unknown";
    iataCode?: string;
    time?: string;
    airline?: string;
    flightNumber?: string;
  }> = [];

  for (const seg of finalSegments) {
    const direction = detectDirection(seg);
    const iataCode = matchAirport(seg, knownAirports);
    const time = extractTime(seg);
    const flight = extractFlightNumber(seg);

    // Only include if we found something useful
    if (iataCode || time || flight) {
      parsed.push({
        direction,
        iataCode,
        time,
        airline: flight?.airline,
        flightNumber: flight?.flightNumber,
      });
    }
  }

  if (parsed.length === 0) return {};

  // Assign arrival / departure
  const result: ParseFlightResult = {};

  if (parsed.length === 1) {
    const p = parsed[0]!;
    const dir = p.direction === "unknown" ? "arrival" : p.direction;
    const confidence = calculateConfidence(p);
    result[dir] = {
      iataCode: p.iataCode,
      time: p.time,
      airline: p.airline,
      flightNumber: p.flightNumber,
      confidence,
    };
  } else {
    // Multiple segments — assign by detected direction, or first=arrival, second=departure
    const arrivals = parsed.filter((p) => p.direction === "arrival");
    const departures = parsed.filter((p) => p.direction === "departure");
    const unknowns = parsed.filter((p) => p.direction === "unknown");

    const arrivalSeg = arrivals[0] || unknowns[0];
    const departureSeg = departures[0] || unknowns[1] || unknowns[0];

    if (arrivalSeg) {
      result.arrival = {
        iataCode: arrivalSeg.iataCode,
        time: arrivalSeg.time,
        airline: arrivalSeg.airline,
        flightNumber: arrivalSeg.flightNumber,
        confidence: calculateConfidence(arrivalSeg),
      };
    }

    if (departureSeg && departureSeg !== arrivalSeg) {
      result.departure = {
        iataCode: departureSeg.iataCode,
        time: departureSeg.time,
        airline: departureSeg.airline,
        flightNumber: departureSeg.flightNumber,
        confidence: calculateConfidence(departureSeg),
      };
    }
  }

  return result;
}

function calculateConfidence(p: {
  iataCode?: string;
  time?: string;
  flightNumber?: string;
}): number {
  let score = 0;
  if (p.iataCode) score += 0.4;
  if (p.time) score += 0.35;
  if (p.flightNumber) score += 0.25;
  return Math.min(score, 1);
}

/**
 * Format a parsed flight for display.
 * e.g. "NRT, landing 14:30, NH203"
 */
export function formatParsedFlight(
  parsed: ParsedFlight,
  direction: "arrival" | "departure",
): string {
  const parts: string[] = [];
  if (parsed.iataCode) parts.push(parsed.iataCode);
  if (parsed.time) {
    const verb = direction === "arrival" ? "landing" : "departing";
    parts.push(`${verb} ${parsed.time}`);
  }
  if (parsed.flightNumber) parts.push(parsed.flightNumber);
  return parts.join(", ");
}
