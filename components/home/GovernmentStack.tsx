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
    <div aria-hidden className="mx-auto w-full max-w-[560px] select-none">
      <ol className="space-y-2">
        {LAYERS.map(({ type, id }, i) => (
          <li
            key={type}
            className={`${slip} flex h-[72px] items-center gap-3 bg-white/95 px-4 pr-5`}
            style={{
              width: `calc(100% - ${i * 8}%)`,
              marginLeft: `${i * 8}%`,
              animationDelay: `${i * 70}ms`,
            }}
          >
            <BodyIcon type={type} id={id} />
            <span className="font-bold text-ink">{t(type)}</span>
          </li>
        ))}
        <li
          className={`${slip} flex h-[72px] items-center bg-ink px-4 text-base font-bold whitespace-nowrap text-white`}
          style={{
            width: `calc(100% - ${LAYERS.length * 8}%)`,
            marginLeft: `${LAYERS.length * 8}%`,
            animationDelay: `${LAYERS.length * 70}ms`,
          }}
        >
          {t('more')}
        </li>
      </ol>
    </div>
  )
}
