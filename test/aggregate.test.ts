import { describe, expect, it } from "vitest";
import { aggregate, matchesAny, parsePackageJson, parseRepoList, type RepoData } from "../src/aggregate.ts";

const opts = {
  excludeLibs: ["@types/*", "eslint*"],
  excludeLanguages: ["Dockerfile"],
  mergeLanguages: { SCSS: "CSS / SCSS", CSS: "CSS / SCSS" },
  topLanguages: 2,
  topLibs: 3,
};

const pkg = (name: string, deps: string[], dev: string[] = []) =>
  JSON.stringify({ name, dependencies: Object.fromEntries(deps.map((d) => [d, "1"])), devDependencies: Object.fromEntries(dev.map((d) => [d, "1"])) });

describe("aggregate", () => {
  const repos: RepoData[] = [
    { private: false, languages: { TypeScript: 600, CSS: 100, Dockerfile: 50 }, packageJsons: [pkg("app", ["react", "zod"], ["@types/react", "eslint"])] },
    { private: true, languages: { TypeScript: 200, SCSS: 100 }, packageJsons: [pkg("api", ["express", "zod"]), pkg("web", ["react", "api"])] },
  ];
  const stats = aggregate(repos, 1, opts, new Date("2026-01-01T00:00:00Z"));

  it("merges, excludes and ranks languages, folding the tail into Other", () => {
    expect(stats.languages).toEqual([
      { name: "TypeScript", pct: 80 },
      { name: "CSS / SCSS", pct: 20 },
    ]);
  });

  it("counts each library once per repo and drops excluded and workspace packages", () => {
    expect(stats.libraries).toEqual([
      { name: "react", repos: 2 },
      { name: "zod", repos: 2 },
      { name: "express", repos: 1 },
    ]);
  });

  it("reports counts but never repo names", () => {
    expect(stats.repos).toEqual({ total: 2, public: 1, private: 1, failed: 1 });
    expect(JSON.stringify(stats)).not.toMatch(/"app"|"api"|"web"/);
  });

  it("adds Other when languages exceed the top N", () => {
    const s = aggregate([{ private: false, languages: { A: 50, B: 30, C: 20 }, packageJsons: [] }], 0, opts);
    expect(s.languages.map((l) => l.name)).toEqual(["A", "B", "Other"]);
  });

  it("handles no data", () => {
    expect(aggregate([], 0, opts).languages).toEqual([]);
  });
});

describe("helpers", () => {
  it("matches globs case-insensitively", () => {
    expect(matchesAny("@types/node", ["@types/*"])).toBe(true);
    expect(matchesAny("eslint-plugin-react", ["eslint*"])).toBe(true);
    expect(matchesAny("react", ["eslint*"])).toBe(false);
  });

  it("survives broken package.json", () => {
    expect(parsePackageJson("{nope")).toEqual({ deps: [] });
  });

  it("parses repo lists from secrets", () => {
    expect(parseRepoList(" me/a, me/b\nme/c\n\nnot-a-repo ")).toEqual(["me/a", "me/b", "me/c"]);
  });
});
