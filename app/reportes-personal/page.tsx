"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FileText,
  Calendar,
  TrendingUp,
  UserPlus,
  UserMinus,
  RotateCcw,
  Download,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type {
  MovimientoPersonal,
  PersonalActivoEnFecha,
  EstadisticasMovimientos,
} from "@/lib/types"
import {
  getMovimientosPorFechas,
  getPersonalActivoEnFecha,
  getConteoPersonalActivoEnFecha,
  getEstadisticasMovimientos,
} from "@/lib/historial-personal-service"
import { parseFechaLocal, getFechaHoyLocal, getFechasPorPeriodo } from "@/lib/bitacora-config"

export default function ReportesPersonalPage() {
  const [movimientos, setMovimientos] = useState<MovimientoPersonal[]>([])
  const [personalActivo, setPersonalActivo] = useState<PersonalActivoEnFecha[]>([])
  const [estadisticas, setEstadisticas] = useState<EstadisticasMovimientos[]>([])
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Filtros para movimientos
  const [fechaDesde, setFechaDesde] = useState(getFechaHoyLocal())
  const [fechaHasta, setFechaHasta] = useState(getFechaHoyLocal())
  const [tipoPersonalFiltro, setTipoPersonalFiltro] = useState<"todos" | "operario" | "auxiliar">("todos")
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState("mes")

  // Filtros para consulta de personal activo en fecha
  const [fechaConsulta, setFechaConsulta] = useState(getFechaHoyLocal())
  const [conteoPersonal, setConteoPersonal] = useState({ operarios: 0, auxiliares: 0, total: 0 })

  useEffect(() => {
    cargarEstadisticas()
  }, [])

  useEffect(() => {
    // Actualizar fechas cuando cambia el período
    if (periodoSeleccionado !== "personalizado") {
      const fechas = getFechasPorPeriodo(periodoSeleccionado)
      setFechaDesde(fechas.desde)
      setFechaHasta(fechas.hasta)
    }
  }, [periodoSeleccionado])

  async function cargarEstadisticas() {
    try {
      const data = await getEstadisticasMovimientos()
      setEstadisticas(data)
    } catch (error) {
      console.error("Error al cargar estadísticas:", error)
      // Si la vista aún no existe, simplemente no mostrar estadísticas
      setEstadisticas([])
    }
  }

  async function buscarMovimientos() {
    try {
      setLoading(true)
      const tipo = tipoPersonalFiltro === "todos" ? undefined : tipoPersonalFiltro
      const data = await getMovimientosPorFechas(fechaDesde, fechaHasta, tipo)
      setMovimientos(data)
      toast({
        title: "Búsqueda completada",
        description: `Se encontraron ${data.length} movimientos`,
      })
    } catch (error) {
      console.error("Error al buscar movimientos:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los movimientos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function consultarPersonalActivo() {
    try {
      setLoading(true)
      const [data, conteo] = await Promise.all([
        getPersonalActivoEnFecha(fechaConsulta),
        getConteoPersonalActivoEnFecha(fechaConsulta),
      ])
      setPersonalActivo(data)
      setConteoPersonal(conteo)
      toast({
        title: "Consulta completada",
        description: `${conteo.total} personas activas en esa fecha`,
      })
    } catch (error) {
      console.error("Error al consultar personal activo:", error)
      toast({
        title: "Error",
        description: "No se pudo consultar el personal activo",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  function getTipoMovimientoBadge(tipo: string) {
    switch (tipo) {
      case "ingreso":
        return <Badge className="bg-green-600"><UserPlus className="h-3 w-3 mr-1" />Ingreso</Badge>
      case "baja":
        return <Badge className="bg-red-600"><UserMinus className="h-3 w-3 mr-1" />Baja</Badge>
      case "reingreso":
        return <Badge className="bg-blue-600"><RotateCcw className="h-3 w-3 mr-1" />Reingreso</Badge>
      case "actualizacion":
        return <Badge variant="outline">Actualización</Badge>
      default:
        return <Badge>{tipo}</Badge>
    }
  }

  function escaparCSV(valor: string): string {
    // Escapar comillas dobles y envolver en comillas si contiene comas, saltos de línea o comillas
    if (valor.includes(',') || valor.includes('"') || valor.includes('\n')) {
      return `"${valor.replace(/"/g, '""')}"`
    }
    return valor
  }

  function exportarMovimientosCSV() {
    if (movimientos.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay movimientos para exportar",
        variant: "destructive",
      })
      return
    }

    // Encabezados con BOM UTF-8 para Excel
    const BOM = "\uFEFF"
    const headers = ["Fecha", "Nombre", "Cédula", "Tipo Personal", "Movimiento", "Motivo", "Estado"]

    const rows = movimientos.map(m => [
      format(parseFechaLocal(m.fecha_movimiento), "dd/MM/yyyy", { locale: es }),
      escaparCSV(m.nombre),
      escaparCSV(m.cedula),
      m.tipo_personal === "operario" ? "Operario" : "Auxiliar",
      m.tipo_movimiento.charAt(0).toUpperCase() + m.tipo_movimiento.slice(1),
      escaparCSV(m.motivo || "-"),
      m.estado_activo ? "Activo" : "Inactivo"
    ])

    const csv = BOM + [headers, ...rows].map(row => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `Movimientos_Personal_${fechaDesde}_al_${fechaHasta}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Exportación exitosa",
      description: `${movimientos.length} movimientos exportados`,
    })
  }

  function exportarPersonalActivoCSV() {
    if (personalActivo.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay personal activo para exportar",
        variant: "destructive",
      })
      return
    }

    const BOM = "\uFEFF"
    const headers = ["Nombre", "Cedula", "Tipo", "Fecha Ingreso", "Conductor", "Numero Licencia", "Categoria", "Vencimiento Licencia"]

    const rows = personalActivo.map(p => [
      escaparCSV(p.nombre),
      escaparCSV(p.cedula),
      p.tipo_personal === "operario" ? "Operario" : "Auxiliar",
      format(parseFechaLocal(p.fecha_ingreso), "dd/MM/yyyy", { locale: es }),
      p.es_conductor ? "Si" : "No",
      escaparCSV(p.licencia_conduccion || "-"),
      escaparCSV(p.categoria_licencia || "-"),
      p.licencia_vencimiento ? format(parseFechaLocal(p.licencia_vencimiento), "dd/MM/yyyy", { locale: es }) : "-"
    ])

    const csv = BOM + [headers, ...rows].map(row => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `Personal_Activo_${fechaConsulta}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Exportación exitosa",
      description: `${personalActivo.length} personas exportadas`,
    })
  }

  function exportarEstadisticasCSV() {
    if (estadisticas.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay estadísticas para exportar",
        variant: "destructive",
      })
      return
    }

    const BOM = "\uFEFF"
    const headers = ["Mes", "Ingresos", "Bajas", "Reingresos", "Movimientos Operarios", "Movimientos Auxiliares", "Total Movimientos"]

    const rows = estadisticas.map(e => {
      const totalMovimientos = e.total_ingresos + e.total_bajas + e.total_reingresos
      return [
        format(parseFechaLocal(e.mes), "MMMM yyyy", { locale: es }),
        e.total_ingresos.toString(),
        e.total_bajas.toString(),
        e.total_reingresos.toString(),
        e.movimientos_operarios.toString(),
        e.movimientos_auxiliares.toString(),
        totalMovimientos.toString()
      ]
    })

    const csv = BOM + [headers, ...rows].map(row => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    const now = new Date()
    const fechaExport = format(now, "yyyy-MM-dd", { locale: es })
    link.setAttribute("href", url)
    link.setAttribute("download", `Estadisticas_Personal_${fechaExport}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Exportación exitosa",
      description: `${estadisticas.length} meses exportados`,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reportes de Personal</h1>
          <p className="text-muted-foreground">
            Consulte movimientos históricos y personal activo por fecha
          </p>
        </div>
      </div>

      <Tabs defaultValue="movimientos">
        <TabsList>
          <TabsTrigger value="movimientos">
            <FileText className="h-4 w-4 mr-2" />
            Movimientos
          </TabsTrigger>
          <TabsTrigger value="activos">
            <Calendar className="h-4 w-4 mr-2" />
            Personal Activo en Fecha
          </TabsTrigger>
          <TabsTrigger value="estadisticas">
            <TrendingUp className="h-4 w-4 mr-2" />
            Estadísticas
          </TabsTrigger>
        </TabsList>

        {/* TAB MOVIMIENTOS */}
        <TabsContent value="movimientos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filtros de Búsqueda</CardTitle>
              <CardDescription>Busque movimientos por rango de fechas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Período</Label>
                  <Select value={periodoSeleccionado} onValueChange={setPeriodoSeleccionado}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hoy">Hoy</SelectItem>
                      <SelectItem value="semana">Esta Semana</SelectItem>
                      <SelectItem value="mes">Este Mes</SelectItem>
                      <SelectItem value="mes_anterior">Mes Anterior</SelectItem>
                      <SelectItem value="personalizado">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Desde</Label>
                  <Input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => {
                      setFechaDesde(e.target.value)
                      setPeriodoSeleccionado("personalizado")
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Hasta</Label>
                  <Input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => {
                      setFechaHasta(e.target.value)
                      setPeriodoSeleccionado("personalizado")
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Personal</Label>
                  <Select value={tipoPersonalFiltro} onValueChange={(v: any) => setTipoPersonalFiltro(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="operario">Operarios</SelectItem>
                      <SelectItem value="auxiliar">Auxiliares</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={buscarMovimientos} disabled={loading}>
                  <FileText className="h-4 w-4 mr-2" />
                  Buscar Movimientos
                </Button>
                <Button
                  variant="outline"
                  onClick={exportarMovimientosCSV}
                  disabled={movimientos.length === 0}
                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar a Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resultados ({movimientos.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Cédula</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Movimiento</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : movimientos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No hay movimientos en el rango seleccionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    movimientos.map((mov) => (
                      <TableRow key={mov.id}>
                        <TableCell>
                          {format(parseFechaLocal(mov.fecha_movimiento), "dd/MM/yyyy", { locale: es })}
                        </TableCell>
                        <TableCell className="font-semibold">{mov.nombre}</TableCell>
                        <TableCell>{mov.cedula}</TableCell>
                        <TableCell>
                          <Badge variant={mov.tipo_personal === "operario" ? "default" : "secondary"}>
                            {mov.tipo_personal === "operario" ? "Operario" : "Auxiliar"}
                          </Badge>
                        </TableCell>
                        <TableCell>{getTipoMovimientoBadge(mov.tipo_movimiento)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {mov.motivo || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB PERSONAL ACTIVO EN FECHA */}
        <TabsContent value="activos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Consultar Personal Activo</CardTitle>
              <CardDescription>
                Vea quién estaba activo en cualquier fecha del pasado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label>Fecha de Consulta</Label>
                  <Input
                    type="date"
                    value={fechaConsulta}
                    onChange={(e) => setFechaConsulta(e.target.value)}
                  />
                </div>
                <Button onClick={consultarPersonalActivo} disabled={loading}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Consultar
                </Button>
                <Button
                  variant="outline"
                  onClick={exportarPersonalActivoCSV}
                  disabled={personalActivo.length === 0}
                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar a Excel
                </Button>
              </div>

              {personalActivo.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{conteoPersonal.total}</div>
                      <p className="text-xs text-muted-foreground">personas activas</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Operarios</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{conteoPersonal.operarios}</div>
                      <p className="text-xs text-muted-foreground">activos</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Auxiliares</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{conteoPersonal.auxiliares}</div>
                      <p className="text-xs text-muted-foreground">activos</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personal Activo ({personalActivo.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Cédula</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha Ingreso</TableHead>
                    <TableHead>Conductor</TableHead>
                    <TableHead>Licencia</TableHead>
                    <TableHead>Vencimiento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : personalActivo.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No se encontró personal activo en esta fecha
                      </TableCell>
                    </TableRow>
                  ) : (
                    personalActivo.map((persona) => (
                      <TableRow key={persona.personal_id}>
                        <TableCell className="font-semibold">{persona.nombre}</TableCell>
                        <TableCell>{persona.cedula}</TableCell>
                        <TableCell>
                          <Badge variant={persona.tipo_personal === "operario" ? "default" : "secondary"}>
                            {persona.tipo_personal === "operario" ? "Operario" : "Auxiliar"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(parseFechaLocal(persona.fecha_ingreso), "dd/MM/yyyy", { locale: es })}
                        </TableCell>
                        <TableCell>
                          {persona.es_conductor ? (
                            <Badge className="bg-blue-600">Sí</Badge>
                          ) : (
                            <Badge variant="outline">No</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {persona.licencia_conduccion ? (
                            <div>
                              <div>{persona.licencia_conduccion}</div>
                              <div className="text-xs text-muted-foreground">
                                Cat. {persona.categoria_licencia}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {persona.licencia_vencimiento ? (
                            format(parseFechaLocal(persona.licencia_vencimiento), "dd/MM/yyyy", { locale: es })
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB ESTADÍSTICAS */}
        <TabsContent value="estadisticas" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              onClick={exportarEstadisticasCSV}
              disabled={estadisticas.length === 0}
              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar Estadísticas a Excel
            </Button>
          </div>

          {estadisticas.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-green-600" />
                    Ingresos (Este Mes)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{estadisticas[0].total_ingresos}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <UserMinus className="h-4 w-4 text-red-600" />
                    Bajas (Este Mes)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{estadisticas[0].total_bajas}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-blue-600" />
                    Reingresos (Este Mes)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{estadisticas[0].total_reingresos}</div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Histórico Mensual</CardTitle>
              <CardDescription>Últimos 12 meses</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mes</TableHead>
                    <TableHead className="text-center">Ingresos</TableHead>
                    <TableHead className="text-center">Bajas</TableHead>
                    <TableHead className="text-center">Reingresos</TableHead>
                    <TableHead className="text-center">Operarios</TableHead>
                    <TableHead className="text-center">Auxiliares</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {estadisticas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No hay datos históricos
                      </TableCell>
                    </TableRow>
                  ) : (
                    estadisticas.map((est) => (
                      <TableRow key={est.mes}>
                        <TableCell className="font-medium">
                          {format(parseFechaLocal(est.mes), "MMMM yyyy", { locale: es })}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-green-600">{est.total_ingresos}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-red-600">{est.total_bajas}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-blue-600">{est.total_reingresos}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{est.movimientos_operarios}</TableCell>
                        <TableCell className="text-center">{est.movimientos_auxiliares}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
