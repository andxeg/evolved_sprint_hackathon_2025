const { FlatCompat } = require('@eslint/eslintrc')
const js = require('@eslint/js')
const typescriptEslint = require('@typescript-eslint/eslint-plugin')
const typescriptParser = require('@typescript-eslint/parser')
const unusedImports = require('eslint-plugin-unused-imports')
const simpleImportSort = require('eslint-plugin-simple-import-sort')
const path = require('path')

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
})

module.exports = [{
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "public/**/*.js"]
}, ...compat.extends('next/core-web-vitals', 'prettier'), {
  files: ['**/*.{js,jsx,ts,tsx}'],
  languageOptions: {
    parser: typescriptParser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
  plugins: {
    '@typescript-eslint': typescriptEslint,
    'unused-imports': unusedImports,
    'simple-import-sort': simpleImportSort,
  },
  rules: {
    // Remove unused imports automatically
    'unused-imports/no-unused-imports': 'error',
    // Flag unused vars but allow underscore-prefixed
    'unused-imports/no-unused-vars': [
      'warn',
      {
        args: 'after-used',
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        ignoreRestSiblings: true,
      },
    ],
    // Keep imports consistently ordered
    'simple-import-sort/imports': 'warn',
    'simple-import-sort/exports': 'warn',
    // Disable import/order to avoid conflicts with simple-import-sort
    'import/order': 'off',
  },
}, {
  ignores: [
    'node_modules/**',
    '.next/**',
    'dist/**',
    'build/**',
    '*.config.js',
    '*.config.mjs',
  ],
}];
