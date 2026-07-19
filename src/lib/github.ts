import { SITE } from "@/lib/utils";

export type GitHubData = {
  profile: {
    login: string;
    name: string | null;
    avatar_url: string;
    public_repos: number;
    followers: number;
    html_url: string;
  } | null;
  repos: {
    name: string;
    html_url: string;
    description: string | null;
    stargazers_count: number;
    language: string | null;
    pushed_at: string;
  }[];
  totalStars: number;
  languages: string[];
};

/**
 * Fetch GitHub profile + latest repos server-side.
 * Revalidated hourly so the section stays fresh without hitting rate limits.
 * Fails soft: the section renders a fallback card if GitHub is unreachable.
 */
export async function fetchGitHub(): Promise<GitHubData> {
  const headers: HeadersInit = { Accept: "application/vnd.github+json" };
  const opts = { headers, next: { revalidate: 3600 } };

  try {
    const [profileRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${SITE.githubUser}`, opts),
      fetch(
        `https://api.github.com/users/${SITE.githubUser}/repos?sort=pushed&per_page=6`,
        opts,
      ),
    ]);
    if (!profileRes.ok || !reposRes.ok) throw new Error("GitHub API error");

    const profile = await profileRes.json();
    const repos: GitHubData["repos"] = await reposRes.json();
    const totalStars = repos.reduce((s, r) => s + (r.stargazers_count ?? 0), 0);
    const languages = [
      ...new Set(repos.map((r) => r.language).filter((l): l is string => !!l)),
    ];

    return { profile, repos, totalStars, languages };
  } catch {
    return { profile: null, repos: [], totalStars: 0, languages: [] };
  }
}
