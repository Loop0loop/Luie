import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontSize: {
        micro: ["11px", "1.4"],
        label: ["13px", "1.5"],
        caption: ["10px", "1.4"],
        body: ["14px", "1.6"],
      },
      colors: {
        // Semantic tokens (HSL)
        canvas: "hsl(var(--bg-app) / <alpha-value>)",
        sidebar: "hsl(var(--bg-sidebar) / <alpha-value>)",
        panel: "hsl(var(--bg-panel) / <alpha-value>)",
        surface: "hsl(var(--bg-element) / <alpha-value>)",
        "surface-hover": "hsl(var(--bg-element-hover) / <alpha-value>)",
        active: "hsl(var(--bg-active) / <alpha-value>)",

        fg: "hsl(var(--text-primary) / <alpha-value>)",
        muted: "hsl(var(--text-secondary) / <alpha-value>)",
        subtle: "hsl(var(--text-tertiary) / <alpha-value>)",
        
        accent: "hsl(var(--accent-bg) / <alpha-value>)",
        "accent-hover": "hsl(var(--accent-bg-hover) / <alpha-value>)",
        "accent-fg": "hsl(var(--accent-fg) / <alpha-value>)",
        
        success: "hsl(var(--success-fg) / <alpha-value>)",
        danger: "hsl(var(--danger-fg) / <alpha-value>)",
        
        border: "hsl(var(--border-default) / <alpha-value>)",
        "border-active": "hsl(var(--border-active) / <alpha-value>)",
        
        // Editor specific
        "editor-bg": "hsl(var(--editor-bg) / <alpha-value>)",
        "editor-text": "hsl(var(--editor-text) / <alpha-value>)",
        "editor-selection": "hsl(var(--editor-selection) / <alpha-value>)",
      }
    },
  },
  plugins: [
    typography,
  ],
}
