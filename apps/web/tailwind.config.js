/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Primary — deep African forest green. The platform's core color:
        // navigation accents, primary actions, headings on light surfaces.
        forest: {
          50: "#eef3f0",
          100: "#dbe7e0",
          200: "#b3cec0",
          300: "#89b29c",
          400: "#5c9179",
          500: "#3a7057",
          600: "#255843",
          700: "#183C2B",
          800: "#122e21",
          900: "#0c2017",
        },
        // Dark — used for navigation-on-dark, footer and dark sections
        // (never for body text on light backgrounds).
        earth: {
          50: "#eef0ee",
          100: "#d7dcd6",
          200: "#aab5a8",
          300: "#7c8c78",
          400: "#54614f",
          500: "#39463a",
          600: "#232f21",
          700: "#1d271b",
          800: "#17231D",
          900: "#0e150f",
        },
        // Secondary — warm safari earth, used for secondary emphasis and
        // editorial accents (labels, dividers, quiet supporting text).
        savannah: {
          50: "#f8f5ef",
          100: "#efe8d8",
          200: "#ddccac",
          300: "#c9ae80",
          400: "#ad9163",
          500: "#8A7650",
          600: "#6f5f40",
          700: "#574a33",
          800: "#413827",
          900: "#2b251a",
        },
        // Soft natural background — section backgrounds, subtle fills.
        sand: {
          50: "#fbf9f4",
          100: "#F7F1E4",
          200: "#E9DFC9",
          300: "#dcc9a0",
          400: "#c9ae77",
        },
        // Main light background — the platform's default canvas.
        ivory: {
          DEFAULT: "#F7F4EC",
          100: "#FFFFFF",
          200: "#F7F4EC",
          300: "#efe6d1",
        },
        // Accent — brass, used in very small amounts for premium details
        // (verified seals, dividers, tiny highlights). Never a large fill.
        brass: {
          50: "#f9f3e7",
          100: "#f0e2c3",
          200: "#e2c894",
          300: "#d3b06a",
          400: "#B18A45",
          500: "#9a7539",
          600: "#7d5f2e",
          700: "#5f4823",
          800: "#493619",
          900: "#332611",
        },
        // Secondary green — positive/confirming actions (accept, confirm,
        // success states), a muted companion to forest rather than a
        // second unrelated hue.
        moss: {
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
        // Live-inventory status — deliberately muted, not bright/neon.
        status: {
          available: "#3F8B5B",
          "almost-full": "#C5933D",
          full: "#9B4A42",
        },
      },
      fontFamily: {
        // Large, editorial headings — the "this is beautiful" first
        // impression.
        display: ["Cormorant Garamond", "Georgia", "serif"],
        // Clean interface/body text — live status, prices, UI chrome.
        sans: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        widest2: "0.2em",
      },
    },
  },
  plugins: [],
};
