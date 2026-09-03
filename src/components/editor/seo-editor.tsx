"use client";

import { Globe, Search, Share2 } from "lucide-react";
import type { RobotsFollow, RobotsIndex } from "@/lib/posts";
import { SEO_LENGTHS, lengthNote, resolveSeo } from "@/lib/seo/fields";
import { runChecklist } from "@/lib/seo/checklist";
import { GoogleSearchPreview } from "@/components/editor/google-search-preview";
import { SeoChecklist } from "@/components/editor/seo-checklist";
import { SocialPreview } from "@/components/editor/social-preview";
import { cn } from "@/lib/utils";

/**
 * The SEO half of the article form: every tag an author can set, the previews
 * that show what those tags do, and the checklist.
 *
 * Two decisions worth stating outright.
 *
 * **Nothing here has a `maxLength`.** The old form capped the SEO title at 60
 * characters and the description at 160, which silently ate the end of a
 * pasted sentence. Those numbers are pixel-width heuristics for *one* search
 * engine's *current* layout; enforcing them in the input turns a guideline into
 * data loss. The counters below say the same thing without touching the value.
 *
 * **The previews read resolved values, not raw fields.** An empty `twitter:title`
 * inherits from `og:title`, which inherits from the page title — so that is what
 * the card shows. The author sees the tag that will actually ship.
 */

export type SeoFields = {
  seo_title: string;
  seo_description: string;
  canonical_url: string;
  og_title: string;
  og_description: string;
  og_image: string;
  twitter_title: string;
  twitter_description: string;
  robots_index: RobotsIndex;
  robots_follow: RobotsFollow;
};

export const EMPTY_SEO_FIELDS: SeoFields = {
  seo_title: "",
  seo_description: "",
  canonical_url: "",
  og_title: "",
  og_description: "",
  og_image: "",
  twitter_title: "",
  twitter_description: "",
  robots_index: "index",
  robots_follow: "follow",
};

const fieldClass =
  "w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-fg placeholder:text-muted/60 focus:border-violet/60 focus:outline-none";

const LEVEL_COLOURS = {
  empty: "text-muted/60",
  short: "text-amber-400",
  ok: "text-cyan",
  long: "text-amber-400",
} as const;

/**
 * One field, with a live counter and a note when the length is unusual.
 *
 * `range` is what makes the counter meaningful; fields without a comfortable
 * length (a URL, say) simply do not get one.
 */
function Field({
  name,
  label,
  hint,
  value,
  onChange,
  rows,
  placeholder,
  range,
  guidanceLabel,
  inputMode,
}: {
  name: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  range?: { min: number; max: number };
  guidanceLabel?: string;
  inputMode?: "url";
}) {
  const note = range ? lengthNote(value, range, guidanceLabel) : null;

  return (
    <label className="block">
      <span className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span className="text-sm text-muted">{label}</span>
        {note && (
          <span className={cn("font-mono text-xs", LEVEL_COLOURS[note.level])}>
            {note.count} / {range?.max}
          </span>
        )}
      </span>

      {rows ? (
        <textarea
          name={name}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`${fieldClass} resize-none`}
        />
      ) : (
        <input
          name={name}
          type={inputMode === "url" ? "url" : "text"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={fieldClass}
        />
      )}

      {note?.note ? (
        <span className="mt-1 block text-xs text-amber-400">{note.note}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-muted">{hint}</span>
      )}
    </label>
  );
}

/**
 * A two-option radio group rendered as a segmented control.
 *
 * Radio inputs rather than a `<select>` so both consequences are readable
 * without opening anything — "noindex" is a decision worth seeing before you
 * make it.
 */
function Choice<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
}: {
  name: string;
  label: string;
  value: T;
  options: readonly { value: T; label: string; detail: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm text-muted">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "cursor-pointer rounded-xl border px-3.5 py-2.5 transition-colors",
              value === option.value
                ? "border-violet/60 bg-violet/10"
                : "border-line hover:border-line/80",
            )}
          >
            <span className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                className="size-3.5 accent-[#7c5cff]"
              />
              {option.label}
            </span>
            <span className="mt-0.5 block pl-5.5 text-xs text-muted">
              {option.detail}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** A titled group with an icon, matching the form's other sections. */
function Group({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Search;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-violet" aria-hidden />
        {title}
      </h3>
      {children}
    </section>
  );
}

