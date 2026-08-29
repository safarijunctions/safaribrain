/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        savanna: {
          50: "#fdf8ee",
          100: "#f7ecd0",
          500: "#c8862b",
          600: "#a86a1d",
          700: "#7d4f17",
        },
      },
    },
  },
  plugins: [],
};
