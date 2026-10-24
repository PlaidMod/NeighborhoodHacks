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
    <footer className="landing-site-footer border-t border-line bg-canvas">
      <div className="mx-auto max-w-7xl px-4 py-2.5 text-sm md:px-8 2xl:max-w-[1440px]">
        <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
          <p className="font-semibold text-ink">{t('neutral')}</p>
          <nav aria-label={t('footerNavLabel')}>
            <ul className="flex flex-wrap gap-x-5 gap-y-1">
              {links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="font-semibold text-denim underline-offset-4 hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t('project')}</p>
      </div>
    </footer>
  )
}
