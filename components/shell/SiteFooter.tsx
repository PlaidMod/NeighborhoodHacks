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
        <div className="flex flex-col items-center gap-1.5 text-center md:flex-row md:justify-center md:gap-6">
          <p className="font-semibold text-ink">{t('neutral')}</p>
          <nav aria-label={t('footerNavLabel')}>
            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1">
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
        <p className="mt-1 text-center text-xs text-muted-foreground">{t('project')}</p>
      </div>
    </footer>
  )
}
