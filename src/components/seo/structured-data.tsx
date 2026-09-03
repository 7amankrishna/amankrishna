import { serializeJsonLd, type JsonLd } from "@/lib/seo/jsonld";

/**
 * Emit a JSON-LD document as a `<script type="application/ld+json">`.
 *
 * The escaping that makes this safe lives in `serializeJsonLd` — see the note
 * there for why `<`, `>` and `&` must not reach the HTML parser intact.
 */
export function StructuredData({ id, data }: { id: string; data: JsonLd }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      // Serialised JSON with `<`, `>` and `&` escaped — see `serializeJsonLd`.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
