/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
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
        "panel-header": "var(--bg-panel-header)",
        
        // Element backgrounds
        surface: "var(--bg-element)",
        "surface-hover": "var(--bg-element-hover)",
        active: "var(--bg-active)",
        
        // Text
        fg: "var(--text-primary)",
        muted: "var(--text-secondary)",
        subtle: "var(--text-tertiary)",
        "on-accent": "var(--text-on-accent)",
        
        // Brand / Semantic
        accent: "var(--accent-bg)",
        "accent-hover": "var(--accent-bg-hover)",
        "accent-fg": "var(--accent-fg)",
        
        success: "var(--success-fg)",
        danger: "var(--danger-fg)",
        
        // Borders
        border: "var(--border-default)",
        "border-active": "var(--border-active)",
        "border-focus": "var(--border-focus)",
      }
    },
  },
  plugins: [],
}
