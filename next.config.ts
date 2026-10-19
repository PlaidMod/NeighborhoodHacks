import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

// Uses i18n/request.ts for the language, messages and time zone.
const withNextIntl = createNextIntlPlugin()

const nextConfig: NextConfig = {}

export default withNextIntl(nextConfig)
