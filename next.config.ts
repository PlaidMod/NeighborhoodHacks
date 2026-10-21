import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

// Uses i18n/request.ts for the language, messages and time zone.
const withNextIntl = createNextIntlPlugin()

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Outside sites (like an agenda link) never see our page's full URL or query string.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig: NextConfig = {
  // The ingest route reads the source registry and manual agendas from disk at run time.
  outputFileTracingIncludes: {
    '/api/cron/ingest': ['./data/sources.yaml', './data/manual/**/*'],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default withNextIntl(nextConfig)
