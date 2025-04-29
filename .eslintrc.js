export default {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: "airbnb-base",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    "import/extensions": ["error", "ignorePackages"],
    "no-console": "off",
    "no-underscore-dangle": ["error", { allow: ["_id"] }],
  },
};
