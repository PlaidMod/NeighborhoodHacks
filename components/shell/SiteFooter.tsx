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
      <div className="mx-auto flex min-h-20 max-w-7xl flex-col justify-center gap-2 px-4 py-2.5 text-sm md:flex-row md:items-center md:justify-between md:px-8 md:py-0 2xl:max-w-[1440px]">
        <div className="flex flex-col justify-center">
          <p className="site-footer-neutral font-semibold text-ink">{t('neutral')}</p>
          <p className="site-footer-project mt-1 text-xs text-muted-foreground">{t('project')}</p>
        </div>
        <nav aria-label={t('footerNavLabel')}>
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="site-footer-link font-semibold text-denim underline-offset-4 hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
