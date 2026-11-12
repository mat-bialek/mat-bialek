/**
 * Fetch languages + package.json dependencies for the selected repos and write data/stack.json.
 *
 * Repos come from profile.config.ts (public names) and the STACK_PRIVATE_REPOS env/secret
 * (newline- or comma-separated "owner/name"). Repo names are never written to disk or logged,
 * because both the data file and the Action logs of a public profile repo are public.
 *
 * Fail-safe: if every repo fails, the previous data/stack.json is kept and the script exits 1.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import config from "../profile.config.ts";
import { aggregate, parseRepoList, type RepoData } from "./aggregate.ts";
import { fetchRepo } from "./github.ts";

const OUT = new URL("../data/stack.json", import.meta.url);
const TOKEN = process.env.PROFILE_TOKEN || process.env.GITHUB_TOKEN;

async function main() {
  const slugs = [...new Set([...config.stack.repos, ...parseRepoList(process.env.STACK_PRIVATE_REPOS)])];
  if (slugs.length === 0) {
    console.log("No repos configured (profile.config.ts stack.repos / STACK_PRIVATE_REPOS). Keeping existing data.");
    return;
  }
  if (!TOKEN) console.warn("No PROFILE_TOKEN/GITHUB_TOKEN set: only public repos will work, with low rate limits.");

  const ok: RepoData[] = [];
  let failed = 0;
  for (const [i, slug] of slugs.entries()) {
    try {
      ok.push(await fetchRepo(slug, TOKEN));
      console.log(`repo ${i + 1}/${slugs.length}: ok`);
    } catch (e) {
      failed++;
      // Deliberately no repo name: Action logs on a public repo are public.
      console.warn(`repo ${i + 1}/${slugs.length}: skipped (${(e as Error).message}) — check the token has access to it`);
    }
  }

  if (ok.length === 0) {
    console.error(existsSync(OUT) ? "Every repo failed; keeping the previous data/stack.json." : "Every repo failed.");
    process.exit(1);
  }

  const stats = aggregate(ok, failed, config.stack);
  const prev = existsSync(OUT) ? (JSON.parse(readFileSync(OUT, "utf8")) as { generatedAt?: string }) : {};
  // Only bump the timestamp when the numbers changed, so a no-op day makes no commit.
  const same = JSON.stringify({ ...prev, generatedAt: "" }) === JSON.stringify({ ...stats, generatedAt: "" });
  if (same) {
    console.log("No changes in stack data.");
    return;
  }
  writeFileSync(OUT, JSON.stringify(stats, null, 2) + "\n");
  console.log(`Wrote data/stack.json from ${ok.length} repos (${failed} skipped).`);
}

await main();
