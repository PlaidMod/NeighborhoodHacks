import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getTranslations } from 'next-intl/server'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ResultsOnboarding } from '@/components/home/ResultsOnboarding'
import './globals.css'

// App UI: a clean neo-grotesk (the teammate picked it from the Lisso dashboard reference).
const geist = Geist({ variable: '--font-geist', subsets: ['latin'] })

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return { title: t('title'), description: t('description') }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale()
  return (
    <html lang={locale} className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full">
        <NextIntlClientProvider>
          <TooltipProvider delayDuration={200}>
            {children}
            <ResultsOnboarding />
          </TooltipProvider>
        </NextIntlClientProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
