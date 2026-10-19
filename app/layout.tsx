import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ShowUp HTX',
  description: 'Type your address to see every local government that affects you, what it is deciding next, and how to be heard.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
