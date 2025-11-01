import type { ReactNode } from "react"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/components/auth-provider"
import { SidebarLayout } from "@/components/sidebar-layout"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Sistema de Inspección de Grúas Plataforma",
  description: "Aplicación para registro de inspecciones diarias de grúas tipo plataforma según normativa colombiana",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <AuthProvider>
            <SidebarLayout>
              {children}
            </SidebarLayout>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
