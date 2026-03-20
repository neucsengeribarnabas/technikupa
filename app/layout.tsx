import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { ClientProviders } from '@/components/client-providers'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Technikupa - Torna Kezelő',
  description: 'Teljes funkcionalitású tornakezelő és ágrajz megjelenítő alkalmazás csoportkörökkel, egyenes kieséses szakasszal és FIFA döntetlen szabályokkal.',
  generator: 'v0.app',
  icons: {
    icon: '/favicon.jpg?v=1',
    apple: '/favicon.jpg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="hu" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <ClientProviders>
            {children}
          </ClientProviders>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
