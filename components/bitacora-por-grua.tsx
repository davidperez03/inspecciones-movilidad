"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, AlertCircle, CheckCircle, TrendingUp, Activity, FileCheckIcon, PlusCircleIcon } from "lucide-react"
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns"
import { es } from "date-fns/locale"
import type { BitacoraEvento } from "@/lib/bitacora-service"
import { getTipoEvento, TURNOS, getFechaHoyLocal, parseFechaLocal } from "@/lib/bitacora-config"
import { supabase } from "@/lib/supabase"
import { CierreBitacoraDialog } from "@/components/cierre-bitacora-dialog"
import { HistorialCierres } from "@/components/historial-cierres"
import { getCierresBitacora, deleteCierreBitacora } from "@/lib/cierre-bitacora-service"
import type { BitacoraCierre } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"
import { ExportReportButton } from "@/components/export-report-button"
import { generarReporteBitacora, generarReporteDiarioPorGrua } from "@/lib/reportes/bitacora-reports"

interface BitacoraPorGruaProps {
  eventos: BitacoraEvento[]
  onVerDetalle: (evento: BitacoraEvento) => void
  onNuevoEvento: () => void
  userId: string
}

interface Vehiculo {
  id: string
  placa: string
  marca: string
  modelo: string
}

export function BitacoraPorGrua({ eventos, onVerDetalle, onNuevoEvento, userId }: BitacoraPorGruaProps) {
  const { toast } = useToast()
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [vehiculoSeleccionado, setVehiculoSeleccionado] = useState<string>("")
  const [periodoVista, setPeriodoVista] = useState<"hoy" | "ayer" | "semana" | "mes">("hoy")
  const [fechaPersonalizada, setFechaPersonalizada] = useState(getFechaHoyLocal())
  const [cierres, setCierres] = useState<BitacoraCierre[]>([])
  const [loadingCierres, setLoadingCierres] = useState(false)
  const [dialogCierreOpen, setDialogCierreOpen] = useState(false)
  const [eventosSeleccionados, setEventosSeleccionados] = useState<string[]>([])

  useEffect(() => {
    cargarVehiculos()
  }, [])

  useEffect(() => {
    if (vehiculoSeleccionado) {
      cargarCierres()
    }
  }, [vehiculoSeleccionado, periodoVista])

  async function cargarVehiculos() {
    try {
      const { data, error } = await supabase.from("vehiculos").select("*").order("placa")

      if (error) throw error
      setVehiculos(data || [])

      // Seleccionar el primer vehículo por defecto
      if (data && data.length > 0) {
        setVehiculoSeleccionado(data[0].id)
      }
    } catch (error) {
      console.error("Error al cargar vehículos:", error)
    }
  }

  async function cargarCierres() {
    setLoadingCierres(true)
    try {
      const rango = getRangoFechas()
      const cierresData = await getCierresBitacora({
        vehiculo_id: vehiculoSeleccionado,
        fecha_desde: format(rango.desde, "yyyy-MM-dd"),
        fecha_hasta: format(rango.hasta, "yyyy-MM-dd"),
      })
      setCierres(cierresData)
    } catch (error) {
      console.error("Error al cargar cierres:", error)
    } finally {
      setLoadingCierres(false)
    }
  }

  async function handleEliminarCierre(id: string) {
    try {
      await deleteCierreBitacora(id)
      toast({
        title: "Cierre eliminado",
        description: "El cierre de bitácora ha sido eliminado correctamente",
      })
      cargarCierres()
    } catch (error) {
      console.error("Error al eliminar cierre:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el cierre",
        variant: "destructive",
      })
    }
  }

  function handleAbrirDialogCierre(eventosIds: string[]) {
    setEventosSeleccionados(eventosIds)
    setDialogCierreOpen(true)
  }

  function handleCierreCreado() {
    cargarCierres()
  }

  // Filtrar eventos del vehículo seleccionado
  const eventosFiltrados = eventos.filter((e) => e.vehiculo_id === vehiculoSeleccionado)

  // Obtener rango de fechas según el período
  function getRangoFechas(): { desde: Date; hasta: Date } {
    const hoy = new Date()

    switch (periodoVista) {
      case "hoy":
        return { desde: startOfDay(hoy), hasta: endOfDay(hoy) }
      case "ayer":
        const ayer = subDays(hoy, 1)
        return { desde: startOfDay(ayer), hasta: endOfDay(ayer) }
      case "semana":
        return { desde: startOfWeek(hoy, { weekStartsOn: 1 }), hasta: endOfWeek(hoy, { weekStartsOn: 1 }) }
      case "mes":
        return { desde: startOfMonth(hoy), hasta: endOfMonth(hoy) }
      default:
        return { desde: startOfDay(hoy), hasta: endOfDay(hoy) }
    }
  }

  const rango = getRangoFechas()

  // Filtrar eventos por rango de fechas
  const eventosPeriodo = eventosFiltrados.filter((e) => {
    // Usar parseFechaLocal para evitar problemas de zona horaria
    const fechaEvento = parseFechaLocal(e.fecha)
    return fechaEvento >= rango.desde && fechaEvento <= rango.hasta
  })

  // Agrupar eventos por día y turno
  const eventosPorDia = eventosPeriodo.reduce((acc, evento) => {
    const fecha = evento.fecha
    if (!acc[fecha]) {
      acc[fecha] = { diurno: [], nocturno: [], sinTurno: [] }
    }

    if (evento.turno === "diurno") {
      acc[fecha].diurno.push(evento)
    } else if (evento.turno === "nocturno") {
      acc[fecha].nocturno.push(evento)
    } else {
      acc[fecha].sinTurno.push(evento)
    }

    return acc
  }, {} as Record<string, { diurno: BitacoraEvento[]; nocturno: BitacoraEvento[]; sinTurno: BitacoraEvento[] }>)

  // Estadísticas del período
  const estadisticas = {
    totalEventos: eventosPeriodo.length,
    eventosAbiertos: eventosPeriodo.filter((e) => !e.hora_fin).length,
    totalHoras: eventosPeriodo.reduce((sum, e) => sum + (e.horas_operacion || 0), 0),
    fallas: eventosPeriodo.filter((e) => e.tipo_evento === "falla").length,
    diasOperados: Object.keys(eventosPorDia).length,
  }

  const vehiculoActual = vehiculos.find((v) => v.id === vehiculoSeleccionado)

  if (vehiculos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No hay vehículos registrados</CardTitle>
          <CardDescription>Registre vehículos para comenzar a usar la bitácora</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Selector de Vehículo y Período */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Seleccione Grúa y Período</CardTitle>
          {vehiculoSeleccionado && vehiculoActual && eventosFiltrados.length > 0 && (
            <ExportReportButton
              reportData={() =>
                periodoVista === "hoy" || periodoVista === "ayer"
                  ? generarReporteDiarioPorGrua(
                      eventosFiltrados,
                      vehiculoActual.placa,
                      periodoVista === "hoy" ? getFechaHoyLocal() : format(subDays(new Date(), 1), "yyyy-MM-dd")
                    )
                  : generarReporteBitacora(eventosFiltrados, {
                      vehiculo: vehiculoActual.placa,
                      fechaDesde: format(getRangoFechas().desde, "yyyy-MM-dd"),
                      fechaHasta: format(getRangoFechas().hasta, "yyyy-MM-dd"),
                    })
              }
              label="Exportar"
              size="sm"
            />
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Grúa</Label>
              <Select value={vehiculoSeleccionado} onValueChange={setVehiculoSeleccionado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vehiculos.map((vehiculo) => (
                    <SelectItem key={vehiculo.id} value={vehiculo.id}>
                      {vehiculo.placa} - {vehiculo.marca} {vehiculo.modelo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Período</Label>
              <div className="flex gap-2">
                <Select value={periodoVista} onValueChange={(v: any) => setPeriodoVista(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hoy">Hoy</SelectItem>
                    <SelectItem value="ayer">Ayer</SelectItem>
                    <SelectItem value="semana">Esta Semana</SelectItem>
                    <SelectItem value="mes">Este Mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas de la Grúa */}
      {vehiculoActual && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Días Operados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estadisticas.diasOperados}</div>
              <p className="text-xs text-muted-foreground">En el período</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Eventos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estadisticas.totalEventos}</div>
              <p className="text-xs text-muted-foreground">Registrados</p>
            </CardContent>
          </Card>

          <Card className={estadisticas.eventosAbiertos > 0 ? "border-orange-300" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Eventos Abiertos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${estadisticas.eventosAbiertos > 0 ? "text-orange-600" : ""}`}>
                {estadisticas.eventosAbiertos}
              </div>
              <p className="text-xs text-muted-foreground">Sin cerrar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Horas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estadisticas.totalHoras.toFixed(1)}h</div>
              <p className="text-xs text-muted-foreground">Operadas</p>
            </CardContent>
          </Card>

          <Card className={estadisticas.fallas > 0 ? "border-red-300" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Fallas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${estadisticas.fallas > 0 ? "text-red-600" : ""}`}>
                {estadisticas.fallas}
              </div>
              <p className="text-xs text-muted-foreground">Reportadas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs de Eventos y Cierres */}
      <Tabs defaultValue="eventos" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="eventos" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Eventos por Turno
          </TabsTrigger>
          <TabsTrigger value="cierres" className="flex items-center gap-2">
            <FileCheckIcon className="h-4 w-4" />
            Cierres Diarios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="eventos" className="space-y-4 mt-4">
          {/* Bitácora por Día y Turno */}
          {Object.keys(eventosPorDia).length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">No hay eventos registrados</p>
                  <p className="text-muted-foreground mb-4">
                    No se encontraron eventos para esta grúa en el período seleccionado
                  </p>
                  <Button onClick={onNuevoEvento}>Registrar Nuevo Evento</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(eventosPorDia)
                .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                .map(([fecha, turnos]) => {
                  const totalDia = turnos.diurno.length + turnos.nocturno.length + turnos.sinTurno.length
                  const horasDia = [...turnos.diurno, ...turnos.nocturno, ...turnos.sinTurno].reduce(
                    (sum, e) => sum + (e.horas_operacion || 0),
                    0
                  )

                  return (
                    <Card key={fecha}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              <Calendar className="h-5 w-5" />
                              {format(parseFechaLocal(fecha), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}
                            </CardTitle>
                            <CardDescription>
                              {totalDia} {totalDia === 1 ? "evento" : "eventos"} · {horasDia.toFixed(1)} horas
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Turno Diurno */}
                        {turnos.diurno.length > 0 && (
                          <div className="border-l-4 border-yellow-400 pl-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="bg-yellow-100 p-2 rounded">
                                  <Clock className="h-4 w-4 text-yellow-700" />
                                </div>
                                <div>
                                  <p className="font-semibold text-yellow-900">Turno Diurno</p>
                                  <p className="text-sm text-muted-foreground">06:00 - 18:00</p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAbrirDialogCierre(turnos.diurno.map(e => e.id))}
                                className="gap-2"
                              >
                                <FileCheckIcon className="h-4 w-4" />
                                Cerrar Bitácora
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {turnos.diurno.map((evento) => renderEvento(evento))}
                            </div>
                          </div>
                        )}

                        {/* Turno Nocturno */}
                        {turnos.nocturno.length > 0 && (
                          <div className="border-l-4 border-indigo-400 pl-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="bg-indigo-100 p-2 rounded">
                                  <Clock className="h-4 w-4 text-indigo-700" />
                                </div>
                                <div>
                                  <p className="font-semibold text-indigo-900">Turno Nocturno</p>
                                  <p className="text-sm text-muted-foreground">18:00 - 06:00</p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAbrirDialogCierre(turnos.nocturno.map(e => e.id))}
                                className="gap-2"
                              >
                                <FileCheckIcon className="h-4 w-4" />
                                Cerrar Bitácora
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {turnos.nocturno.map((evento) => renderEvento(evento))}
                            </div>
                          </div>
                        )}

                        {/* Sin Turno Asignado */}
                        {turnos.sinTurno.length > 0 && (
                          <div className="border-l-4 border-gray-400 pl-4">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="bg-gray-100 p-2 rounded">
                                <Clock className="h-4 w-4 text-gray-700" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">Sin Turno</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {turnos.sinTurno.map((evento) => renderEvento(evento))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cierres" className="mt-4">
          <HistorialCierres
            cierres={cierres}
            onEliminarCierre={handleEliminarCierre}
            loading={loadingCierres}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog de Cierre de Bitácora */}
      {vehiculoActual && eventosSeleccionados.length > 0 && (
        <CierreBitacoraDialog
          open={dialogCierreOpen}
          onOpenChange={setDialogCierreOpen}
          vehiculoId={vehiculoSeleccionado}
          vehiculoPlaca={vehiculoActual.placa}
          eventosIds={eventosSeleccionados}
          onCierreCreado={handleCierreCreado}
          userId={userId}
        />
      )}
    </div>
  )

  function renderEvento(evento: BitacoraEvento) {
    const config = getTipoEvento(evento.tipo_evento)
    const estaAbierto = !evento.hora_fin
    const esFalla = config?.esFalla

    return (
      <div
        key={evento.id}
        className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${
          estaAbierto ? "bg-orange-50 border-orange-200" : "bg-white"
        } ${esFalla ? "border-l-4 border-l-red-500" : ""}`}
        onClick={() => onVerDetalle(evento)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {config && (
                <Badge className={config.color} variant="outline">
                  {config.nombre}
                </Badge>
              )}
              {estaAbierto && (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Abierto
                </Badge>
              )}
              {!estaAbierto && (
                <Badge variant="secondary">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Cerrado
                </Badge>
              )}
            </div>

            <p className="text-sm font-medium mb-1">{evento.descripcion}</p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {evento.hora_inicio} - {evento.hora_fin || "En curso"}
              </span>
              {evento.horas_operacion !== null && (
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {evento.horas_operacion.toFixed(1)}h
                </span>
              )}
              {evento.operarios && (
                <span className="flex items-center gap-1">
                  👤 {evento.operarios.nombre}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }
}
