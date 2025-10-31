"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { HistorialCierres } from "@/components/historial-cierres"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { ArrowLeft, Download } from "lucide-react"
import { getCierresBitacora, deleteCierreBitacora, getEventosPorIds } from "@/lib/cierre-bitacora-service"
import { getVehiculos } from "@/lib/vehiculos-service"
import type { BitacoraCierre } from "@/lib/types"
import type { Vehiculo } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"
import { getFechaHoyLocal } from "@/lib/bitacora-config"
import { ExportReportButton } from "@/components/export-report-button"
import { generarReporteCierresBitacora } from "@/lib/reportes/bitacora-reports"

export default function HistorialCierresBitacoraPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cierres, setCierres] = useState<BitacoraCierre[]>([])
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const router = useRouter()
  const { toast } = useToast()

  // Filtros
  const [vehiculoFiltro, setVehiculoFiltro] = useState("all")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState(getFechaHoyLocal())
  const [turnoFiltro, setTurnoFiltro] = useState<"all" | "diurno" | "nocturno" | "mixto">("all")

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
      await loadVehiculos()
      await loadCierres()
      setLoading(false)
    }

    checkAuth()
  }, [router])

  async function loadVehiculos() {
    try {
      const data = await getVehiculos()
      setVehiculos(data.filter(v => v.activo))
    } catch (error) {
      console.error("Error al cargar vehículos:", error)
    }
  }

  async function loadCierres() {
    try {
      setLoading(true)
      const filtros: any = {}

      if (vehiculoFiltro && vehiculoFiltro !== "all") filtros.vehiculo_id = vehiculoFiltro
      if (fechaDesde) filtros.fecha_desde = fechaDesde
      if (fechaHasta) filtros.fecha_hasta = fechaHasta
      if (turnoFiltro && turnoFiltro !== "all") filtros.turno = turnoFiltro

      const data = await getCierresBitacora(filtros)
      setCierres(data)
    } catch (error) {
      console.error("Error al cargar cierres:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los cierres de bitácora",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleEliminarCierre(id: string) {
    if (!confirm("¿Estás seguro de eliminar este cierre de bitácora?")) return

    try {
      await deleteCierreBitacora(id)
      toast({
        title: "Cierre eliminado",
        description: "El cierre de bitácora ha sido eliminado exitosamente",
      })
      await loadCierres()
    } catch (error) {
      console.error("Error al eliminar cierre:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el cierre",
        variant: "destructive",
      })
    }
  }

  async function handleExportarPDF(cierre: BitacoraCierre) {
    try {
      // Obtener eventos del cierre
      const eventos = await getEventosPorIds(cierre.eventos_ids)

      toast({
        title: "Exportando a PDF",
        description: "Generando documento PDF...",
      })

      // TODO: Implementar exportación PDF
      console.log("Exportar PDF:", cierre, eventos)

      toast({
        title: "Funcionalidad en desarrollo",
        description: "La exportación PDF estará disponible pronto",
      })
    } catch (error) {
      console.error("Error al exportar PDF:", error)
      toast({
        title: "Error",
        description: "No se pudo exportar el cierre a PDF",
        variant: "destructive",
      })
    }
  }

  async function handleExportarExcel(cierre: BitacoraCierre) {
    try {
      // Obtener eventos del cierre
      const eventos = await getEventosPorIds(cierre.eventos_ids)

      toast({
        title: "Exportando a Excel",
        description: "Generando archivo Excel...",
      })

      // TODO: Implementar exportación Excel
      console.log("Exportar Excel:", cierre, eventos)

      toast({
        title: "Funcionalidad en desarrollo",
        description: "La exportación Excel estará disponible pronto",
      })
    } catch (error) {
      console.error("Error al exportar Excel:", error)
      toast({
        title: "Error",
        description: "No se pudo exportar el cierre a Excel",
        variant: "destructive",
      })
    }
  }

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
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/bitacora">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Historial de Cierres de Bitácora</h1>
            <p className="text-muted-foreground">
              Consulta y descarga los cierres de bitácora por vehículo
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportReportButton
            reportData={() => generarReporteCierresBitacora(cierres, {
              vehiculo: vehiculoFiltro !== "all" ? vehiculos.find(v => v.id === vehiculoFiltro)?.placa : undefined,
              fechaDesde,
              fechaHasta,
              turno: turnoFiltro !== "all" ? turnoFiltro : undefined,
            })}
            label="Exportar"
            disabled={cierres.length === 0}
          />
          <Button variant="outline" onClick={() => loadCierres()}>
            <Download className="h-4 w-4 mr-2" />
            Recargar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Vehículo</Label>
              <Select value={vehiculoFiltro} onValueChange={setVehiculoFiltro}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los vehículos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {vehiculos.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.placa} - {v.marca} {v.modelo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha Desde</Label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha Hasta</Label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Turno</Label>
              <Select value={turnoFiltro} onValueChange={(v) => setTurnoFiltro(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los turnos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="diurno">Diurno</SelectItem>
                  <SelectItem value="nocturno">Nocturno</SelectItem>
                  <SelectItem value="mixto">Mixto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={loadCierres}>Aplicar Filtros</Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Cierres */}
      <HistorialCierres
        cierres={cierres}
        onEliminarCierre={handleEliminarCierre}
        onExportarPDF={handleExportarPDF}
        onExportarExcel={handleExportarExcel}
        loading={loading}
      />
    </div>
  )
}
