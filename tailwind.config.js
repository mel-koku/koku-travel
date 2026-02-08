/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    // Activity color scheme classes (dynamically used in activityColors.ts)
    'bg-brand-primary',
    'bg-brand-primary/10',
    'bg-brand-secondary',
    'bg-brand-secondary/10',
    'bg-sage',
    'bg-sage/10',
    'bg-stone',
    'bg-stone/10',
    'bg-warning',
    'bg-warning/10',
    'bg-warm-gray',
    'bg-warm-gray/10',
    'border-l-brand-primary',
    'border-l-brand-secondary',
    'border-l-sage',
    'border-l-stone',
    'border-l-warning',
    'border-l-warm-gray',
    // Selection state
    'ring-sage',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-instrument-serif)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        display: "-0.04em",
        heading: "-0.02em",
        wide: "0.15em",
        ultra: "0.3em",
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
        card: "0 4px 12px rgba(31, 26, 20, 0.08)",
        soft: "0 2px 40px rgba(31, 26, 20, 0.1)",
        depth: "0 4px 6px -1px rgba(31,26,20,0.06), 0 10px 15px -3px rgba(31,26,20,0.1), 0 20px 25px -5px rgba(31,26,20,0.06)",
      },
      keyframes: {
        'heart-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'heart-pulse': 'heart-pulse 0.5s ease-in-out',
        'shimmer': 'shimmer 2s ease-in-out infinite',
      },
      colors: {
        brand: {
          primary: "#c4504f",
          secondary: "#daa54e",
        },
        semantic: {
          success: "#3da193",
          warning: "#d4b83d",
          error: "#d44535",
        },
      },
    },
  },
  plugins: [],
};

