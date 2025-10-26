import { Linter } from "eslint";

/** @type {Linter.Config} */
const config = {
  root: true,
  env: {
    node: true,
    es2022: true,
    jest: true,
  },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "import"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "prettier",
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
    project: "./tsconfig.json",
  },
  settings: {
    "import/resolver": {
      typescript: {
        project: "./tsconfig.json",
      },
    },
  },
  rules: {
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/consistent-type-imports": ["warn", { prefer: "type-imports" }],
    "@typescript-eslint/no-namespace": "off",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/strict-boolean-expressions": "warn",
    "import/order": [
      "warn",
      {
        alphabetize: { order: "asc" },
        groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "always",
      },
    ],
    "import/no-duplicates": "error",
    "import/no-unresolved": "error",
    "import/default": "off",
    "import/no-named-as-default": "off",
    "import/no-named-as-default-member": "off",
  },
  ignorePatterns: ["dist/", "node_modules/", "**/*.cjs", "**/*.mjs"],
};

export default config;
