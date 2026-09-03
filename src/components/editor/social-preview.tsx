"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { SITE } from "@/lib/site";

/**
 * How the article looks when someone pastes the link somewhere.
 *
 * Both cards are driven by the *resolved* values, so the Twitter card inherits
 * from Open Graph exactly the way Twitter itself does when the `twitter:*` tags
 * are absent. Seeing the inherited text is the point — an author who leaves the
 * Twitter fields blank should be able to confirm that something sensible still
 * ships, rather than guessing.
 *
 * Images are rendered with a plain `<img>`: these are arbitrary author-supplied
 * absolute URLs on an admin-only page, and running them through the image
 * optimiser would mean whitelisting every host anyone might ever use.
 */

export function SocialPreview({
  ogTitle,
  ogDescription,
  twitterTitle,
  twitterDescription,
  image,
  slug,
  /** True when `image` is the automatic fallback rather than an author's URL. */
  imageIsGenerated,
}: {
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
  image: string;
  slug: string;
  imageIsGenerated: boolean;
}) {
  return (
    <section aria-label="Social card preview" className="space-y-3">
      <h3 className="text-sm font-medium">Social cards</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card
          platform="Facebook · LinkedIn"
          title={ogTitle}
          description={ogDescription}
          image={image}
          host={SITE.host}
          slug={slug}
          showDescription
        />
        {/* X crops to the same 1.91:1 frame for `summary_large_image` but drops
            the description once the title is long, so it gets its own card
            rather than sharing one and implying they render identically. */}
        <Card
          platform="X · Twitter"
          title={twitterTitle}
          description={twitterDescription}
          image={image}
          host={SITE.host}
          slug={slug}
          showDescription={false}
        />
      </div>

      <p className="text-xs text-muted">
        {imageIsGenerated
          ? "No image set, so the automatically generated 1200×630 card is used."
          : "Using the Open Graph image you set. 1200×630 renders without cropping."}{" "}
        Platforms cache these aggressively — a change can take a re-scrape to
        show up.
      </p>
    </section>
  );
}

function Card({
  platform,
  title,
  description,
  image,
  host,
  slug,
  showDescription,
}: {
  platform: string;
  title: string;
  description: string;
  image: string;
  host: string;
  slug: string;
  showDescription: boolean;
}) {
  const [broken, setBroken] = useState(false);

  return (
    <figure className="overflow-hidden rounded-2xl border border-line bg-ink-2">
      <figcaption className="border-b border-line px-3 py-1.5 text-[0.65rem] uppercase tracking-wide text-muted">
        {platform}
      </figcaption>

      <div className="relative aspect-[1.91/1] bg-ink">
        {broken || !image ? (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-xs text-muted">
            <ImageOff className="size-5" aria-hidden />
            {image ? "Image failed to load" : "No image"}
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary author URL on an admin-only preview
          <img
            src={image}
            alt=""
            className="size-full object-cover"
            onError={() => setBroken(true)}
          />
        )}
      </div>

      <div className="space-y-1 px-3 py-2.5">
        <p className="truncate text-[0.7rem] uppercase tracking-wide text-muted">
          {host}
          {slug ? `/blog/${slug}` : ""}
        </p>
        <p className="line-clamp-2 text-sm font-medium leading-snug">
          {title || "Untitled article"}
        </p>
        {showDescription && (
          <p className="line-clamp-2 text-xs text-muted">
            {description || "No description"}
          </p>
        )}
      </div>
    </figure>
  );
}
