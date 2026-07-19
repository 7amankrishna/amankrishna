import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { BlockRenderer } from "@/components/blog/block-renderer";
import type { Post } from "@/lib/posts";
import { SITE } from "@/lib/utils";
import { ArrowLeft, CalendarDays } from "lucide-react";

export const revalidate = 300;

type Params = Promise<{ slug: string }>;

async function getPost(slug: string): Promise<Post | null> {
  if (!supabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .single();
  return (data as Post) ?? null;
}

/** Per-article SEO: title, description, canonical permalink, OG/Twitter. */
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Article not found" };

  const title = post.seo_title || post.title;
  const description = post.seo_description || post.excerpt || undefined;
  const url = `${SITE.url}/blog/${post.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      publishedTime: post.published_at ?? undefined,
      authors: [SITE.name],
      ...(post.cover_image && { images: [{ url: post.cover_image }] }),
    },
    twitter: {
      card: post.cover_image ? "summary_large_image" : "summary",
      title,
      description,
      ...(post.cover_image && { images: [post.cover_image] }),
    },
  };
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <Link
        href="/blog"
        className="mb-10 inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="size-4" /> All articles
      </Link>

      <article>
        <header className="mb-10">
          <div className="mb-3 flex items-center gap-2 font-mono text-xs text-muted">
            <CalendarDays className="size-3.5" />
            {post.published_at &&
              new Date(post.published_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="mt-4 text-lg leading-relaxed text-muted">{post.excerpt}</p>
          )}
          {post.cover_image && (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote URLs
            <img
              src={post.cover_image}
              alt=""
              className="mt-8 w-full rounded-2xl border border-line"
            />
          )}
        </header>

        <BlockRenderer blocks={post.blocks} />
      </article>

      <footer className="mt-16 border-t border-line pt-8">
        <p className="text-sm text-muted">
          Written by <span className="text-fg">{SITE.name}</span> —{" "}
          <Link href="/#contact" className="text-cyan hover:underline">
            get in touch
          </Link>
        </p>
      </footer>
    </main>
  );
}
