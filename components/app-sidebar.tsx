"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  FileText,
  BookOpen,
  ClipboardList,
  History,
  Plus,
  LogOut,
  User,
  Truck,
  Users,
  BarChart3
} from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

const navigationGroups = [
  {
    title: "Dashboard",
    items: [
      {
        name: "Dashboard",
        href: "/dashboard",
        icon: Home,
        description: "Vista general del sistema"
      }
    ]
  },
  {
    title: "Inspecciones",
    items: [
      {
        name: "Nueva Inspección",
        href: "/inspecciones/nueva",
        icon: Plus,
        description: "Crear nueva inspección"
      },
      {
        name: "Historial",
        href: "/inspecciones/historial",
        icon: ClipboardList,
        description: "Ver inspecciones anteriores"
      }
    ]
  },
  {
    title: "Bitácoras",
    items: [
      {
        name: "Bitácora",
        href: "/bitacora",
        icon: BookOpen,
        description: "Gestionar bitácoras"
      },
      {
        name: "Historial",
        href: "/bitacora/historial",
        icon: History,
        description: "Ver bitácoras anteriores"
      }
    ]
  },
  {
    title: "Gestión",
    items: [
      {
        name: "Vehículos",
        href: "/vehiculos",
        icon: Truck,
        description: "Gestionar vehículos y documentos"
      },
      {
        name: "Recurso Humano",
        href: "/recurso-humano",
        icon: Users,
        description: "Gestionar personal y licencias"
      }
    ]
  },
  {
    title: "Reportes",
    items: [
      {
        name: "Reportes de Personal",
        href: "/reportes-personal",
        icon: BarChart3,
        description: "Historial y estadísticas de personal"
      }
    ]
  }
]

export function AppSidebar() {
  const pathname = usePathname()
  const { signOut, user } = useAuth()

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <Link href="/dashboard" className="flex items-center gap-3 px-4 py-4 hover:bg-sidebar-accent rounded-md transition-colors">
          <FileText className="h-6 w-6 text-primary flex-shrink-0" />
          <div className="flex flex-col">
            <span className="font-bold text-base">Sistema de</span>
            <span className="font-bold text-base">Inspecciones</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {navigationGroups.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="px-3 py-2 text-xs uppercase tracking-wider font-semibold">{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.href

                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={item.description} className="h-11 px-3">
                        <Link href={item.href}>
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          <span className="text-sm font-medium">{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="h-14 px-3">
                  <User className="h-5 w-5 flex-shrink-0" />
                  <div className="flex flex-col items-start text-sm min-w-0 flex-1">
                    <span className="font-medium">Usuario</span>
                    {user?.email && (
                      <span className="text-xs text-muted-foreground truncate w-full">
                        {user.email}
                      </span>
                    )}
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                {user?.email && (
                  <>
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {user.email}
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={signOut} className="flex items-center gap-2 h-10">
                  <LogOut className="h-4 w-4" />
                  Cerrar Sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
