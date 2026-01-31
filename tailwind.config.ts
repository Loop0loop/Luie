import typography from '@tailwindcss/typography';
import animate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
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
        // Semantic tokens (CSS variables)
        canvas: "var(--bg-app)",
        sidebar: "var(--bg-sidebar)",
        panel: "var(--bg-panel)",
        surface: "var(--bg-element)",
        "surface-hover": "var(--bg-element-hover)",
        active: "var(--bg-active)",

        fg: "var(--text-primary)",
        muted: "var(--text-secondary)",
        subtle: "var(--text-tertiary)",

        accent: "var(--accent-bg)",
        "accent-hover": "var(--accent-bg-hover)",
        "accent-fg": "var(--accent-fg)",

        success: "var(--success-fg)",
        danger: "var(--danger-fg)",

        border: "var(--border-default)",
        "border-active": "var(--border-active)",

        // Editor specific
        "editor-bg": "var(--editor-bg)",
        "editor-text": "var(--editor-text)",
        "editor-selection": "var(--editor-selection)",
      }
    },
  },
  plugins: [
    typography,
    animate,
  ],
}
