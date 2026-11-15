import { loadFont } from "@remotion/google-fonts/PublicSans";

const { fontFamily } = loadFont("normal", { weights: ["400", "500", "600", "700", "800"], subsets: ["latin"] });

export const FONT = `${fontFamily}, "Noto Sans CJK KR", "Noto Sans Mono CJK KR", sans-serif`;

// The app's tokens from app/globals.css.
export const C = {
  ground: "#fcfaf8",
  form: "#ffffff",
  soft: "#f4f0f7",
  purple: "#e0d6f5",
  purpleStrong: "#57496e",
  lavender: "#f0eaf8",
  peach: "#f9dcc1",
  peachInk: "#7b5538",
  peachSoft: "#fff2e7",
  ink: "#242833",
  inkMuted: "#6b6373",
  line: "#e7e0e9",
  danger: "#ba354a",
  dangerSoft: "#fbe9ec",
  green: "#1f6b47",
  greenSoft: "#e3f1ea",
  facebook: "#1877f2",
};
