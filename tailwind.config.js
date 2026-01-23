/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
      },
      zIndex: {
        '60': '60',
        '70': '70',
      },
      borderRadius: {
        koku: "1rem",
      },
      boxShadow: {
        card: "0 4px 12px rgba(0,0,0,0.05)",
        soft: "0 2px 40px rgba(0,0,0,0.08)",
      },
      colors: {
        brand: {
          primary: "#8b7355",
          secondary: "#c4846c",
        },
        earthy: {
          cream: "#fffcf9",
          stone: "#a39e93",
          sage: "#607263",
          terracotta: "#c4846c",
          charcoal: "#2d2a26",
          sand: "#e8e4de",
          warmGray: "#6b6560",
        },
        semantic: {
          success: "#607263",
          warning: "#c9a227",
          error: "#ab4225",
        },
        neutral: {
          textPrimary: "#2d2a26",
          textSecondary: "#6b6560",
          background: "#fffcf9",
          surface: "#f7f4f0",
          border: "#e8e4de",
        },
      },
    },
  },
  plugins: [],
};

