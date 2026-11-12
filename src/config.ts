/** Shape of profile.config.ts — everything specific to the profile lives there; src/ is the engine. */

export type Layer = "client" | "server" | "infra";

export type HobbyIcon = "cat" | "mountain" | "book" | "pencil" | "film" | "dot";

export interface LayerCard {
  /** Small caps label, e.g. "01 · CLIENT". */
  label: string;
  title: string;
  chips: string[];
  /** Status line under the chips. `state` picks the dot: full, half or empty. */
  status: { text: string; state: "done" | "progress" | "next" };
}

export interface Project {
  name: string;
  description: string;
  /** Shown as "React + Express + Docker", each part coloured by its layer. */
  stack: { label: string; layer: Layer }[];
  url?: string;
}

export interface ProfileConfig {
  /** GitHub login that owns the profile repo (github.com/<login>/<login>). */
  login: string;
  /** Path shown in the request bar, e.g. "/api/developers/mateusz-bialek". */
  apiPath: string;
  hero: {
    name: string;
    role: string;
    /** Rendered after an arrow: "<role> → <target>". */
    target: string;
    tagline: string;
  };
  layers: { client: LayerCard; api: LayerCard; infra: LayerCard };
  /** Rendered as the JSON response body, in key order. Values: string or string[]. */
  response: Record<string, string | string[]>;
  stack: {
    /**
     * Repos to analyse, as "owner/name". This file is public, so list ONLY repos whose
     * names may be public here. Private repos go in the STACK_PRIVATE_REPOS secret.
     */
    repos: string[];
    /** Libraries to hide. `*` matches anything: "@types/*", "eslint*". */
    excludeLibs: string[];
    /** Languages to hide, e.g. "Dockerfile". */
    excludeLanguages: string[];
    /** Rename/merge languages, e.g. { SCSS: "CSS / SCSS", CSS: "CSS / SCSS" }. */
    mergeLanguages: Record<string, string>;
    topLanguages: number;
    topLibs: number;
  };
  offline: { label: string; icon: HobbyIcon }[];
  /** 0–4 cards; an empty list hides the section. */
  projects: Project[];
  links: { email?: string; website?: string };
}

export const defineConfig = (c: ProfileConfig) => c;
