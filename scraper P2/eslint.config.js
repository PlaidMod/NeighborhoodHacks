import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['web/**', 'node_modules/**', 'tmp/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // D26/D32 isolation: agenda code must never depend on the news module.
    files: ['lib/adapters/**', 'lib/ingest/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/lib/news', '@/lib/news/**', '**/news/**', '../news', '../news/*', './news', './news/*'],
              message: 'lib/adapters and lib/ingest must not import lib/news (D26, D32).',
            },
          ],
        },
      ],
    },
  },
);
