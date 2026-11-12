/** Minimal GitHub REST client for the stack fetcher. */
import type { RepoData } from "./aggregate.ts";

const MAX_PACKAGE_JSONS = 25;

function client(token: string | undefined, fetchImpl: typeof fetch) {
  return async (path: string, accept = "application/vnd.github+json"): Promise<Response> => {
    const res = await fetchImpl(`https://api.github.com${path}`, {
      headers: {
        Accept: accept,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "profile-readme-generator",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  };
}

/** Languages + every package.json (outside node_modules) of one repo. */
export async function fetchRepo(slug: string, token?: string, fetchImpl: typeof fetch = fetch): Promise<RepoData> {
  const gh = client(token, fetchImpl);
  const repo = (await (await gh(`/repos/${slug}`)).json()) as { private: boolean; default_branch: string };
  const languages = (await (await gh(`/repos/${slug}/languages`)).json()) as Record<string, number>;

  const tree = (await (await gh(`/repos/${slug}/git/trees/${encodeURIComponent(repo.default_branch)}?recursive=1`)).json()) as {
    tree: { path: string; type: string }[];
  };
  const paths = tree.tree
    .filter((e) => e.type === "blob" && /(^|\/)package\.json$/.test(e.path) && !/(^|\/)node_modules\//.test(e.path))
    .map((e) => e.path)
    .slice(0, MAX_PACKAGE_JSONS);

  const packageJsons: string[] = [];
  for (const p of paths) {
    try {
      const res = await gh(`/repos/${slug}/contents/${p.split("/").map(encodeURIComponent).join("/")}`, "application/vnd.github.raw+json");
      packageJsons.push(await res.text());
    } catch {
      /* one unreadable package.json shouldn't drop the repo */
    }
  }
  return { private: repo.private, languages, packageJsons };
}
