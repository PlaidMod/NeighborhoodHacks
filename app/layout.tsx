import type { Metadata } from 'next'
import { Libre_Franklin, Overpass, Playfair_Display } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getTranslations } from 'next-intl/server'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import './globals.css'

// App UI. Based on Highway Gothic, the lettering on US road signs.
const overpass = Overpass({ variable: '--font-overpass', subsets: ['latin'] })

// News-only pair ("big city daily"). Used ONLY on news surfaces: see DESIGN.md.
const playfair = Playfair_Display({ variable: '--font-playfair', subsets: ['latin'] })
const franklin = Libre_Franklin({ variable: '--font-franklin', subsets: ['latin'] })

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Metadata')
  return { title: t('title'), description: t('description') }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale()
  return (
    <html lang={locale} className={`${overpass.variable} ${playfair.variable} ${franklin.variable} h-full antialiased`}>
      <body className="min-h-full">
        <NextIntlClientProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </NextIntlClientProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  )
}
