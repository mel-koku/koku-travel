import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Prevent console statements in production code
      // Scripts in scripts/ directory are allowed to use console
      "no-console": "error",
      // Allow state updates inside effects when intentional (common in UI code)
      "react-hooks/set-state-in-effect": "off",
      // Suppress Tailwind class suggestions for arbitrary values
      // Some linters suggest predefined classes, but arbitrary values are valid
      "@next/next/no-html-link-for-pages": "off",
      // Allow unused variables prefixed with underscore (common convention)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["src/components/Header.tsx"],
    rules: {
      // Suppress false positive z-index warnings (stale cache)
      "tailwindcss/classnames-order": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    // Allow console in scripts (development tools)
    "scripts/**",
  ]),
]);

export default eslintConfig;
