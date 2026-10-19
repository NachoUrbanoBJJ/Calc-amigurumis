import js from "@eslint/js";
import globals from "globals";

export default [
    {
        ignores: ["dist/**", "node_modules/**", "coverage/**"],
    },
    js.configs.recommended,
    {
        files: ["js/**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.browser,
            },
        },
        rules: {
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
            "no-console": "off",
            eqeqeq: ["warn", "smart"],
        },
    },
    {
        files: ["public/sw.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "script",
            globals: {
                ...globals.serviceworker,
                ...globals.browser,
            },
        },
        rules: {
            "no-console": "off",
        },
    },
    {
        files: ["tests/**/*.js", "scripts/**/*.mjs", "eslint.config.js", "vite.config.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.node,
            },
        },
    },
];
