import jsxA11y from "eslint-plugin-jsx-a11y";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";

export default [
  // TypeScript + React source files
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["src/**/*.{ts,tsx}"],
  })),
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      "jsx-a11y": jsxA11y,
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "simple-import-sort": simpleImportSort,
    },
    settings: {
      react: { version: "detect" },
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      curly: ["error", "all"],

      // Unused imports
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
        },
      ],

      // Accessibility
      ...jsxA11y.configs.recommended.rules,

      // React
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/jsx-uses-react": "off",
      "react/jsx-uses-vars": "error",

      // React Hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // TypeScript
      "@typescript-eslint/no-explicit-any": "warn",

      // Import sorting: React → third-party → internal
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            // React imports
            ["^react$", "^react-dom", "^react/"],
            // Third-party packages
            ["^[a-z@]"],
            // Internal imports (relative paths)
            ["^\\."],
          ],
        },
      ],
      "simple-import-sort/exports": "error",
    },
  },

  // E2E tests and config files (plain JS)
  {
    files: ["e2e/**/*.js", "*.js"],
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      curly: ["error", "all"],
      "simple-import-sort/imports": [
        "error",
        {
          groups: [["^[a-z@]"], ["^\\."]],
        },
      ],
      "simple-import-sort/exports": "error",
    },
  },
];
