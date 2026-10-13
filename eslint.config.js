import js from '@eslint/js';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';
export default defineConfig([
  globalIgnores(['.local/**', 'node_modules/**']),
  { files: ['**/*.mjs'], extends: [js.configs.recommended], languageOptions: { globals: globals.node, ecmaVersion: 2024 } },
]);
