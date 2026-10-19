/**
 * Cookie settings for the admin sign-in session. The app has no browser-side Supabase client,
 * so page scripts never need these cookies: httpOnly keeps them out of reach of any injected
 * script, and Secure keeps them off plain HTTP in production. (The @supabase/ssr default is
 * httpOnly: false, with no Secure flag.)
 */
export function authCookieOptions(nodeEnv: string | undefined = process.env.NODE_ENV) {
  return { httpOnly: true, secure: nodeEnv === 'production', sameSite: 'lax' as const, path: '/' }
}
