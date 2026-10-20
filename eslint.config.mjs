import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Copy is full of apostrophes; escaping them hurts readability
    rules: { 'react/no-unescaped-entities': 'off' },
  },
  {
    // A leading underscore marks a value that's unused on purpose (P2's convention).
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // D26/D32 isolation (scraper spec): agenda code must never depend on the news module.
    // tests/unit/news-isolation.test.ts checks this rule.
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
  {
    // Perspectives spec §8: classify, stories and texts never see news coverage.
    files: ['lib/rules/**', 'lib/stories/**', 'lib/sms/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/lib/news', '@/lib/news/**', '@/lib/perspectives', '@/lib/perspectives/**', '**/news/**', '**/perspectives/**'],
              message: 'lib/rules, lib/stories and lib/sms must not import news or perspectives (perspectives spec §8).',
            },
          ],
        },
      ],
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'web/**', 'node_modules/**', 'tmp/**']),
])
