/**
 * Serialize a JSON-LD object for inlining inside a <script
 * type="application/ld+json"> tag.
 *
 * Plain JSON.stringify is unsafe here: any string field that contains
 * "</script>" (or the HTML5 equivalent sequences "<!--", "-->") will
 * break out of the script tag and land in HTML context, enabling XSS
 * when the data comes from a DB field, Google Places review, or
 * Sanity body that wasn't authored by a trusted admin.
 *
 * We replace the offending bytes with their \\uXXXX escapes, which
 * JSON.parse decodes back to the same characters — so structured-data
 * consumers (Google, Bing) see the original string, but the HTML
 * parser never sees a closing tag.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
