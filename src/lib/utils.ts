import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { SITE as SITE_CONFIG } from "@/lib/site";

/** Merge Tailwind classes without conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Flat, person-centric view of the site config used by the portfolio sections,
 * navbar, command palette and footer.
 *
 * These are *derived* values — the single source of truth is
 * `src/lib/site.ts`. Edit that file; never hardcode the domain or profile
 * URLs here or in components.
 */
export const SITE = {
  name: SITE_CONFIG.author.name,
  role: SITE_CONFIG.author.jobTitle,
  tagline: SITE_CONFIG.tagline,
  url: SITE_CONFIG.url,
  email: SITE_CONFIG.author.email,
  github: SITE_CONFIG.author.github,
  githubUser: SITE_CONFIG.author.githubUser,
  linkedin: SITE_CONFIG.author.linkedin,
} as const;
