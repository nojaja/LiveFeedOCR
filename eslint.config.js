const js = require('@eslint/js');
const globals = require('globals');
const tseslint = require('typescript-eslint');
const sonarjs = require('eslint-plugin-sonarjs');
const jsdoc = require('eslint-plugin-jsdoc');
const vue = require('eslint-plugin-vue');
const vueParser = require('vue-eslint-parser');

const qualityRules = {
  'sonarjs/cognitive-complexity': ['error', 10],
  'sonarjs/no-duplicate-string': ['error', { threshold: 3 }],
  'sonarjs/no-identical-functions': 'error',
  'no-unused-vars': ['warn'],
};

const documentationRules = {
  'jsdoc/require-jsdoc': [
    'error',
    {
      require: {
        FunctionDeclaration: true,
        MethodDefinition: true,
        ClassDeclaration: true,
        ArrowFunctionExpression: true,
        FunctionExpression: true,
      },
    },
  ],
  'jsdoc/require-param': 'error',
  'jsdoc/require-returns': 'error',
};

module.exports = tseslint.config(
  js.configs.recommended,
  tseslint.configs.base,
  ...vue.configs['flat/base'],
  {
    files: ['**/*.ts'],
    languageOptions: { globals: { ...globals.browser, WorkerOptions: 'readonly' } },
    plugins: { sonarjs, jsdoc },
    rules: { ...qualityRules, ...documentationRules },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      globals: globals.browser,
      parser: vueParser,
      parserOptions: { parser: tseslint.parser, sourceType: 'module' },
    },
    plugins: { sonarjs },
    rules: qualityRules,
  },
);
