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
          primary: "#1E40AF",
          secondary: "#F97316",
        },
        semantic: {
          success: "#10B981",
          warning: "#F59E0B",
          error: "#EF4444",
        },
        neutral: {
          textPrimary: "#1F2937",
          textSecondary: "#6B7280",
          background: "#FFFFFF",
          surface: "#F9FAFB",
          border: "#E5E7EB",
        },
      },
    },
  },
  plugins: [],
};

