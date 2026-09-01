/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary — sun-baked clay/terracotta, the red earth of the savanna.
        clay: {
          50: "#fdf6f0",
          100: "#faebde",
          200: "#f3d2b3",
          300: "#e9b183",
          400: "#dc8a54",
          500: "#c96a34",
          600: "#a84f26",
          700: "#853d20",
          800: "#66301c",
          900: "#472218",
        },
        // Secondary — acacia foliage, deep and grounded.
        acacia: {
          50: "#f2f6ee",
          100: "#e1ebd6",
          200: "#c1d6ad",
          300: "#9cbd80",
          400: "#77a058",
          500: "#5a833f",
          600: "#456830",
          700: "#375228",
          800: "#2b3f20",
          900: "#1e2c16",
        },
        // Accent — sunset gold over the plains, used sparingly.
        sunset: {
          50: "#fdf8ec",
          100: "#faedc7",
          300: "#f2c866",
          400: "#e9ac37",
          500: "#d68f22",
          600: "#b06f1a",
          700: "#8a5518",
        },
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
