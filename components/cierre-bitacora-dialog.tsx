"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CalendarIcon, TrendingUpIcon, TrendingDownIcon, FileTextIcon } from "lucide-react"
import { createCierreBitacora, calcularResumenCierre, getEventosPorIds } from "@/lib/cierre-bitacora-service"
import { getOperarios } from "@/lib/recurso-humano-service"
import type { Operario } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface CierreBitacoraDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehiculoId: string
  vehiculoPlaca: string
  eventosIds: string[]
  onCierreCreado: () => void
  userId: string
}

export function CierreBitacoraDialog({
  open,
  onOpenChange,
  vehiculoId,
  vehiculoPlaca,
  eventosIds,
  onCierreCreado,
  userId,
}: CierreBitacoraDialogProps) {
  const { toast } = useToast()
  const [operarios, setOperarios] = useState<Operario[]>([])
  const [operarioId, setOperarioId] = useState<string>("")
  const [observaciones, setObservaciones] = useState("")
  const [turno, setTurno] = useState<"diurno" | "nocturno" | "mixto" | "">("")
  const [loading, setLoading] = useState(false)
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [preview, setPreview] = useState<{
    horas_operacion: number
    horas_novedades: number
    horas_efectivas: number
    total_eventos: number
    fecha_inicio: string
    fecha_fin: string
    hora_inicio: string
    hora_fin: string
  } | null>(null)

  // Cargar operarios
  useEffect(() => {
    async function loadOperarios() {
      try {
        const data = await getOperarios()
        setOperarios(data)
      } catch (error) {
        console.error("Error al cargar operarios:", error)
      }
    }

    if (open) {
      loadOperarios()
    }
  }, [open])

  // Cargar preview del cierre
  useEffect(() => {
    async function loadPreview() {
      if (!open || !vehiculoId || eventosIds.length === 0) return

      setLoadingPreview(true)
      try {
        // Obtener eventos seleccionados
        const eventos = await getEventosPorIds(eventosIds)

        if (eventos.length === 0) {
          toast({
            title: "Sin eventos",
            description: "No se encontraron los eventos seleccionados",
            variant: "destructive",
          })
          onOpenChange(false)
          return
        }

        // Calcular resumen
        const resumen = calcularResumenCierre(eventos)

        setPreview({
          horas_operacion: resumen.horas_operacion,
          horas_novedades: resumen.horas_novedades,
          horas_efectivas: resumen.horas_efectivas,
          total_eventos: eventos.length,
          fecha_inicio: resumen.fecha_inicio,
          fecha_fin: resumen.fecha_fin,
          hora_inicio: resumen.hora_inicio,
          hora_fin: resumen.hora_fin,
        })
      } catch (error) {
        console.error("Error al cargar preview:", error)
        toast({
          title: "Error",
          description: "No se pudo cargar la información del cierre",
          variant: "destructive",
        })
      } finally {
        setLoadingPreview(false)
      }
    }

    loadPreview()
  }, [open, vehiculoId, eventosIds, toast, onOpenChange])

  async function handleSubmit() {
    setLoading(true)

    try {
      await createCierreBitacora({
        vehiculo_id: vehiculoId,
        eventos_ids: eventosIds,
        operario_id: operarioId || null,
        observaciones: observaciones || null,
        turno: turno || null,
        user_id: userId,
      })

      toast({
        title: "Bitácora cerrada",
        description: `Se ha cerrado la bitácora de ${vehiculoPlaca} con ${eventosIds.length} eventos`,
      })

      onCierreCreado()
      onOpenChange(false)

      // Reset form
      setOperarioId("")
      setObservaciones("")
      setTurno("")
    } catch (error) {
      console.error("Error al crear cierre:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear el cierre",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Cerrar Bitácora</DialogTitle>
          <DialogDescription>
            Cierre de bitácora para {vehiculoPlaca} - {eventosIds.length} evento(s) seleccionado(s)
          </DialogDescription>
        </DialogHeader>

        {loadingPreview ? (
          <div className="py-8 text-center text-muted-foreground">
            Cargando información...
          </div>
        ) : preview ? (
          <div className="space-y-4">
            {/* Período del cierre */}
            <div className="rounded-lg border p-3 bg-muted/50">
              <div className="flex items-center gap-2 text-sm font-medium mb-2">
                <CalendarIcon className="h-4 w-4" />
                Período de la Bitácora
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Inicio</div>
                  <div className="font-medium">
                    {format(new Date(preview.fecha_inicio), "dd/MM/yyyy", { locale: es })} - {preview.hora_inicio}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Fin</div>
                  <div className="font-medium">
                    {format(new Date(preview.fecha_fin), "dd/MM/yyyy", { locale: es })} - {preview.hora_fin}
                  </div>
                </div>
              </div>
            </div>

            {/* Resumen de horas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <TrendingUpIcon className="h-4 w-4 text-green-500" />
                  Operación
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {preview.horas_operacion}h
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <TrendingDownIcon className="h-4 w-4 text-red-500" />
                  Novedades
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {preview.horas_novedades}h
                </div>
              </div>
            </div>

            {/* Horas efectivas */}
            <div className="rounded-lg border p-4 bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Horas Efectivas</div>
                  <div className="text-sm text-muted-foreground">
                    (Horas productivas reales)
                  </div>
                </div>
                <div className="text-3xl font-bold text-primary">
                  {preview.horas_efectivas}h
                </div>
              </div>
            </div>

            {/* Total eventos */}
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileTextIcon className="h-4 w-4" />
                Total de eventos incluidos: <span className="font-medium text-foreground">{preview.total_eventos}</span>
              </div>
            </div>

            {/* Turno (opcional) */}
            <div className="space-y-2">
              <Label htmlFor="turno">Turno (opcional)</Label>
              <Select value={turno} onValueChange={(v) => setTurno(v as any)}>
                <SelectTrigger id="turno">
                  <SelectValue placeholder="Seleccionar turno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diurno">Diurno</SelectItem>
                  <SelectItem value="nocturno">Nocturno</SelectItem>
                  <SelectItem value="mixto">Mixto</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Etiqueta para organización (no afecta cálculos)
              </p>
            </div>

            {/* Operario responsable */}
            <div className="space-y-2">
              <Label htmlFor="operario">Operario Responsable (opcional)</Label>
              <Select value={operarioId} onValueChange={setOperarioId}>
                <SelectTrigger id="operario">
                  <SelectValue placeholder="Seleccionar operario" />
                </SelectTrigger>
                <SelectContent>
                  {operarios
                    .filter(op => op.activo)
                    .map(operario => (
                      <SelectItem key={operario.id} value={operario.id}>
                        {operario.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Observaciones */}
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                placeholder="Observaciones adicionales sobre la bitácora..."
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || loadingPreview || !preview}>
            {loading ? "Cerrando..." : "Cerrar Bitácora"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
