import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import eslintConfigPrettier from "eslint-config-prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Add custom rule configuration
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error", // or "warn"
        {
          argsIgnorePattern: "^_", // Ignore arguments starting with _
          varsIgnorePattern: "^_", // Ignore variables starting with _
          caughtErrorsIgnorePattern: "^_", // Ignore caught errors starting with _
        },
      ],
    },
  },

  {
    ignores: ["next.config.js"],
  },

  eslintConfigPrettier,
];

export default eslintConfig;
