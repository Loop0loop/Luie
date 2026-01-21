/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design tokens (CSS variables)
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
        border: "var(--border-default)",
        "border-active": "var(--border-active)",

        'luie-primary': '#2D2D2D',
        'luie-secondary': '#F5F5F5',
        'luie-accent': '#4A90E2'
      }
    },
  },
  plugins: [],
}
