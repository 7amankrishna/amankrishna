"use client";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import type { HomepageSection, PortfolioSettings } from "@/lib/portfolio-types";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
const HeroScene = dynamic(() => import("@/components/hero/hero-scene"), { ssr: false });

export function Hero({ data, section }: { data: PortfolioSettings; section?: HomepageSection }) {
  const [scene, setScene] = useState(false);
  useEffect(() => { const media = window.matchMedia("(min-width: 1024px) and (prefers-reduced-motion: no-preference)"); const update = () => setScene(media.matches && data.appearance.show3d && data.appearance.motion); update(); media.addEventListener("change", update); return () => media.removeEventListener("change", update); }, [data.appearance.show3d, data.appearance.motion]);
  const anchor = (url: string) => url.startsWith("#") ? `/#${url.slice(1)}` : url;
  return <section id="home" className="editorial-hero">{scene && <div className="pointer-events-none absolute right-0 top-20 -z-10 h-64 w-64 opacity-20" aria-hidden="true"><HeroScene /></div>}{data.hero.image && <SafeImage src={data.hero.image} alt={data.hero.imageAlt || data.profile.name} />}<div className="hero-rule" /><p className="eyebrow">{section?.label || data.hero.eyebrow}</p><h1>{data.hero.heading || section?.heading || data.profile.name}</h1><p className="hero-subtitle">{data.hero.subtitle}</p><div className="hero-bottom"><p>{data.hero.description}</p><div className="flex flex-wrap gap-3">{data.hero.primaryUrl && <a className="button button-fill" href={anchor(data.hero.primaryUrl)}>{data.hero.primaryLabel}<ArrowUpRight className="size-4" /></a>}{data.hero.secondaryUrl && <a className="button" href={anchor(data.hero.secondaryUrl)}>{data.hero.secondaryLabel}</a>}</div></div>{data.hero.status && <p className="hero-status">{data.hero.status}</p>}{data.hero.annotation && <p className="hero-annotation">{data.hero.annotation}</p>}<a href="#about" className="hero-scroll" aria-label="Scroll to about"><ArrowDown className="size-4" /></a></section>;
}

function SafeImage({ src, alt }: { src: string; alt: string }) { if (!/^https?:\/\//i.test(src) && !src.startsWith("/")) return null; /* eslint-disable-next-line @next/next/no-img-element -- CMS media */ return <img src={src} alt={alt} loading="lazy" decoding="async" className="hero-image" />; }
