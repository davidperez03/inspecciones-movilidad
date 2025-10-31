"use client"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import Header from "@/components/header"

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
