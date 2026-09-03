/**
 * SEO pass for the metadata / JSON-LD layer (steps 5–9 of the handoff).
 *
 * Asserts the three rules those modules are written to: nothing is invented,
 * every URL is on the canonical domain, and author-controlled strings cannot
 * break out of a `<script>` element.
 */
import assert from "node:assert/strict";
import {
  blogJsonLd,
  blogPostingJsonLd,
  breadcrumbJsonLd,
  graph,
  personJsonLd,
  serializeJsonLd,
  websiteJsonLd,
} from "../src/lib/seo/jsonld.ts";
import {
  articleCanonical,
  articleMetadata,
  articleShareImage,
  resolveArticleSeo,
} from "../src/lib/seo/metadata.ts";
import { AUTHOR_SAME_AS, SITE, absoluteUrl, postUrl } from "../src/lib/site.ts";

let passed = 0;
const failures = [];

function it(name, fn) {
  try {
    fn();
    passed++;
  } catch (error) {
    failures.push({ name, message: error.message });
  }
}

/** A published article with every optional field empty. */
const bare = {
  slug: "hello-world",
  title: "Hello World",
  excerpt: null,
  blocks: [],
  content_html: "<p>Some body copy for the word count.</p>",
  seo_title: null,
  seo_description: null,
  canonical_url: null,
  og_title: null,
  og_description: null,
  og_image: null,
  twitter_title: null,
  twitter_description: null,
  cover_image: null,
  tags: [],
  robots_index: "index",
  robots_follow: "follow",
  published_at: "2026-01-15T10:00:00.000Z",
  updated_at: "2026-02-01T10:00:00.000Z",
};

/* ---- canonical URLs ------------------------------------------------------ */

it("permalink is on the canonical domain", () => {
  assert.equal(articleCanonical(bare), "https://amankrishna.in/blog/hello-world");
});

it("an explicit canonical is respected", () => {
  const url = articleCanonical({ ...bare, canonical_url: "https://dev.to/x/y" });
  assert.equal(url, "https://dev.to/x/y");
});

it("a relative canonical becomes absolute", () => {
  assert.equal(articleCanonical({ ...bare, canonical_url: "/blog/other" }), "https://amankrishna.in/blog/other");
});

it("absoluteUrl leaves an absolute URL alone", () => {
  assert.equal(absoluteUrl("https://x.test/a"), "https://x.test/a");
  assert.equal(absoluteUrl("/a"), "https://amankrishna.in/a");
  assert.equal(absoluteUrl("a"), "https://amankrishna.in/a");
});

it("no VERCEL_URL anywhere in the resolved identity", () => {
  const blob = JSON.stringify({ SITE, sameAs: AUTHOR_SAME_AS });
  assert.ok(!blob.includes("vercel.app"), blob);
  assert.ok(SITE.url.startsWith("https://"), SITE.url);
});

/* ---- share image --------------------------------------------------------- */

it("no share image means null, not a stand-in", () => {
  assert.equal(articleShareImage(bare), null);
});

it("cover image is the fallback for og_image", () => {
  assert.equal(
    articleShareImage({ ...bare, cover_image: "/img/a.png" }),
    "https://amankrishna.in/img/a.png",
  );
});

it("og_image wins over cover_image", () => {
  assert.equal(
    articleShareImage({ ...bare, og_image: "https://cdn.test/a.png", cover_image: "/img/b.png" }),
    "https://cdn.test/a.png",
  );
});

/* ---- Metadata ------------------------------------------------------------ */

it("title is absolute so the layout template cannot double the suffix", () => {
  const meta = articleMetadata(bare);
  assert.equal(typeof meta.title, "object");
  assert.equal(meta.title.absolute, resolveArticleSeo(bare).title);
});

it("openGraph.images is omitted, not empty, when there is no image", () => {
  const meta = articleMetadata(bare);
  assert.ok(!("images" in meta.openGraph), JSON.stringify(meta.openGraph));
});

it("openGraph.images is present when the article has one", () => {
  const meta = articleMetadata({ ...bare, og_image: "https://cdn.test/a.png" });
  assert.ok(meta.openGraph.images, "expected an images entry");
});

