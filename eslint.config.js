import simpleImportSort from "eslint-plugin-simple-import-sort";

export default [
  {
    files: ["src/**/*.{ts,tsx}", "e2e/**/*.js", "*.js"],
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      curly: ["error", "all"],
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            // External packages (node_modules)
            ["^[a-z@]"],
            // Internal imports (relative paths)
            ["^\\."],
          ],
        },
      ],
      "simple-import-sort/exports": "error",
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
];
