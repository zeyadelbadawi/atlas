import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

/**
 * Files that ship with the project template. They are intentionally excluded
 * from the stricter Atlas rule set so template updates never break linting.
 */
const TEMPLATE_OWNED_FILES = [
  'src/components/ui/**',
  'src/components/blog/**',
  'src/pages/blog/**',
  'src/blog-routes.tsx',
  'src/pages/AuthCallback.tsx',
  'src/pages/AuthError.tsx',
  'src/lib/**',
  'src/hooks/use-mobile.tsx',
  'src/hooks/use-toast.ts',
  'src/main.tsx',
];

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/components/ui/**', 'src/contexts/**'],
    rules: {
      'no-redeclare': 'off',
      '@typescript-eslint/no-redeclare': 'error',
    },
  },
  {
    // Atlas Constitution enforcement (Chapter 5, Chapter 10).
    files: ['src/**/*.{ts,tsx}'],
    ignores: TEMPLATE_OWNED_FILES,
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-console': 'error',
      'no-alert': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../*', '../../../*'],
              message:
                'Use Atlas path aliases (@ui, @hooks, @services, @utils, ...) instead of deep relative imports.',
            },
            {
              group: ['@features/*/*'],
              message:
                'Features must not reach into another feature. Depend on shared packages only.',
            },
          ],
        },
      ],
    },
  }
);