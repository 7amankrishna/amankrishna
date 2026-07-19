import type { Block } from "@/lib/posts";

/** Render an article's block array as semantic HTML. Server component. */
export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-6">
      {blocks.map((b) => {
        switch (b.type) {
          case "heading":
            return b.meta?.level === 3 ? (
              <h3 key={b.id} className="mt-10 text-xl font-semibold tracking-tight">
                {b.content}
              </h3>
            ) : (
              <h2 key={b.id} className="mt-12 text-2xl font-semibold tracking-tight">
                {b.content}
              </h2>
            );
          case "paragraph":
            return (
              <p key={b.id} className="leading-relaxed text-muted">
                {b.content}
              </p>
            );
          case "image":
            return b.content ? (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote URLs
              <img
                key={b.id}
                src={b.content}
                alt={b.meta?.alt ?? ""}
                loading="lazy"
                className="w-full rounded-2xl border border-line"
              />
            ) : null;
          case "code":
            return (
              <pre
                key={b.id}
                className="overflow-x-auto rounded-2xl border border-line bg-ink-2 p-5 font-mono text-sm leading-relaxed"
              >
                <code data-lang={b.meta?.lang}>{b.content}</code>
              </pre>
            );
          case "quote":
            return (
              <blockquote
                key={b.id}
                className="border-l-2 border-violet pl-5 text-lg italic leading-relaxed"
              >
                {b.content}
              </blockquote>
            );
          case "list":
            return (
              <ul key={b.id} className="list-disc space-y-2 pl-6 text-muted">
                {(b.meta?.items ?? []).filter(Boolean).map((item, i) => (
                  <li key={i} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            );
          case "divider":
            return <hr key={b.id} className="border-line" />;
          default:
            return null;
        }
      })}
    </div>
  );
}
