import { describe, expect, it, vi } from 'vitest'
import { MAX_PUSH_BODY, confirmationNotice, itemNotice, reminderNotice } from '@/lib/push/message'
import { createPushSender, pushConfigFromEnv } from '@/lib/push/send'
import { isAllowedPushEndpoint, parsePushSubscription } from '@/lib/push/subscription'

const deadline = { meeting_at: '2026-10-22T17:00:00-05:00', registration_closes_at: '2026-10-21T12:00:00-05:00' }
const P256DH = 'B' + 'A'.repeat(86)
const AUTH = 'Q'.repeat(22)
const target = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc123', p256dh: P256DH, auth: AUTH }

describe('notification wording', () => {
  it('puts the government in the title and the headline and deadline in the body', () => {
    const n = itemNotice(
      { body: 'HISD board', headline: 'Board to vote on closing 9 campuses.', deadline, link: 'https://showup.example/items/i1?why=school_change', tag: 'school_change:i1' },
      'en',
    )
    expect(n).toEqual({
      title: 'HISD board',
      body: 'Board to vote on closing 9 campuses. Sign-up to speak closes Wed, Oct 21, 12:00 PM.',
      url: 'https://showup.example/items/i1?why=school_change',
      tag: 'school_change:i1',
      lang: 'en',
    })
  })

  it('never ends a Spanish time with two periods', () => {
    const n = itemNotice({ body: 'HISD', headline: 'Votación', deadline, link: 'https://s/1', tag: 't' }, 'es')
    expect(n.body).toBe('Votación. La inscripción para hablar cierra el mié 21 de oct, 12:00 p.m.')
  })

  it('shortens long headlines but keeps the deadline', () => {
    const n = itemNotice({ body: 'MUD 489', headline: 'x '.repeat(300), deadline, link: 'https://s/1', tag: 't' }, 'en')
    expect(n.body.length).toBeLessThanOrEqual(MAX_PUSH_BODY)
    expect(n.body).toMatch(/… Sign-up to speak closes Wed, Oct 21, 12:00 PM\.$/)
  })

  it('writes reminders without the text-only link and STOP line', () => {
    const a = { body: 'City Council', title: 'Public hearing on water rates.', at: '2026-10-19T15:00:00-05:00', link: 'https://s/2', tag: 'r' }
    expect(reminderNotice('registration_opens', a, 'en')).toMatchObject({
      title: 'City Council',
      body: 'Registration to speak on "Public hearing on water rates" opens today (Mon, Oct 19, 3:00 PM).',
      url: 'https://s/2',
    })
    expect(reminderNotice('registration_closes', a, 'es').body).toBe(
      'La inscripción para hablar sobre "Public hearing on water rates" cierra el lun 19 de oct, 3:00 p.m.',
    )
    expect(reminderNotice('protest_deadline', { ...a, body: 'HCAD', title: '' }, 'en')).toMatchObject({
      title: 'HCAD',
      body: "Your deadline to protest your home's appraised value is Mon, Oct 19, 3:00 PM.",
    })
  })

  it('confirms sign-up in the reader’s language and links to the alerts page', () => {
    const n = confirmationNotice('es', 'https://showup.example/')
    expect(n.title).toBe('ShowUp HTX')
    expect(n.body).toMatch(/^Activaste las notificaciones/)
    expect(n.url).toBe('https://showup.example/app/alerts')
    expect(confirmationNotice('en', 'https://showup.example').body).toMatch(/^Notifications are on/)
  })
})

