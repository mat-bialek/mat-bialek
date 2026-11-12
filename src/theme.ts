/** Two palettes; GitHub picks one per viewer through <picture> + prefers-color-scheme. */
export interface Theme {
  name: "dark" | "light";
  card: string;
  chip: string;
  border: string;
  text: string;
  strong: string;
  muted: string;
  client: string;
  server: string;
  onAccent: string;
  glowClient: string;
  glowServer: string;
  /** JSON syntax: punctuation, strings, keys. */
  jsonPunct: string;
  jsonString: string;
  jsonKey: string;
  /** Language bar colours in rank order (distinct in lightness, not hue alone); last one is "Other". */
  langs: string[];
  other: string;
}

// Backgrounds stay transparent so slices sit seamlessly on GitHub's own page colour.
export const dark: Theme = {
  name: "dark",
  card: "#111A17",
  chip: "#17231F",
  border: "#23302B",
  text: "#E6EDEA",
  strong: "#FFFFFF",
  muted: "#8FA39B",
  client: "#5CC8E8",
  server: "#8BD36E",
  onAccent: "#0B110F",
  glowClient: "rgba(92,200,232,0.22)",
  glowServer: "rgba(139,211,110,0.22)",
  jsonPunct: "#8FA39B",
  jsonString: "#C9E7A8",
  jsonKey: "#9ADCF0",
  langs: ["#5CC8E8", "#8BD36E", "#E8C35C", "#B59CF0", "#F08A7E"],
  other: "#3A4A44",
};

export const light: Theme = {
  name: "light",
  card: "#FFFFFF",
  chip: "#EEF3F1",
  border: "#D8E1DD",
  text: "#1F2A26",
  strong: "#0B110F",
  muted: "#56675F",
  client: "#0B7596",
  server: "#357A1F",
  onAccent: "#FFFFFF",
  glowClient: "rgba(11,117,150,0.18)",
  glowServer: "rgba(53,122,31,0.18)",
  jsonPunct: "#56675F",
  jsonString: "#357A1F",
  jsonKey: "#0B6A88",
  langs: ["#0B7596", "#357A1F", "#8F6400", "#6B4FC0", "#B3472F"],
  other: "#B9C6C0",
};

export const themes = [dark, light];
