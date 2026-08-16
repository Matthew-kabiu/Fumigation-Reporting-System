/**
 * Serializes structured data for a `<script type="application/ld+json">` tag.
 *
 * `JSON.stringify` alone is not safe in an HTML script sink: a value containing
 * `</script>` would close the tag early and let the remainder parse as markup.
 * Escaping `<`, `>`, and `&` to their unicode forms keeps the JSON byte-for-byte
 * equivalent for parsers while making tag-breakout impossible.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
