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
      },
      zIndex: {
        // ─── Semantic Layer System ────────────────────────────────────────────
        // Use these tokens instead of raw numbers so stacking order is
        // explicit and consistent across the entire app.
        //
        //  base      →  in-flow content (no special stacking)
        //  raised    →  slightly elevated content within a panel
        //  overlay   →  panel resize handles, sticky elements
        //  sticky    →  sticky headers inside scroll containers
        //  toolbar   →  fixed toolbars, ribbons
        //  dropdown  →  menus, popovers, autocomplete lists
        //  modal     →  modal dialogs, full-screen overlays
        //  toast     →  transient notifications (above modals)
        //  tooltip   →  tooltips (always on top)
        base: "0",
        raised: "10",
        overlay: "20",
        sticky: "30",
        toolbar: "40",
        dropdown: "50",
        modal: "9000",
        toast: "9100",
        tooltip: "9200",
      },
    },
  },
  plugins: [],
}
