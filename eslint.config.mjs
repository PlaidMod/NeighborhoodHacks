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
    // P2 (scraper spec Step 11): news never feeds agenda data, so ingest code can't import it.
    files: ['lib/adapters/**', 'lib/ingest/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [{ group: ['@/lib/news/*', '**/lib/news/*', '../news/*'], message: 'News must not feed agenda data (scraper spec D26).' }] },
      ],
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'web/**', 'node_modules/**']),
])
