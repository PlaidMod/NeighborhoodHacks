import { getTranslations } from 'next-intl/server'
import { BodyIcon } from '@/components/civic'
import type { BodyType } from '@/lib/contracts/bodyTypes'

// The home page's one visual idea: a single address sits under a stack of governments.
// Decorative only (aria-hidden): the headline and the form carry the meaning.
// Real logos for the Houston examples (lib/bodyLogos.ts); the MUD stays generic.
const LAYERS: { type: BodyType; id?: string }[] = [
  { type: 'city_council', id: 'houston_city_council' },
  { type: 'school_board', id: 'hisd_board' },
  { type: 'commissioners_court', id: 'commissioners_court' },
  { type: 'flood_control', id: 'flood_control' },
  { type: 'mud' },
]

export async function GovernmentStack() {
  const t = await getTranslations('Home.stack')
  const slip = 'rise rounded-2xl shadow-[0_12px_32px_-16px_rgb(27_38_59/0.25)]'
  return (
    <div aria-hidden className="mx-auto w-full max-w-md select-none">
      <ol className="space-y-3">
        {LAYERS.map(({ type, id }, i) => (
          <li
            key={type}
            className={`${slip} flex items-center gap-3 bg-white p-4 pr-5`}
            style={{ marginLeft: `${i * 6}%`, animationDelay: `${i * 70}ms` }}
          >
            <BodyIcon type={type} id={id} />
            <span className="font-bold text-ink">{t(type)}</span>
          </li>
        ))}
        <li
          className={`${slip} ml-0 bg-ink px-5 py-4 text-[0.8125rem] font-bold whitespace-nowrap text-white sm:ml-[10%] sm:text-base`}
          style={{ animationDelay: `${LAYERS.length * 70}ms` }}
        >
          {t('more')}
        </li>
      </ol>
    </div>
  )
}
