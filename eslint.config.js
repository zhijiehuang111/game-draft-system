import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import configPrettier from "eslint-config-prettier";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["**/dist", "**/build", "**/node_modules"]),

  // Base rules for every TS/TSX file in the workspace
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },

  // Browser-side React app
  {
    files: ["apps/client/**/*.{ts,tsx}"],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Fast Refresh only-component-export: warn, don't block (Toast mixes exports)
      "react-refresh/only-export-components": "warn",
    },
  },

  // Node-side packages
  {
    files: ["apps/server/**/*.ts", "packages/shared/**/*.ts"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // Allow `declare global { namespace Express { ... } }` type augmentation
      "@typescript-eslint/no-namespace": ["error", { allowDeclarations: true }],
    },
  },

  // Disable formatting rules that conflict with Prettier (keep last)
  configPrettier,
]);
