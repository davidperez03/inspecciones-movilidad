"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import {
  getBitacoraEventos,
  createBitacoraEvento,
  updateBitacoraEvento,
  deleteBitacoraEvento,
} from "@/lib/bitacora-service"
import type { BitacoraEvento } from "@/lib/bitacora-service"
import { VehiculoSelector } from "@/components/vehiculo-selector"
import { OperarioSelector } from "@/components/operario-selector"
import { AuxiliarSelector } from "@/components/auxiliar-selector"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Plus,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  Truck,
  Clock,
  Activity,
  AlertCircle,
  CheckCircle,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { BitacoraFallas } from "@/components/bitacora-fallas"
import { BitacoraPorGrua } from "@/components/bitacora-por-grua"
import { PeriodoSelector } from "@/components/periodo-selector"
import { exportarBitacoraAPDF, exportarBitacoraAExcel } from "@/lib/export-utils"
import {
  TURNOS,
  TIPOS_EVENTOS,
  detectarTurno,
  getTipoEvento,
  agruparPorCategoria,
  getFechaHoyLocal,
  getHoraActualLocal,
  parseFechaLocal,
} from "@/lib/bitacora-config"

export default function BitacoraPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [eventos, setEventos] = useState<BitacoraEvento[]>([])
  const [activeTab, setActiveTab] = useState("dashboard")

  // Filtros
  const [vehiculoFiltro, setVehiculoFiltro] = useState("")
  const [fechaInicioFiltro, setFechaInicioFiltro] = useState("")
  const [fechaFinFiltro, setFechaFinFiltro] = useState("")
  const [tipoEventoFiltro, setTipoEventoFiltro] = useState("todos")
  const [turnoFiltro, setTurnoFiltro] = useState("todos")

  // Formulario
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editandoEvento, setEditandoEvento] = useState<BitacoraEvento | null>(null)
  const [formData, setFormData] = useState({
    vehiculo_id: "",
    fecha: getFechaHoyLocal(),
    hora_inicio: getHoraActualLocal(),
    hora_fin: "",
    tipo_evento: "operacion",
    turno: detectarTurno(getHoraActualLocal()),
    descripcion: "",
    operario_id: "",
    auxiliar_id: "",
    tieneAuxiliar: false,
  })

  // Diálogos
  const [eventoDetalle, setEventoDetalle] = useState<BitacoraEvento | null>(null)
  const [detalleDialogOpen, setDetalleDialogOpen] = useState(false)
  const [eventoEliminar, setEventoEliminar] = useState<BitacoraEvento | null>(null)
  const [eliminarDialogOpen, setEliminarDialogOpen] = useState(false)
  const [eventoCerrar, setEventoCerrar] = useState<BitacoraEvento | null>(null)
  const [cerrarDialogOpen, setCerrarDialogOpen] = useState(false)

  // Selección múltiple para cierre masivo
  const [eventosSeleccionados, setEventosSeleccionados] = useState<Set<string>>(new Set())
  const [modoSeleccion, setModoSeleccion] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    loadEventos()
  }, [vehiculoFiltro, fechaInicioFiltro, fechaFinFiltro, tipoEventoFiltro, turnoFiltro])

  // Detectar turno automáticamente
  useEffect(() => {
    if (formData.hora_inicio) {
      const turnoDetectado = detectarTurno(formData.hora_inicio)
      setFormData((prev) => ({ ...prev, turno: turnoDetectado }))
    }
  }, [formData.hora_inicio])

  async function checkAuth() {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
    } else {
      router.push("/auth")
    }
  }

  async function loadEventos() {
    try {
      setLoading(true)
      const data = await getBitacoraEventos(
        vehiculoFiltro || undefined,
        fechaInicioFiltro || undefined,
        fechaFinFiltro || undefined,
        (tipoEventoFiltro && tipoEventoFiltro !== "todos") ? tipoEventoFiltro : undefined,
        undefined,
        (turnoFiltro && turnoFiltro !== "todos") ? turnoFiltro : undefined
      )
      setEventos(data)
    } catch (error) {
      console.error("Error al cargar eventos:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los eventos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    const horaActual = getHoraActualLocal()
    setFormData({
      vehiculo_id: "",
      fecha: getFechaHoyLocal(),
      hora_inicio: horaActual,
      hora_fin: "",
      tipo_evento: "operacion",
      turno: detectarTurno(horaActual),
      descripcion: "",
      operario_id: "",
      auxiliar_id: "",
      tieneAuxiliar: false,
    })
    setEditandoEvento(null)
  }

  async function handleGuardar() {
    // Validaciones
    if (!formData.vehiculo_id || !formData.fecha || !formData.hora_inicio || !formData.descripcion.trim()) {
      toast({
        title: "Datos incompletos",
        description: "Complete todos los campos obligatorios",
        variant: "destructive",
      })
      return
    }

    const tipoConfig = getTipoEvento(formData.tipo_evento)
    if (tipoConfig?.requiereOperario && !formData.operario_id) {
      toast({
        title: "Operario requerido",
        description: `Para eventos de tipo "${tipoConfig.nombre}" debe seleccionar un operario`,
        variant: "destructive",
      })
      return
    }

    if (formData.tieneAuxiliar && !formData.auxiliar_id) {
      toast({
        title: "Auxiliar requerido",
        description: "Debe seleccionar un auxiliar",
        variant: "destructive",
      })
      return
    }

    try {
      // Obtener la categoría del tipo de evento seleccionado
      const tipoEventoConfig = getTipoEvento(formData.tipo_evento)
      const categoriaEvento = tipoEventoConfig?.categoria || formData.tipo_evento

      const eventoData = {
        vehiculo_id: formData.vehiculo_id,
        fecha: formData.fecha,
        hora_inicio: formData.hora_inicio,
        hora_fin: formData.hora_fin || null,
        tipo_evento: categoriaEvento, // Guardar la categoría, no el id
        turno: formData.turno || null,
        descripcion: formData.descripcion,
        operario_id: formData.operario_id || null,
        auxiliar_id: formData.tieneAuxiliar ? formData.auxiliar_id || null : null,
      }

      if (editandoEvento) {
        await updateBitacoraEvento(editandoEvento.id, eventoData)
        toast({
          title: "Evento actualizado",
          description: "El evento ha sido actualizado correctamente",
        })
      } else {
        await createBitacoraEvento({
          ...eventoData,
          user_id: user.id,
        })
        toast({
          title: "Evento registrado",
          description: "El evento ha sido registrado correctamente",
        })
      }

      await loadEventos()
      setDialogOpen(false)
      resetForm()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ha ocurrido un error",
        variant: "destructive",
      })
    }
  }

  function handleEditar(evento: BitacoraEvento) {
    setEditandoEvento(evento)
    setFormData({
      vehiculo_id: evento.vehiculo_id,
      fecha: evento.fecha,
      hora_inicio: evento.hora_inicio,
      hora_fin: evento.hora_fin || "",
      tipo_evento: evento.tipo_evento,
      turno: evento.turno || "diurno",
      descripcion: evento.descripcion,
      operario_id: evento.operario_id || "",
      auxiliar_id: evento.auxiliar_id || "",
      tieneAuxiliar: !!evento.auxiliar_id,
    })
    setDialogOpen(true)
  }

  async function handleCerrarEvento() {
    if (!eventoCerrar) return

    const horaFin = getHoraActualLocal()

    try {
      await updateBitacoraEvento(eventoCerrar.id, {
        vehiculo_id: eventoCerrar.vehiculo_id,
        fecha: eventoCerrar.fecha,
        hora_inicio: eventoCerrar.hora_inicio,
        hora_fin: horaFin,
        tipo_evento: eventoCerrar.tipo_evento,
        turno: eventoCerrar.turno,
        descripcion: eventoCerrar.descripcion,
        operario_id: eventoCerrar.operario_id,
        auxiliar_id: eventoCerrar.auxiliar_id,
      })

      toast({
        title: "Evento cerrado",
        description: `Evento cerrado a las ${horaFin}`,
      })

      await loadEventos()
      setCerrarDialogOpen(false)
      setEventoCerrar(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ha ocurrido un error",
        variant: "destructive",
      })
    }
  }

  async function handleEliminar() {
    if (!eventoEliminar) return

    try {
      await deleteBitacoraEvento(eventoEliminar.id)
      toast({
        title: "Evento eliminado",
        description: "El evento ha sido eliminado correctamente",
      })
      await loadEventos()
      setEliminarDialogOpen(false)
      setEventoEliminar(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ha ocurrido un error",
        variant: "destructive",
      })
    }
  }

  function toggleSeleccionEvento(eventoId: string) {
    const nuevaSeleccion = new Set(eventosSeleccionados)
    if (nuevaSeleccion.has(eventoId)) {
      nuevaSeleccion.delete(eventoId)
    } else {
      nuevaSeleccion.add(eventoId)
    }
    setEventosSeleccionados(nuevaSeleccion)
  }

  async function cerrarEventosSeleccionados() {
    if (eventosSeleccionados.size === 0) return

    const horaFin = getHoraActualLocal()

    try {
      const promesas = Array.from(eventosSeleccionados).map((eventoId) => {
        const evento = eventos.find((e) => e.id === eventoId)
        if (!evento) return null

        return updateBitacoraEvento(eventoId, {
          vehiculo_id: evento.vehiculo_id,
          fecha: evento.fecha,
          hora_inicio: evento.hora_inicio,
          hora_fin: horaFin,
          tipo_evento: evento.tipo_evento,
          turno: evento.turno,
          descripcion: evento.descripcion,
          operario_id: evento.operario_id,
          auxiliar_id: evento.auxiliar_id,
        })
      })

      await Promise.all(promesas.filter((p) => p !== null))

      toast({
        title: "Eventos cerrados",
        description: `Se cerraron ${eventosSeleccionados.size} eventos a las ${horaFin}`,
      })

      await loadEventos()
      setEventosSeleccionados(new Set())
      setModoSeleccion(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Ha ocurrido un error",
        variant: "destructive",
      })
    }
  }

  function getTipoEventoBadge(tipo: string) {
    const config = getTipoEvento(tipo)
    if (config) {
      return (
        <Badge className={config.color} variant="outline">
          {config.nombre}
        </Badge>
      )
    }
    return <Badge>{tipo}</Badge>
  }

  async function handleExportar(
    tipo: "pdf" | "excel",
    periodo: { nombre: string; desde: string; hasta: string }
  ) {
    try {
      // Cargar eventos del período
      const eventosExportar = await getBitacoraEventos(
        undefined,
        periodo.desde,
        periodo.hasta
      )

      if (tipo === "pdf") {
        await exportarBitacoraAPDF(eventosExportar, periodo)
      } else {
        await exportarBitacoraAExcel(eventosExportar, periodo)
      }

      toast({
        title: "Exportación exitosa",
        description: `Se ha exportado el reporte de ${periodo.nombre}`,
      })
    } catch (error) {
      toast({
        title: "Error al exportar",
        description: "No se pudo generar el reporte",
        variant: "destructive",
      })
    }
  }

  // Calcular estadísticas
  const estadisticas = {
    totalEventos: eventos.length,
    eventosAbiertos: eventos.filter((e) => !e.hora_fin).length,
    eventosCerrados: eventos.filter((e) => e.hora_fin).length,
    totalHoras: eventos.reduce((sum, e) => sum + (e.horas_operacion || 0), 0),
    gruasActivas: new Set(eventos.filter((e) => !e.hora_fin).map((e) => e.vehiculo_id)).size,
    fallas: eventos.filter((e) => e.tipo_evento === "falla").length,
    fallasAbiertas: eventos.filter((e) => !e.hora_fin && e.tipo_evento === "falla").length,
  }

  const categoriasEventos = agruparPorCategoria()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Bitácora de Grúas</h1>
          <p className="text-muted-foreground">Gestión de operación y mantenimiento</p>
        </div>
        <div className="flex gap-2">
          <PeriodoSelector onExportar={handleExportar} />
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open)
              if (!open) resetForm()
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editandoEvento ? "Editar Evento" : "Nuevo Evento"}</DialogTitle>
                <DialogDescription>
                  Complete la información del evento. Los campos con * son obligatorios.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Grúa *</Label>
                  <VehiculoSelector
                    value={formData.vehiculo_id}
                    onChange={(value) => setFormData({ ...formData, vehiculo_id: value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha *</Label>
                    <Input
                      type="date"
                      value={formData.fecha}
                      onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora Inicio *</Label>
                    <Input
                      type="time"
                      value={formData.hora_inicio}
                      onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Evento *</Label>
                    <Select
                      value={formData.tipo_evento}
                      onValueChange={(value) => {
                        const config = getTipoEvento(value)
                        setFormData({
                          ...formData,
                          tipo_evento: value,
                          operario_id: config?.requiereOperario ? formData.operario_id : "",
                        })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <div className="px-2 py-1.5 text-xs font-semibold text-green-700 bg-green-50">
                          OPERACIÓN
                        </div>
                        {categoriasEventos.operacion.map((tipo) => (
                          <SelectItem key={tipo.id} value={tipo.id}>
                            {tipo.nombre}
                          </SelectItem>
                        ))}

                        <div className="px-2 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 mt-1">
                          MANTENIMIENTO
                        </div>
                        {categoriasEventos.mantenimiento.map((tipo) => (
                          <SelectItem key={tipo.id} value={tipo.id}>
                            {tipo.nombre}
                          </SelectItem>
                        ))}

                        <div className="px-2 py-1.5 text-xs font-semibold text-red-700 bg-red-50 mt-1">
                          FALLAS
                        </div>
                        {categoriasEventos.falla.map((tipo) => (
                          <SelectItem key={tipo.id} value={tipo.id}>
                            {tipo.nombre}
                          </SelectItem>
                        ))}

                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 mt-1">
                          INACTIVO
                        </div>
                        {categoriasEventos.inactivo.map((tipo) => (
                          <SelectItem key={tipo.id} value={tipo.id}>
                            {tipo.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Turno *</Label>
                    <Select value={formData.turno} onValueChange={(value) => setFormData({ ...formData, turno: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TURNOS.map((turno) => (
                          <SelectItem key={turno.id} value={turno.id}>
                            {turno.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Auto-detectado según la hora</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Hora Fin (opcional)</Label>
                  <Input
                    type="time"
                    value={formData.hora_fin}
                    onChange={(e) => setFormData({ ...formData, hora_fin: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Dejar vacío si el evento sigue abierto</p>
                </div>

                <div className="space-y-2">
                  <Label>Descripción *</Label>
                  <Textarea
                    placeholder="Describa el evento en detalle"
                    value={formData.descripcion}
                    onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={3}
                  />
                </div>

                {getTipoEvento(formData.tipo_evento)?.requiereOperario && (
                  <>
                    <div className="space-y-2">
                      <Label>Operario *</Label>
                      <OperarioSelector
                        value={formData.operario_id}
                        onChange={(value) => setFormData({ ...formData, operario_id: value })}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="tieneAuxiliar"
                        checked={formData.tieneAuxiliar}
                        onCheckedChange={(checked) =>
                          setFormData({
                            ...formData,
                            tieneAuxiliar: checked === true,
                            auxiliar_id: checked ? formData.auxiliar_id : "",
                          })
                        }
                      />
                      <Label htmlFor="tieneAuxiliar">¿Tiene auxiliar?</Label>
                    </div>

                    {formData.tieneAuxiliar && (
                      <div className="space-y-2 border-l-2 border-primary pl-4">
                        <Label>Auxiliar *</Label>
                        <AuxiliarSelector
                          value={formData.auxiliar_id}
                          onChange={(value) => setFormData({ ...formData, auxiliar_id: value })}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false)
                    resetForm()
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleGuardar}>{editandoEvento ? "Actualizar" : "Guardar"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Dashboard con Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">
            <Activity className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="eventos">
            <Clock className="h-4 w-4 mr-2" />
            Eventos
          </TabsTrigger>
          <TabsTrigger value="fallas">
            <AlertCircle className="h-4 w-4 mr-2" />
            Fallas
            {estadisticas.fallasAbiertas > 0 && (
              <Badge variant="destructive" className="ml-2">
                {estadisticas.fallasAbiertas}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="gruas">
            <Truck className="h-4 w-4 mr-2" />
            Por Grúa
          </TabsTrigger>
        </TabsList>

        {/* TAB: Dashboard */}
        <TabsContent value="dashboard" className="space-y-4">
          {/* Estadísticas Generales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Grúas Activas</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estadisticas.gruasActivas}</div>
                <p className="text-xs text-muted-foreground">En operación ahora</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Eventos Abiertos</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estadisticas.eventosAbiertos}</div>
                <p className="text-xs text-muted-foreground">Sin cerrar</p>
              </CardContent>
            </Card>

            <Card className={estadisticas.fallasAbiertas > 0 ? "border-red-300" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fallas Abiertas</CardTitle>
                <AlertTriangle className={`h-4 w-4 ${estadisticas.fallasAbiertas > 0 ? "text-red-600" : "text-muted-foreground"}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${estadisticas.fallasAbiertas > 0 ? "text-red-600" : ""}`}>
                  {estadisticas.fallasAbiertas}
                </div>
                <p className="text-xs text-muted-foreground">de {estadisticas.fallas} totales</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Horas</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estadisticas.totalHoras.toFixed(1)}h</div>
                <p className="text-xs text-muted-foreground">Registradas</p>
              </CardContent>
            </Card>
          </div>

          {/* Eventos Abiertos */}
          {estadisticas.eventosAbiertos > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-orange-800 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5" />
                      Eventos Abiertos ({estadisticas.eventosAbiertos})
                    </CardTitle>
                    <CardDescription>Eventos que requieren cierre</CardDescription>
                  </div>
                  {estadisticas.eventosAbiertos > 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setModoSeleccion(!modoSeleccion)}
                    >
                      {modoSeleccion ? "Cancelar" : "Cierre Masivo"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {eventos
                    .filter((e) => !e.hora_fin)
                    .slice(0, 10)
                    .map((evento) => (
                      <div key={evento.id} className="flex items-center gap-4 p-3 bg-white rounded-lg border">
                        {modoSeleccion && (
                          <Checkbox
                            checked={eventosSeleccionados.has(evento.id)}
                            onCheckedChange={() => toggleSeleccionEvento(evento.id)}
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{evento.vehiculos?.placa}</span>
                            {getTipoEventoBadge(evento.tipo_evento)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(parseFechaLocal(evento.fecha), "dd/MM/yyyy", { locale: es })} - {evento.hora_inicio} (
                            {evento.turno})
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setEventoCerrar(evento)
                            setCerrarDialogOpen(true)
                          }}
                        >
                          Cerrar
                        </Button>
                      </div>
                    ))}
                  {modoSeleccion && eventosSeleccionados.size > 0 && (
                    <Button className="w-full" onClick={cerrarEventosSeleccionados}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Cerrar {eventosSeleccionados.size} Seleccionados
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: Eventos */}
        <TabsContent value="eventos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Grúa</Label>
                  <VehiculoSelector value={vehiculoFiltro} onChange={setVehiculoFiltro} />
                </div>
                <div className="space-y-2">
                  <Label>Fecha Desde</Label>
                  <Input type="date" value={fechaInicioFiltro} onChange={(e) => setFechaInicioFiltro(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Fecha Hasta</Label>
                  <Input type="date" value={fechaFinFiltro} onChange={(e) => setFechaFinFiltro(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={tipoEventoFiltro} onValueChange={setTipoEventoFiltro}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      {TIPOS_EVENTOS.map((tipo) => (
                        <SelectItem key={tipo.id} value={tipo.id}>
                          {tipo.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setVehiculoFiltro("")
                    setFechaInicioFiltro("")
                    setFechaFinFiltro("")
                    setTipoEventoFiltro("todos")
                    setTurnoFiltro("todos")
                  }}
                >
                  Limpiar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historial de Eventos</CardTitle>
              <CardDescription>{eventos.length} eventos registrados</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Cargando...</p>
              ) : eventos.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No hay eventos registrados</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Grúa</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Horario</TableHead>
                        <TableHead>Horas</TableHead>
                        <TableHead>Operario</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eventos.map((evento) => (
                        <TableRow key={evento.id}>
                          <TableCell>{format(parseFechaLocal(evento.fecha), "dd/MM/yyyy", { locale: es })}</TableCell>
                          <TableCell className="font-medium">{evento.vehiculos?.placa || "N/A"}</TableCell>
                          <TableCell>{getTipoEventoBadge(evento.tipo_evento)}</TableCell>
                          <TableCell>
                            {evento.hora_inicio} - {evento.hora_fin || "En curso"}
                          </TableCell>
                          <TableCell>
                            {evento.horas_operacion !== null ? `${evento.horas_operacion.toFixed(1)}h` : "N/A"}
                          </TableCell>
                          <TableCell>{evento.operarios?.nombre || "N/A"}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-2">
                              {!evento.hora_fin && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    setEventoCerrar(evento)
                                    setCerrarDialogOpen(true)
                                  }}
                                >
                                  Cerrar
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEventoDetalle(evento)
                                  setDetalleDialogOpen(true)
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEditar(evento)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEventoEliminar(evento)
                                  setEliminarDialogOpen(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: Fallas */}
        <TabsContent value="fallas">
          <BitacoraFallas
            eventos={eventos}
            onVerDetalle={(evento) => {
              setEventoDetalle(evento)
              setDetalleDialogOpen(true)
            }}
          />
        </TabsContent>

        {/* TAB: Por Grúa */}
        <TabsContent value="gruas">
          <BitacoraPorGrua
            eventos={eventos}
            onVerDetalle={(evento) => {
              setEventoDetalle(evento)
              setDetalleDialogOpen(true)
            }}
            onNuevoEvento={() => setDialogOpen(true)}
            userId={user?.id || ""}
          />
        </TabsContent>
      </Tabs>

      {/* Dialog Detalle */}
      <Dialog open={detalleDialogOpen} onOpenChange={setDetalleDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalle del Evento</DialogTitle>
          </DialogHeader>
          {eventoDetalle && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Grúa</Label>
                  <p className="font-medium">{eventoDetalle.vehiculos?.placa || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fecha</Label>
                  <p className="font-medium">{format(parseFechaLocal(eventoDetalle.fecha), "dd/MM/yyyy", { locale: es })}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Tipo</Label>
                  <div className="mt-1">{getTipoEventoBadge(eventoDetalle.tipo_evento)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Turno</Label>
                  <p className="font-medium">{eventoDetalle.turno || "N/A"}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-muted-foreground">Hora Inicio</Label>
                  <p className="font-medium">{eventoDetalle.hora_inicio}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Hora Fin</Label>
                  <p className="font-medium">{eventoDetalle.hora_fin || "En curso"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Horas</Label>
                  <p className="font-medium">
                    {eventoDetalle.horas_operacion !== null ? `${eventoDetalle.horas_operacion.toFixed(1)}h` : "N/A"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Operario</Label>
                  <p className="font-medium">{eventoDetalle.operarios?.nombre || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Auxiliar</Label>
                  <p className="font-medium">{eventoDetalle.auxiliares?.nombre || "N/A"}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Descripción</Label>
                <p className="font-medium mt-1 whitespace-pre-wrap">{eventoDetalle.descripcion}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetalleDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Cerrar Evento */}
      <AlertDialog open={cerrarDialogOpen} onOpenChange={setCerrarDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cerrar Evento</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                ¿Está seguro que desea cerrar este evento con la fecha y hora actual?
                {eventoCerrar && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <div className="font-medium">
                      {eventoCerrar.vehiculos?.placa} - {getTipoEvento(eventoCerrar.tipo_evento)?.nombre}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Inicio: {format(parseFechaLocal(eventoCerrar.fecha), "dd/MM/yyyy", { locale: es })}{" "}
                      {eventoCerrar.hora_inicio}
                    </div>
                    <div className="text-sm font-medium text-blue-600 mt-2">
                      Se cerrará: {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}
                    </div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCerrarEvento} className="bg-blue-500 hover:bg-blue-600">
              Cerrar Evento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Eliminar */}
      <AlertDialog open={eliminarDialogOpen} onOpenChange={setEliminarDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                Esta acción no se puede deshacer. Se eliminará permanentemente el evento.
                {eventoEliminar && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="font-medium">
                      {eventoEliminar.vehiculos?.placa} - {format(parseFechaLocal(eventoEliminar.fecha), "dd/MM/yyyy", { locale: es })}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">{eventoEliminar.descripcion}</div>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEliminar} className="bg-red-500 hover:bg-red-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
