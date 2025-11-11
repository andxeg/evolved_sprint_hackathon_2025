import './globals.css'

import { Metadata, Viewport } from 'next'
import { ReactNode } from 'react'

import { ThemeProvider } from '@/components/providers'
import { TailwindIndicator } from '@/components/tailwind-indicator'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { Toaster as DefaultToaster } from '@/components/ui/toaster'
import { siteConfig } from '@/config/site'
import { fontSans } from '@/lib/fonts'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`
  },
  metadataBase: new URL(siteConfig.url),
  description: siteConfig.description,
  keywords: [
    'Fastfold AI Evolved Hackathon',
    'Modeling Biological Systems and Biological Systems',
  ],
  authors: [],
  creator: 'Fastfold AI',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    title: siteConfig.name,
    description: siteConfig.description,
    siteName: siteConfig.name
  },
  manifest: '/site.webmanifest'
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1 // Prevent zooming on mobile
}

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <>
      <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
        <head>
          <link
            rel="apple-touch-icon"
            sizes="180x180"
            href="/apple-touch-icon.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="32x32"
            href="/favicon-32x32.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="16x16"
            href="/favicon-16x16.png"
          />
          <link rel="manifest" href="/site.webmanifest" />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Suppress non-critical console warnings
                (function() {
                  const originalWarn = console.warn;
                  console.warn = function(...args) {
                    const msg = args[0]?.toString() || '';
                    if (msg.includes('Vercel Web Analytics') || msg.includes('Failed to load script from /_vercel/insights')) {
                      return;
                    }
                    originalWarn.apply(console, args);
                  };
                  
                  const originalError = console.error;
                  console.error = function(...args) {
                    const msg = args[0]?.toString() || '';
                    // Only suppress font preload warnings (performance hints)
                    if (msg.includes('was preloaded using link preload but not used')) {
                      return;
                    }
                    originalError.apply(console, args);
                  };
                })();
              `,
            }}
          />
        </head>
        <body
          className={cn(
            ' bg-background font-sans antialiased',
            fontSans.variable
          )}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >

              <div vaul-drawer-wrapper="">
                <div className="relative flex  flex-col bg-background  px-32">
                  {children}
                </div>
              </div>
              <TailwindIndicator />
              <ThemeSwitcher />
              <DefaultToaster />

          </ThemeProvider>
        </body>
      </html>
    </>
  )
}
