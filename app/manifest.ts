import type { MetadataRoute } from 'next'

// Lets readers add ShowUp HTX to their Home Screen. iPhones and iPads only allow browser
// notifications for sites opened from the Home Screen (iOS 16.4+), so alerts need this.
// Colors are the --surface and --brick tokens from app/globals.css.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ShowUp HTX',
    short_name: 'ShowUp HTX',
    description: 'Every local government that affects your Houston-area address, what each one is deciding next, and how to speak up before the vote.',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    background_color: '#faf7f2',
    theme_color: '#b23a48',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
