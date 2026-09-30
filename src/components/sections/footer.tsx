import { SITE } from "@/lib/utils";
import Link from "next/link";
import type { PortfolioSettings } from "@/lib/portfolio-types";
export function Footer({ settings }: { settings?: PortfolioSettings }) {
  return <footer className="border-t border-line"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-10 font-mono text-xs text-muted"><p>© {new Date().getFullYear()} {settings?.profile.name ?? SITE.name}</p><p className="text-fg">aman / digital lab</p><div className="flex flex-wrap gap-5">{settings?.socials.map((s) => <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="hover:text-fg">{s.label} ↗</a>)}<Link href="/blog" className="hover:text-fg">Writing ↗</Link><a href="#home">Back to top ↑</a></div></div></footer>;
}
