/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'luie-primary': '#2D2D2D',
        'luie-secondary': '#F5F5F5',
        'luie-accent': '#4A90E2'
      }
    },
  },
  plugins: [],
}
