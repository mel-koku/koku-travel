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
      fontSize: {
        'caption': ['0.5rem', { lineHeight: '1.4' }],     // 8px - Legal, fine print
        'small': ['0.707rem', { lineHeight: '1.4' }],    // 11px - Labels, metadata
        'base': ['1rem', { lineHeight: '1.6' }],         // 16px - Body text
        'lg': ['1.414rem', { lineHeight: '1.5' }],       // 23px - Lead paragraphs
        'xl': ['2rem', { lineHeight: '1.3' }],           // 32px - H4, subheadings
        '2xl': ['2.828rem', { lineHeight: '1.2' }],      // 45px - H3
        '3xl': ['4rem', { lineHeight: '1.1' }],          // 64px - H2
        '4xl': ['5.657rem', { lineHeight: '1.05' }],     // 90px - H1
        'display': ['8rem', { lineHeight: '1' }],        // 128px - Hero headlines
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
      keyframes: {
        'heart-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
        },
      },
      animation: {
        'heart-pulse': 'heart-pulse 0.5s ease-in-out',
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

