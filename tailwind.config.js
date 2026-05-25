/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/frontend/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: "#09090b",
        ember: "#f59e0b",
        aether: "#8b5cf6",
      },
    },
  },
  plugins: [],
};
