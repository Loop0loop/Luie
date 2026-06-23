module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
  ],
  ignorePatterns: ["dist", ".eslintrc.cjs", "out", "node_modules"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "react"],
  settings: {
    react: { version: "detect" },
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "react/prop-types": "off",
    "no-console": ["warn", { allow: ["warn", "error", "info"] }],
  },
};
