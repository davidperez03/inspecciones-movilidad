"use client"

import { usePathname } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export default function Header() {
  const pathname = usePathname()

  // No mostrar header en la página de auth
  if (pathname.startsWith('/auth')) {
    return null
  }

  // Obtener el título de la página según la ruta
  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard'
    if (pathname === '/inspecciones/nueva') return 'Nueva Inspección'
    if (pathname === '/bitacora') return 'Bitácora'
    if (pathname === '/inspecciones/historial') return 'Historial de Inspecciones'
    if (pathname === '/bitacora/historial') return 'Historial de Bitácoras'
    if (pathname === '/vehiculos') return 'Gestión de Vehículos'
    if (pathname === '/recurso-humano') return 'Gestión de Recurso Humano'
    if (pathname.startsWith('/inspecciones/') && pathname !== '/inspecciones/historial' && pathname !== '/inspecciones/nueva') return 'Detalle de Inspección'
    return 'Sistema de Inspecciones'
  }

  return (
    <header className="flex h-14 md:h-16 shrink-0 items-center gap-2 border-b px-3 md:px-4 sticky top-0 z-40 bg-background">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className="text-base md:text-lg font-semibold truncate">{getPageTitle()}</h1>
    </header>
  )
}
