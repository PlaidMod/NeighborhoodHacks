import { createCoachHandler } from '@/lib/coach/http'
import { sharedCoachProvider, sharedCoachStore } from '@/lib/coach/shared'
import { getOptionalEnv } from '@/lib/env'
import { llmConfigured } from '@/lib/openrouter'
import { bodiesFor } from '@/lib/prototype/bodies'
import { updatesFor } from '@/lib/prototype/updates'
import { ZIPS } from '@/lib/prototype/zips'
import { getRecipe } from '@/lib/registration/recipes'
import { isSpeakItem, speakingTarget } from '@/lib/speak/items'
import { loadItem } from '@/lib/weekly/data'

export const runtime = 'nodejs'

const sharedReady = !!(getOptionalEnv('SUPABASE_URL') && getOptionalEnv('SUPABASE_SERVICE_ROLE_KEY') && getOptionalEnv('IP_HASH_SECRET'))
export const POST = createCoachHandler({
  provider: llmConfigured() ? sharedCoachProvider : undefined,
  store: sharedReady ? sharedCoachStore : undefined,
  digestSecret: sharedReady ? getOptionalEnv('IP_HASH_SECRET') : undefined,
  // x-real-ip on Vercel, which overwrites it so visitors can't fake it. Unset, every visitor
  // shares one IP budget of 20 coach calls an hour.
  trustedIpHeader: getOptionalEnv('COACH_TRUSTED_IP_HEADER'),
  async resolveItem(id, zip) {
    if (/^[0-9a-f-]{36}$/i.test(id) || id.startsWith('sample-')) {
      const item = await loadItem(id)
      if (!item || item.status === 'decided' || item.meeting_status === 'cancelled') return null
      return {
        id: item.item_id, title: item.title, summary: item.title, why: '', audiences: [],
        source: item.source_url, bodyName: item.body_name, isSample: !!item.is_sample,
        minutes: speakingTarget(getRecipe(item.body_id, item.meeting_type, item.meeting_date)).minutes,
      }
    }
    const jurisdiction = Object.hasOwn(ZIPS, zip) ? ZIPS[zip] : undefined
    if (!jurisdiction) return null
    const item = updatesFor(jurisdiction).find(update => update.id === id && isSpeakItem(update))
    if (!item) return null
    const body = bodiesFor(jurisdiction).find(body => body.id === item.bodyId)
    return { id: item.id, title: item.title, summary: item.summary, why: item.why.default,
      audiences: item.audiences, source: item.source, bodyName: body?.name ?? item.bodyId,
      minutes: speakingTarget(getRecipe(item.bodyId, undefined, item.date)).minutes, isSample: true }
  },
})
