/** Pure aggregation: per-repo raw data -> the privacy-safe numbers that get committed. */

export interface RepoData {
  private: boolean;
  /** GitHub's /languages response: language -> bytes of code. */
  languages: Record<string, number>;
  /** Contents of every package.json found in the repo. */
  packageJsons: string[];
}

export interface StackStats {
  generatedAt: string;
  /** True for the bundled sample file, so the render can flag it. */
  sample?: boolean;
  repos: { total: number; public: number; private: number; failed: number };
  languages: { name: string; pct: number }[];
  libraries: { name: string; repos: number }[];
}

export interface AggregateOptions {
  excludeLibs: string[];
  excludeLanguages: string[];
  mergeLanguages: Record<string, string>;
  topLanguages: number;
  topLibs: number;
}

const globToRegExp = (glob: string) =>
  new RegExp("^" + glob.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\/]/g, "\\$&")).join(".*") + "$", "i");

export const matchesAny = (name: string, globs: string[]) => globs.some((g) => globToRegExp(g).test(name));

/** Dependency names of one package.json (deps + devDeps), plus the package's own name. */
export function parsePackageJson(text: string): { name?: string; deps: string[] } {
  try {
    const pkg = JSON.parse(text) as Record<string, unknown>;
    const keys = (o: unknown) => (o && typeof o === "object" ? Object.keys(o) : []);
    return {
      name: typeof pkg.name === "string" ? pkg.name : undefined,
      deps: [...keys(pkg.dependencies), ...keys(pkg.devDependencies)],
    };
  } catch {
    return { deps: [] };
  }
}

export function aggregate(repos: RepoData[], failed: number, opts: AggregateOptions, now = new Date()): StackStats {
  const bytes = new Map<string, number>();
  for (const repo of repos) {
    for (const [lang, n] of Object.entries(repo.languages)) {
      if (matchesAny(lang, opts.excludeLanguages)) continue;
      const name = opts.mergeLanguages[lang] ?? lang;
      bytes.set(name, (bytes.get(name) ?? 0) + n);
    }
  }
  const total = [...bytes.values()].reduce((a, b) => a + b, 0);
  const sorted = [...bytes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const top = sorted.slice(0, opts.topLanguages);
  const rest = sorted.slice(opts.topLanguages).reduce((a, [, n]) => a + n, 0);
  const languages = total === 0 ? [] : [...top, ...(rest > 0 ? [["Other", rest] as [string, number]] : [])].map(
    ([name, n]) => ({ name, pct: Math.round((n / total) * 1000) / 10 }),
  );

  // Libraries: how many repos use each one. Workspace packages (the repos' own names) are not "libraries".
  const own = new Set<string>();
  const perRepo = repos.map((repo) => {
    const set = new Set<string>();
    for (const text of repo.packageJsons) {
      const { name, deps } = parsePackageJson(text);
      if (name) own.add(name);
      deps.forEach((d) => set.add(d));
    }
    return set;
  });
  const count = new Map<string, number>();
  for (const set of perRepo) for (const dep of set) count.set(dep, (count.get(dep) ?? 0) + 1);
  const libraries = [...count.entries()]
    .filter(([name]) => !own.has(name) && !matchesAny(name, opts.excludeLibs))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, opts.topLibs)
    .map(([name, n]) => ({ name, repos: n }));

  const priv = repos.filter((r) => r.private).length;
  return {
    generatedAt: now.toISOString(),
    repos: { total: repos.length, public: repos.length - priv, private: priv, failed },
    languages,
    libraries,
  };
}

/** "owner/a, owner/b\nowner/c" -> ["owner/a", "owner/b", "owner/c"]; anything malformed is dropped. */
export const parseRepoList = (raw: string | undefined) =>
  (raw ?? "").split(/[\s,]+/).map((s) => s.trim()).filter((s) => /^[\w.-]+\/[\w.-]+$/.test(s));
