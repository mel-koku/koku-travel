/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        koku: "1rem", // rounded-2xl equivalent
      },
      boxShadow: {
        card: "0 4px 12px rgba(0,0,0,0.05)",
      },
      colors: {
        brand: {
          primary: "#4F46E5", // indigo-600
          hover: "#4338CA", // indigo-700
          surface: "#F9FAFB", // neutral background
        },
      },
    },
  },
  plugins: [],
};

