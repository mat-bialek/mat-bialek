import { describe, expect, it } from "vitest";
import { fetchRepo } from "../src/github.ts";

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

describe("fetchRepo", () => {
  it("reads languages and every package.json outside node_modules, with the token", async () => {
    const seen: { url: string; auth: string | null }[] = [];
    const fake = (async (url: string, init?: RequestInit) => {
      const auth = new Headers(init?.headers).get("Authorization");
      seen.push({ url, auth });
      const path = url.replace("https://api.github.com", "");
      if (path === "/repos/me/app") return json({ private: true, default_branch: "main" });
      if (path === "/repos/me/app/languages") return json({ TypeScript: 100 });
      if (path.startsWith("/repos/me/app/git/trees/main"))
        return json({ tree: [
          { path: "package.json", type: "blob" },
          { path: "apps/web/package.json", type: "blob" },
          { path: "node_modules/x/package.json", type: "blob" },
          { path: "src", type: "tree" },
        ] });
      if (path === "/repos/me/app/contents/package.json") return new Response('{"dependencies":{"react":"1"}}');
      if (path === "/repos/me/app/contents/apps/web/package.json") return new Response("broken", { status: 404 });
      return new Response("", { status: 404 });
    }) as unknown as typeof fetch;

    const data = await fetchRepo("me/app", "secret", fake);
    expect(data).toEqual({ private: true, languages: { TypeScript: 100 }, packageJsons: ['{"dependencies":{"react":"1"}}'] });
    expect(seen.every((s) => s.auth === "Bearer secret")).toBe(true);
    expect(seen.some((s) => s.url.includes("node_modules"))).toBe(false);
  });

  it("throws on a repo the token can't see", async () => {
    const fake = (async () => new Response("", { status: 404 })) as unknown as typeof fetch;
    await expect(fetchRepo("me/hidden", "t", fake)).rejects.toThrow("HTTP 404");
  });
});
