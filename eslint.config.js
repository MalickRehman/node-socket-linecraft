import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      "no-console": "off",
      "no-underscore-dangle": ["error", { allow: ["_id"] }],
    },
    ignores: ["node_modules/**", "dist/**", "coverage/**", "scripts//**"],
  },
];
