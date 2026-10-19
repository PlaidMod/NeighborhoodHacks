import { getTranslations } from 'next-intl/server'
import { BodyIcon } from '@/components/civic'
import type { BodyType } from '@/lib/contracts/bodyTypes'

// The home page's one visual idea: a single address sits under a stack of governments.
// Decorative only (aria-hidden): the headline and the form carry the meaning.
const LAYERS: BodyType[] = ['city_council', 'school_board', 'commissioners_court', 'flood_control', 'mud']

export async function GovernmentStack() {
  const t = await getTranslations('Home.stack')
  const slip = 'rise rounded-2xl shadow-[0_12px_32px_-16px_rgb(27_38_59/0.25)]'
  return (
    <div aria-hidden className="mx-auto w-full max-w-sm select-none">
      <ol className="space-y-2.5">
        {LAYERS.map((type, i) => (
          <li
            key={type}
            className={`${slip} flex items-center gap-3 bg-white p-3 pr-5`}
            style={{ marginLeft: `${i * 6}%`, animationDelay: `${i * 70}ms` }}
          >
            <BodyIcon type={type} />
            <span className="font-bold text-ink">{t(type)}</span>
          </li>
        ))}
        <li
          className={`${slip} bg-ink px-5 py-4 font-bold text-balance text-white`}
          style={{ marginLeft: `${LAYERS.length * 6}%`, animationDelay: `${LAYERS.length * 70}ms` }}
        >
          {t('more')}
        </li>
      </ol>
    </div>
  )
}
