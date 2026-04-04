import type { Metadata } from "next"
import { Space_Grotesk, DM_Sans, IBM_Plex_Mono, Geist } from "next/font/google"
import type { ReactNode } from "react"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

// Display font for headings - bold, technical
const geistHeading = Geist({subsets:['latin'],variable:'--font-heading'})

// Body font - clean, readable
const dmSans = DM_Sans({subsets:['latin'],variable:'--font-sans'})

// Monospace for technical data
const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
  title: "Rook Digital Twin | Locomotive Telemetry",
  description: "Real-time locomotive telemetry visualization and monitoring dashboard with advanced health analytics.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
              "antialiased",
              fontMono.variable
            , "font-sans", dmSans.variable, geistHeading.variable)}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