describe('push subscriptions', () => {
  it('accepts the browser push services and nothing else', () => {
    for (const ok of [
      'https://fcm.googleapis.com/fcm/send/abc',
      'https://updates.push.services.mozilla.com/wpush/v2/abc',
      'https://web.push.apple.com/QAbc',
      'https://wns2-par02p.notify.windows.com/w/?token=abc',
    ]) {
      expect(isAllowedPushEndpoint(ok)).toBe(true)
    }
    for (const bad of [
      'http://fcm.googleapis.com/fcm/send/abc',
      'https://fcm.googleapis.com.evil.example/x',
      'https://evilnotify.windows.com/x',
      'https://169.254.169.254/latest/meta-data',
      'https://localhost/x',
      'not a url',
    ]) {
      expect(isAllowedPushEndpoint(bad)).toBe(false)
    }
  })

  it('parses what PushSubscription.toJSON() returns', () => {
    expect(parsePushSubscription({ endpoint: target.endpoint, expirationTime: null, keys: { p256dh: P256DH, auth: AUTH } })).toEqual(target)
  })

  it('rejects other push hosts and malformed keys', () => {
    expect(parsePushSubscription({ endpoint: 'https://attacker.example/x', keys: { p256dh: P256DH, auth: AUTH } })).toBeNull()
    expect(parsePushSubscription({ endpoint: target.endpoint, keys: { p256dh: 'short', auth: AUTH } })).toBeNull()
    expect(parsePushSubscription({ endpoint: target.endpoint, keys: { p256dh: P256DH, auth: 'a b' } })).toBeNull()
    expect(parsePushSubscription(null)).toBeNull()
  })
})

describe('push sender', () => {
  const config = { publicKey: 'pub', privateKey: 'priv', subject: 'https://showup.example' }
  const notice = itemNotice({ body: 'HISD board', headline: 'Vote', deadline, link: 'https://s/1', tag: 't' }, 'en')

  it('sends the notice as JSON with our keys and a one-day lifetime', async () => {
    const send = vi.fn(async () => ({ statusCode: 201, body: '', headers: {} }))
    expect(await createPushSender(config, send)(target, notice)).toBe('sent')
    expect(send).toHaveBeenCalledWith({ endpoint: target.endpoint, keys: { p256dh: P256DH, auth: AUTH } }, JSON.stringify(notice), {
      TTL: 86_400,
      urgency: 'normal',
      vapidDetails: config,
    })
  })

  it('reports an expired subscription as gone', async () => {
    for (const statusCode of [404, 410]) {
      const send = vi.fn(async () => {
        throw Object.assign(new Error('Received unexpected response code'), { statusCode, endpoint: target.endpoint })
      })
      expect(await createPushSender(config, send)(target, notice)).toBe('gone')
    }
  })

  it('never contacts a host that is not a push service', async () => {
    const send = vi.fn()
    expect(await createPushSender(config, send)({ ...target, endpoint: 'https://attacker.example/x' }, notice)).toBe('gone')
    expect(send).not.toHaveBeenCalled()
  })

  it('throws other failures without the push address in the message', async () => {
    const send = vi.fn(async () => {
      throw Object.assign(new Error(`failed for ${target.endpoint}`), { statusCode: 500, endpoint: target.endpoint })
    })
    const error = await createPushSender(config, send)(target, notice).catch((e: Error) => e)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe('push service answered 500')
  })

  it('explains failures that never reached the push service, with web addresses removed', async () => {
    const keyError = vi.fn(async () => {
      throw new Error('Vapid private key should be 32 bytes long when decoded.')
    })
    await expect(createPushSender(config, keyError)(target, notice)).rejects.toThrow('push failed: Vapid private key should be 32 bytes long when decoded.')
    const network = vi.fn(async () => {
      throw new Error(`connect ETIMEDOUT for ${target.endpoint}`)
    })
    await expect(createPushSender(config, network)(target, notice)).rejects.toThrow('push failed: connect ETIMEDOUT for [url]')
  })

  it('needs both keys and an https or mailto contact', () => {
    vi.stubEnv('VAPID_PUBLIC_KEY', 'pub')
    vi.stubEnv('VAPID_PRIVATE_KEY', 'priv')
    vi.stubEnv('VAPID_SUBJECT', '')
    vi.stubEnv('SITE_URL', 'http://localhost:3000')
    expect(pushConfigFromEnv()).toBeNull()
    vi.stubEnv('SITE_URL', 'https://showup.example')
    expect(pushConfigFromEnv()).toEqual({ publicKey: 'pub', privateKey: 'priv', subject: 'https://showup.example' })
    vi.stubEnv('VAPID_SUBJECT', 'mailto:team@showup.example')
    expect(pushConfigFromEnv()?.subject).toBe('mailto:team@showup.example')
    vi.stubEnv('VAPID_PRIVATE_KEY', '')
    expect(pushConfigFromEnv()).toBeNull()
    vi.unstubAllEnvs()
  })
})
