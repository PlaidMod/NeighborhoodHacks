import type { Metadata } from "next"
import { Libre_Franklin, Overpass, Playfair_Display } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DevPalette } from "@/components/dev-palette"
import { ProfileProvider } from "@/lib/profile"
import "./globals.css"

// App UI. Based on Highway Gothic, the lettering on US road signs.
const overpass = Overpass({ variable: "--font-overpass", subsets: ["latin"] })

// News-only pair ("big city daily"). Used ONLY on news surfaces: see DESIGN.md.
const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin"] })
const franklin = Libre_Franklin({ variable: "--font-franklin", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ShowUp Houston: who governs your block",
  description:
    "Type your address to see every local government that affects you: what it controls, what it's deciding next, and how to be heard.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${overpass.variable} ${playfair.variable} ${franklin.variable} h-full antialiased`}>
      <body className="min-h-full">
        <ProfileProvider>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </ProfileProvider>
        <Toaster theme="light" position="top-center" />
        <DevPalette />
      </body>
    </html>
  )
}
