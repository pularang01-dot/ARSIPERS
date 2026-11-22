import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { 950: "#0A1630", 900: "#0F1F3D", 800: "#152A4E", 700: "#1B3358", 600: "#2A4575", 100: "#E3E9F3", 50: "#F0F3F9" },
        ink: { DEFAULT: "#1E2633", soft: "#475266", mute: "#6B7587" },
        surface: { DEFAULT: "#EFF3F8", card: "#FFFFFF" },
        line: { DEFAULT: "#DCE3EC", strong: "#C2CCDA" },
        brass: { DEFAULT: "#A9812F", soft: "#F4ECD8", dark: "#7A5C1E" },
        ok: { DEFAULT: "#17653A", bg: "#E6F4EC" },
        warn: { DEFAULT: "#8A5A00", bg: "#FFF3D6" },
        bad: { DEFAULT: "#9B1C1C", bg: "#FCE8E8" },
        info: { DEFAULT: "#1C4E9B", bg: "#E5EEFB" },
        idle: { DEFAULT: "#4B5563", bg: "#ECEEF1" },
      },
      fontFamily: {
        sans: ["\"Segoe UI\"", "system-ui", "-apple-system", "Roboto", "\"Helvetica Neue\"", "Arial", "sans-serif"],
        display: ["Cambria", "\"Palatino Linotype\"", "Georgia", "\"Times New Roman\"", "serif"],
      },
      borderRadius: { md: "6px", lg: "8px", xl: "12px" },
      boxShadow: { card: "0 1px 2px rgba(15,31,61,0.05), 0 1px 1px rgba(15,31,61,0.03)", lift: "0 8px 22px rgba(15,31,61,0.10)" },
    },
  },
  plugins: [],
};
export default config;