"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, FileDown, FileSpreadsheet } from "lucide-react"
import { PERIODOS_REPORTE, getFechasPorPeriodo } from "@/lib/bitacora-config"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface PeriodoSelectorProps {
  onExportar: (
    tipo: "pdf" | "excel",
    periodo: { nombre: string; desde: string; hasta: string }
  ) => Promise<void>
}

export function PeriodoSelector({ onExportar }: PeriodoSelectorProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [tipoExport, setTipoExport] = useState<"pdf" | "excel">("pdf")
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState("hoy")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [exportando, setExportando] = useState(false)

  const handleExportar = async () => {
    setExportando(true)
    try {
      let periodo: { nombre: string; desde: string; hasta: string }

      if (periodoSeleccionado === "personalizado") {
        if (!fechaDesde || !fechaHasta) {
          alert("Debe seleccionar ambas fechas")
          return
        }
        periodo = {
          nombre: "Personalizado",
          desde: fechaDesde,
          hasta: fechaHasta,
        }
      } else {
        const fechas = getFechasPorPeriodo(periodoSeleccionado)
        const periodoConfig = PERIODOS_REPORTE.find((p) => p.id === periodoSeleccionado)
        periodo = {
          nombre: periodoConfig?.nombre || periodoSeleccionado,
          desde: fechas.desde,
          hasta: fechas.hasta,
        }
      }

      await onExportar(tipoExport, periodo)
      setDialogOpen(false)
    } finally {
      setExportando(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            onClick={() => {
              setTipoExport("pdf")
              setDialogOpen(true)
            }}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Exportar a PDF
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setTipoExport("excel")
              setDialogOpen(true)
            }}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar a Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Exportar a {tipoExport === "pdf" ? "PDF" : "Excel"}
            </DialogTitle>
            <DialogDescription>
              Seleccione el período que desea exportar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={periodoSeleccionado} onValueChange={setPeriodoSeleccionado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODOS_REPORTE.map((periodo) => (
                    <SelectItem key={periodo.id} value={periodo.id}>
                      {periodo.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {periodoSeleccionado === "personalizado" && (
              <div className="grid grid-cols-2 gap-4 border-l-2 border-primary pl-4">
                <div className="space-y-2">
                  <Label>Desde</Label>
                  <Input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hasta</Label>
                  <Input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={exportando}>
              Cancelar
            </Button>
            <Button onClick={handleExportar} disabled={exportando}>
              {exportando ? "Exportando..." : "Exportar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
