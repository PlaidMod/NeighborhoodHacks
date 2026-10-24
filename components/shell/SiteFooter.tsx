import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export async function SiteFooter() {
  const t = await getTranslations('Shell')
  const links = [
    { href: '/about', label: t('about') },
    { href: '/privacy', label: t('privacy') },
    { href: '/terms', label: t('terms') },
  ]
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-7xl px-4 py-3 text-sm md:px-8 2xl:max-w-[1440px]">
        <p className="font-semibold text-ink">{t('neutral')}</p>
        <nav aria-label={t('footerNavLabel')} className="mt-1">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="font-semibold text-denim underline-offset-4 hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="mt-1 text-muted-foreground">{t('project')}</p>
      </div>
    </footer>
  )
}
