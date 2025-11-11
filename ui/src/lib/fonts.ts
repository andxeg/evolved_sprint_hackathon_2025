import { Inter as FontSans,JetBrains_Mono as FontMono } from "next/font/google"
// import { GeistMono } from "geist/font/mono"
// import { GeistSans } from 'geist/font/sans'

export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: 'swap',
  preload: true,
})

export const fontMono = FontMono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  preload: true,
})
