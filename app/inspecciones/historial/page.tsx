"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { DashboardTable } from "@/components/dashboard-table"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"

export default function HistorialInspeccionesPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth")
        return
      }

      setUser(user)
      setLoading(false)
    }

    checkAuth()
  }, [router])

  if (!user || loading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Historial de Inspecciones</h1>
          <p className="text-muted-foreground">Consulta y gestiona todas las inspecciones realizadas</p>
        </div>
        <Button asChild>
          <Link href="/inspecciones/nueva">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Inspección
          </Link>
        </Button>
      </div>

      {/* Tabla de Inspecciones */}
      <DashboardTable />
    </div>
  )
}
