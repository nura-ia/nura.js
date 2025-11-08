/* eslint-disable */
const hasVue = (() => {
  try {
    require.resolve('eslint-plugin-vue');
    return true;
  } catch (error) {
    return false;
  }
})();

const vueExtends = hasVue
  ? [require.resolve('eslint-plugin-vue/lib/configs/vue3-recommended')]
  : [];

module.exports = {
  root: true,
  env: {
    es2021: true,
    browser: true,
    node: true
  },
  ignorePatterns: ['**/dist/**', '**/node_modules/**', '**/.vite/**', '**/coverage/**'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
    // Si usas análisis de proyecto (más lento), descomenta:
    // project: ['./tsconfig.eslint.json']
  },
  plugins: ['@typescript-eslint', 'import', 'simple-import-sort', ...(hasVue ? ['vue'] : [])],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier'
  ],
  settings: {
    'import/resolver': {
      typescript: {
        project: ['packages/*/tsconfig.json', 'apps/*/tsconfig.json'],
        alwaysTryTypes: true
      },
      node: true
    }
  },
  rules: {
    // Import health
    'import/no-unresolved': 'off', // lo resuelve TS
    'import/order': 'off',
    'simple-import-sort/imports': 'warn',
    'simple-import-sort/exports': 'warn',
    'import/export': 'off',

    // TS
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-imports': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }
    ],
    '@typescript-eslint/ban-types': 'off',

    // General
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-useless-escape': 'off'
  },
  overrides: [
    // Vue (solo si existen *.vue en el repo)
    {
      files: ['**/*.vue'],
      parser: 'vue-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      extends: vueExtends,
      rules: {
        'vue/multi-word-component-names': 'off'
      }
    },
    // Tests
    {
      files: ['**/*.spec.ts', '**/*.test.ts'],
      rules: {
        'no-console': 'off'
      }
    }
  ]
};