export function SeoEditor({
  fields,
  onChange,
  title,
  slug,
  excerpt,
  bodyHtml,
  tagCount,
  publishedAt,
  image,
  imageIsGenerated,
}: {
  fields: SeoFields;
  onChange: (patch: Partial<SeoFields>) => void;
  /** The article title — the fallback every title tag ultimately resolves to. */
  title: string;
  slug: string;
  excerpt: string;
  bodyHtml: string;
  tagCount: number;
  publishedAt: string | null;
  /** The share image that will actually be used, already resolved. */
  image: string;
  imageIsGenerated: boolean;
}) {
  const resolved = resolveSeo({
    title,
    seoTitle: fields.seo_title,
    seoDescription: fields.seo_description,
    excerpt,
    ogTitle: fields.og_title,
    ogDescription: fields.og_description,
    twitterTitle: fields.twitter_title,
    twitterDescription: fields.twitter_description,
    bodyHtml,
  });

  const checks = runChecklist({
    title,
    slug,
    resolvedTitle: resolved.title,
    resolvedDescription: resolved.description,
    hasOwnDescription: Boolean(fields.seo_description.trim()),
    excerpt,
    bodyHtml,
    canonicalUrl: fields.canonical_url.trim(),
    hasImage: Boolean(fields.og_image.trim()) || !imageIsGenerated,
    tagCount,
    noindex: fields.robots_index === "noindex",
    nofollow: fields.robots_follow === "nofollow",
  });

  return (
    <div className="space-y-8">
      <Group icon={Search} title="Search appearance">
        <Field
          name="seo_title"
          label="SEO title"
          value={fields.seo_title}
          onChange={(seo_title) => onChange({ seo_title })}
          placeholder={title || "Falls back to the article title"}
          range={SEO_LENGTHS.title}
          guidanceLabel="The SEO title"
          hint="Leave empty to use the article title."
        />
        <Field
          name="seo_description"
          label="Meta description"
          rows={3}
          value={fields.seo_description}
          onChange={(seo_description) => onChange({ seo_description })}
          placeholder="One or two sentences that answer what this article is for."
          range={SEO_LENGTHS.description}
          guidanceLabel="The description"
          hint="Leave empty to fall back to the excerpt."
        />

        <GoogleSearchPreview
          title={resolved.title}
          description={resolved.description}
          slug={slug}
          publishedAt={publishedAt}
          noindex={fields.robots_index === "noindex"}
        />
      </Group>

      <Group icon={Share2} title="Sharing">
        <Field
          name="og_image"
          label="Open Graph image URL"
          inputMode="url"
          value={fields.og_image}
          onChange={(og_image) => onChange({ og_image })}
          placeholder="https://… (1200×630)"
          hint="Leave empty to use the cover image, or the generated card if there is none."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            name="og_title"
            label="Open Graph title"
            value={fields.og_title}
            onChange={(og_title) => onChange({ og_title })}
            placeholder={resolved.title || "Falls back to the SEO title"}
          />
          <Field
            name="twitter_title"
            label="X / Twitter title"
            value={fields.twitter_title}
            onChange={(twitter_title) => onChange({ twitter_title })}
            placeholder={resolved.ogTitle || "Falls back to the OG title"}
          />
          <Field
            name="og_description"
            label="Open Graph description"
            rows={2}
            value={fields.og_description}
            onChange={(og_description) => onChange({ og_description })}
            placeholder={resolved.description || "Falls back to the meta description"}
          />
          <Field
            name="twitter_description"
            label="X / Twitter description"
            rows={2}
            value={fields.twitter_description}
            onChange={(twitter_description) => onChange({ twitter_description })}
            placeholder={resolved.ogDescription || "Falls back to the OG description"}
          />
        </div>

        <SocialPreview
          ogTitle={resolved.ogTitle}
          ogDescription={resolved.ogDescription}
          twitterTitle={resolved.twitterTitle}
          twitterDescription={resolved.twitterDescription}
          image={image}
          slug={slug}
          imageIsGenerated={imageIsGenerated}
        />
      </Group>

      <Group icon={Globe} title="Indexing">
        <Field
          name="canonical_url"
          label="Canonical URL"
          inputMode="url"
          value={fields.canonical_url}
          onChange={(canonical_url) => onChange({ canonical_url })}
          placeholder="Leave empty — the article's own URL is used"
          hint="Only set this if the same article is published elsewhere and that copy should rank."
        />

        <Choice<RobotsIndex>
          name="robots_index"
          label="Search engines"
          value={fields.robots_index}
          onChange={(robots_index) => onChange({ robots_index })}
          options={[
            { value: "index", label: "Index", detail: "Eligible for search results." },
            {
              value: "noindex",
              label: "No index",
              detail: "Kept out of results and out of the sitemap.",
            },
          ]}
        />

        <Choice<RobotsFollow>
          name="robots_follow"
          label="Links in this article"
          value={fields.robots_follow}
          onChange={(robots_follow) => onChange({ robots_follow })}
          options={[
            { value: "follow", label: "Follow", detail: "Crawlers may follow them." },
            {
              value: "nofollow",
              label: "No follow",
              detail: "Crawlers are told to ignore every link.",
            },
          ]}
        />
      </Group>

      <SeoChecklist checks={checks} />
    </div>
  );
}
