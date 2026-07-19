import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes without conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Site-wide constants used across sections, metadata and the command palette. */
export const SITE = {
  name: "Aman Krishna",
  role: "B.Tech Computer Science Engineering Student",
  tagline: "AI • Machine Learning • Full Stack Development • Problem Solver",
  url: "https://amankrishna.vercel.app",
  email: "7amankrishna@gmail.com",
  github: "https://github.com/7amankrishna",
  githubUser: "7amankrishna",
  linkedin: "https://in.linkedin.com/in/7amankrishna",
} as const;
