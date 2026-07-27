/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // Primary/accent/status colors are identical in light and dark mode
        // (see index.css), so they stay as plain hex here. Background,
        // surface, border, and text colors are theme-dependent — they're
        // wired to CSS variables (set on `:root`/`:root[data-theme="light"]`
        // in index.css) so every component using these tokens repaints
        // automatically when the theme toggles, with no per-component code.
        primary: {
          DEFAULT: "#C61F65",
          dark: "#B80056",
        },
        accent: "#0D9488",
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        border: "var(--color-border)",
        ink: "var(--color-ink)",
        muted: "var(--color-muted)",
        success: "#10B981",
        warning: "#FF9800",
      },
      // Tailwind's defaults already give us exactly what the brand spec
      // wants: rounded-lg = 8px (buttons/inputs), rounded-xl = 12px (cards),
      // rounded-3xl = 24px (status pills) — no overrides needed.
    },
  },
  plugins: [],
};
