"use client";

import Image from "next/image";
import { Section, StaggerItem } from "@/components/ui/section";
import { MagneticButton } from "@/components/ui/magnetic-button";
import type { GitHubData } from "@/lib/github";
import { SITE } from "@/lib/utils";
import { Star, GitFork, Users, BookMarked } from "lucide-react";
import { Github } from "@/components/ui/brand-icons";

export function GitHubSection({ data }: { data: GitHubData }) {
  const { profile, repos, totalStars, languages } = data;

  return (
    <Section id="github" eyebrow="Open source / GitHub" title="The work, in the open.">
      {/* profile stat strip */}
      <StaggerItem>
        <div className="mb-6 flex flex-wrap items-center gap-6 border-y border-line py-6">
          {profile ? (
            <>
              <Image
                src={profile.avatar_url}
                alt={`${SITE.name}'s GitHub avatar`}
                width={64}
                height={64}
                className="rounded-full border border-line"
              />
              <div className="min-w-40">
                <p className="font-medium">{profile.name ?? profile.login}</p>
                <p className="font-mono text-sm text-muted">@{profile.login}</p>
              </div>
              <div className="flex flex-wrap gap-6 font-mono text-sm">
                <span className="flex items-center gap-2 text-muted">
                  <BookMarked className="size-4 text-violet" />
                  {profile.public_repos} repos
                </span>
                <span className="flex items-center gap-2 text-muted">
                  <Users className="size-4 text-blue" />
                  {profile.followers} followers
                </span>
                <span className="flex items-center gap-2 text-muted">
                  <Star className="size-4 text-cyan" />
                   {totalStars} recent-repo stars
                </span>
              </div>
            </>
          ) : (
            <p className="text-muted">
              GitHub data is loading slowly — visit the profile directly:
            </p>
          )}
          <div className="ms-auto">
            <MagneticButton href={SITE.github} variant="ghost">
              <Github className="size-4" /> View Profile
            </MagneticButton>
          </div>
        </div>
      </StaggerItem>

      {/* language chips */}
      {languages.length > 0 && (
        <StaggerItem>
          <div className="mb-6 flex flex-wrap gap-2">
            {languages.map((l) => (
              <span
                key={l}
                className="rounded-full border border-line bg-surface px-3 py-1 font-mono text-xs text-muted"
              >
                {l}
              </span>
            ))}
          </div>
        </StaggerItem>
      )}

      {/* latest repos */}
      <div className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
        {repos.map((r) => (
          <StaggerItem key={r.name}>
            <a
              href={r.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block h-full border-t border-line py-5 transition-colors hover:border-accent"
            >
              <div className="mb-2 flex items-center gap-2">
                <GitFork className="size-4 shrink-0 text-violet" />
                <h3 className="truncate font-mono text-sm font-medium">{r.name}</h3>
              </div>
              <p className="mb-4 line-clamp-2 text-sm text-muted">
                {r.description ?? "No description yet."}
              </p>
              <div className="flex items-center gap-4 font-mono text-xs text-muted">
                {r.language && <span>{r.language}</span>}
                <span className="flex items-center gap-1">
                  <Star className="size-3" /> {r.stargazers_count}
                </span>
              </div>
            </a>
          </StaggerItem>
        ))}
      </div>
    </Section>
  );
}
