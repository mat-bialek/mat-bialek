import { defineConfig } from "./src/config.ts";

export default defineConfig({
  login: "mat-bialek",
  apiPath: "/api/developers/mateusz-bialek",

  hero: {
    name: "Mateusz Białek",
    role: "Senior Frontend Developer",
    target: "Fullstack",
    tagline: "With a passion for tailored solutions. 7+ years on the client side, now building the server side.",
  },

  layers: {
    client: {
      label: "01 · CLIENT",
      title: "React layer",
      chips: ["React", "Next.js", "TypeScript", "TanStack Query", "Redux Toolkit", "Tailwind"],
      status: { text: "production · 7+ yrs", state: "done" },
    },
    api: {
      label: "02 · API",
      title: "Node layer",
      chips: ["Node.js", "NestJS", "Prisma", "PostgreSQL", "REST / OpenAPI"],
      status: { text: "in progress", state: "progress" },
    },
    infra: {
      label: "03 · INFRA",
      title: "Ship it",
      chips: ["Docker", "AWS", "GitHub Actions", "Linux"],
      status: { text: "in progress", state: "progress" },
    },
  },

  response: {
    name: "Mateusz Białek",
    role: "Senior Frontend Developer",
    focus: "fullstack",
    frontend: ["React", "Next.js", "TypeScript", "TanStack Query", "Redux Toolkit", "AG Grid"],
    backend: ["Node.js", "NestJS", "Express", "tRPC", "REST / OpenAPI", "Prisma", "PostgreSQL", "Zod", "JWT / OAuth", "Redis"],
    testing: ["Vitest", "Jest", "React Testing Library", "Playwright", "Cypress"],
    devops: ["Docker", "GitHub Actions", "AWS", "Vercel", "Sentry"],
    ui: ["Figma", "Tailwind", "MUI", "shadcn/ui", "Storybook", "WCAG / a11y"],
    offline: "/offline",
  },

  stack: {
    // Public repos only. Private ones passed in secret.
    repos: [
      // "mat-bialek/some-public-repo",
    ],
    excludeLibs: ["@types/*", "eslint*", "@eslint/*", "prettier*", "typescript-eslint", "globals"],
    excludeLanguages: ["Dockerfile", "Makefile", "Batchfile"],
    mergeLanguages: { SCSS: "CSS / SCSS", CSS: "CSS / SCSS", Sass: "CSS / SCSS" },
    topLanguages: 5,
    topLibs: 6,
  },

  offline: [
    { label: "Cats", icon: "cat" },
    { label: "Bouldering", icon: "mountain" },
    { label: "Reading", icon: "book" },
    { label: "Sketching", icon: "pencil" },
    { label: "Animated films", icon: "film" },
  ],

  projects: [
    // {
    //   name: "TODO Project name",
    //   description: "TODO What it does in one line",
    //   stack: [{ label: "React", layer: "client" }, { label: "Express", layer: "server" }, { label: "Docker", layer: "infra" }],
    // },
    // {
    //   name: "TODO Project name",
    //   description: "TODO What it does in one line",
    //   stack: [{ label: "Next.js", layer: "client" }, { label: "Node.js", layer: "server" }, { label: "AWS", layer: "infra" }],
    // },
  ],

  links: {
    email: "mateusz.d.bialek@gmail.com",
    // website: "https://TODO",
  },
});
