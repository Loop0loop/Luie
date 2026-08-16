import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["out", "dist"],
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      eqeqeq: ["error", "always"],
      "no-debugger": "error",
      "no-var": "error",
      "prefer-const": "error",
      "object-shorthand": ["error", "always"],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-await-in-loop": "error",
      // NOTE: application logging은 shared logger로 모으되 logger 구현 자체의 console은 허용한다.
      "no-console": "error",

      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["src/shared/logger/index.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["src/main/index.ts", "src/main/lifecycle/**/*.ts"],
    rules: {
      "spaced-comment": ["error", "always", { markers: ["/"] }],
    },
  },
  {
    // NOTE: 순서가 필요한 IO와 transaction 구간만 sequential await를 허용한다.
    files: [
      "src/main/handler/system/fsPathApproval.ts",
      "src/main/manager/autoSave/**/*.ts",
      "src/main/manager/autoSaveManager.ts",
      "src/main/services/core/chapterKeywords.ts",
      "src/main/services/core/project/**/*.ts",
      "src/main/services/core/projectService.ts",
      "src/main/services/features/analysis/**/*.ts",
      "src/main/services/features/appUpdate/**/*.ts",
      "src/main/services/features/autoExtract/**/*.ts",
      "src/main/services/features/hwpx/**/*.ts",
      "src/main/services/features/snapshot/**/*.ts",
      "src/main/services/features/sync/**/*.ts",
      "src/main/services/io/luiePackageMigration.ts",
      "src/main/services/world/entityRelationService.ts",
      "src/preload/index.ts",
      "src/renderer/src/features/project/hooks/useFileImport.ts",
    ],
    rules: {
      "no-await-in-loop": "off",
    },
  },
);