it("og:site_name is the publication, not the person", () => {
  assert.equal(articleMetadata(bare).openGraph.siteName, "AmanKrishna.in");
});

it("noindex/nofollow reach the robots object", () => {
  const meta = articleMetadata({ ...bare, robots_index: "noindex", robots_follow: "nofollow" });
  assert.equal(meta.robots.index, false);
  assert.equal(meta.robots.follow, false);
});

it("canonical is declared per article", () => {
  assert.equal(articleMetadata(bare).alternates.canonical, "https://amankrishna.in/blog/hello-world");
});

/* ---- JSON-LD ------------------------------------------------------------- */

const node = blogPostingJsonLd({
  slug: bare.slug,
  headline: "Hello World",
  description: "",
  canonical: postUrl(bare.slug),
  image: null,
  datePublished: null,
  dateModified: null,
  tags: [],
  bodyHtml: "<p>one two three four five</p>",
});

it("a missing date is omitted, never back-filled", () => {
  assert.ok(!("datePublished" in node), JSON.stringify(node));
  assert.ok(!("dateModified" in node), JSON.stringify(node));
});

it("a missing image is omitted rather than substituted", () => {
  assert.ok(!("image" in node), JSON.stringify(node));
});

it("an empty description is omitted", () => {
  assert.ok(!("description" in node), JSON.stringify(node));
});

it("word count and reading time come from the real body", () => {
  assert.equal(node.wordCount, 5);
  assert.match(String(node.timeRequired), /^PT\d+M$/);
});

it("author and publisher are @id references to one Person", () => {
  assert.equal(node.author["@id"], personJsonLd()["@id"]);
  assert.equal(node.publisher["@id"], personJsonLd()["@id"]);
});

it("the article is part of the blog node", () => {
  assert.equal(node.isPartOf["@id"], blogJsonLd()["@id"]);
});

it("sameAs is exactly the two verified profiles", () => {
  assert.deepEqual(personJsonLd().sameAs, [...AUTHOR_SAME_AS]);
  assert.equal(personJsonLd().sameAs.length, 2);
});

it("breadcrumb positions are 1-based and in order", () => {
  const list = breadcrumbJsonLd([
    { name: "Home", url: SITE.url },
    { name: "Blog", url: `${SITE.url}/blog` },
  ]);
  assert.deepEqual(
    list.itemListElement.map((step) => step.position),
    [1, 2],
  );
});

it("the graph carries one @context and every node", () => {
  const doc = graph(websiteJsonLd(), personJsonLd(), node);
  assert.equal(doc["@context"], "https://schema.org");
  assert.equal(doc["@graph"].length, 3);
});

it("no vercel.app can appear in a published graph", () => {
  const doc = JSON.stringify(graph(websiteJsonLd(), personJsonLd(), blogJsonLd(), node));
  assert.ok(!doc.includes("vercel.app"), doc);
});

/* ---- script breakout ----------------------------------------------------- */

it("a hostile headline cannot close the script element", () => {
  const hostile = blogPostingJsonLd({
    slug: "x",
    headline: '</script><script>alert(1)</script>',
    description: "a & b <c>",
    canonical: postUrl("x"),
    image: null,
    datePublished: null,
    dateModified: null,
    tags: ['</script>'],
    bodyHtml: "<p>a</p>",
  });
  const out = serializeJsonLd(graph(hostile));

  assert.ok(!out.includes("</script"), out);
  assert.ok(!out.includes("<"), out);
  assert.ok(!out.includes(">"), out);
  assert.ok(!out.includes("&"), out);
  // Still valid JSON that parses back to the same value.
  assert.equal(JSON.parse(out)["@graph"][0].headline, '</script><script>alert(1)</script>');
});

/* ---- report -------------------------------------------------------------- */

console.log(`passed: ${passed}`);
if (failures.length) {
  console.log(`FAILED: ${failures.length}`);
  for (const f of failures) console.log(`\n  ${f.name}\n    ${f.message}`);
  process.exit(1);
}
console.log("all SEO assertions passed");
