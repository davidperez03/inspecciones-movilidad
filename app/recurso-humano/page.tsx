"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Pencil, UserMinus, RotateCcw, CheckCircle, XCircle, AlertTriangle, Users, UserCog } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { Operario, Auxiliar } from "@/lib/types"
import {
  getOperarios,
  getAuxiliares,
  createOperario,
  createAuxiliar,
  updateOperario,
  updateAuxiliar,
  darDeBajaOperario,
  darDeBajaAuxiliar,
  reactivarOperario,
  reactivarAuxiliar,
  getEstadoLicencia,
  getDiasRestantesLicencia,
} from "@/lib/recurso-humano-service"
import { parseFechaLocal, getFechaHoyLocal } from "@/lib/bitacora-config"
import { ExportReportButton } from "@/components/export-report-button"
import {
  generarReporteOperarios,
  generarReporteAuxiliares,
  generarReporteVencimientosLicencias
} from "@/lib/reportes/recurso-humano-reports"

const CATEGORIAS_LICENCIA = ["A1", "A2", "B1", "B2", "B3", "C1", "C2", "C3"]

export default function RecursoHumanoPage() {
  const [operarios, setOperarios] = useState<Operario[]>([])
  const [auxiliares, setAuxiliares] = useState<Auxiliar[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogBajaOpen, setDialogBajaOpen] = useState(false)
  const [tipoPersonal, setTipoPersonal] = useState<"operario" | "auxiliar">("operario")
  const [editingOperario, setEditingOperario] = useState<Operario | null>(null)
  const [editingAuxiliar, setEditingAuxiliar] = useState<Auxiliar | null>(null)
  const [personalBaja, setPersonalBaja] = useState<{ id: string; tipo: "operario" | "auxiliar"; nombre: string } | null>(null)
  const [motivoBaja, setMotivoBaja] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()

  const [formDataOperario, setFormDataOperario] = useState({
    nombre: "",
    cedula: "",
    fecha_ingreso: getFechaHoyLocal(),
    es_conductor: false,
    licencia_conduccion: "",
    categoria_licencia: "",
    licencia_vencimiento: "",
  })

  const [formDataAuxiliar, setFormDataAuxiliar] = useState({
    nombre: "",
    cedula: "",
    fecha_ingreso: getFechaHoyLocal(),
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      setLoading(true)
      const [dataOperarios, dataAuxiliares] = await Promise.all([
        getOperarios(),
        getAuxiliares(),
      ])
      setOperarios(dataOperarios)
      setAuxiliares(dataAuxiliares)
    } catch (error) {
      console.error("Error al cargar datos:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  function abrirDialogNuevoOperario() {
    setTipoPersonal("operario")
    setEditingOperario(null)
    setFormDataOperario({
      nombre: "",
      cedula: "",
      fecha_ingreso: getFechaHoyLocal(),
      es_conductor: false,
      licencia_conduccion: "",
      categoria_licencia: "",
      licencia_vencimiento: "",
    })
    setDialogOpen(true)
  }

  function abrirDialogNuevoAuxiliar() {
    setTipoPersonal("auxiliar")
    setEditingAuxiliar(null)
    setFormDataAuxiliar({
      nombre: "",
      cedula: "",
      fecha_ingreso: getFechaHoyLocal(),
    })
    setDialogOpen(true)
  }

  function abrirDialogEditarOperario(operario: Operario) {
    setTipoPersonal("operario")
    setEditingOperario(operario)
    setFormDataOperario({
      nombre: operario.nombre,
      cedula: operario.cedula,
      fecha_ingreso: operario.fecha_ingreso || getFechaHoyLocal(),
      es_conductor: operario.es_conductor || false,
      licencia_conduccion: operario.licencia_conduccion || "",
      categoria_licencia: operario.categoria_licencia || "",
      licencia_vencimiento: operario.licencia_vencimiento || "",
    })
    setDialogOpen(true)
  }

  function abrirDialogEditarAuxiliar(auxiliar: Auxiliar) {
    setTipoPersonal("auxiliar")
    setEditingAuxiliar(auxiliar)
    setFormDataAuxiliar({
      nombre: auxiliar.nombre,
      cedula: auxiliar.cedula,
      fecha_ingreso: auxiliar.fecha_ingreso || getFechaHoyLocal(),
    })
    setDialogOpen(true)
  }

  function abrirDialogBaja(id: string, tipo: "operario" | "auxiliar", nombre: string) {
    setPersonalBaja({ id, tipo, nombre })
    setMotivoBaja("")
    setDialogBajaOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      if (tipoPersonal === "operario") {
        const dataToSave = {
          ...formDataOperario,
          activo: true,
          fecha_ingreso: formDataOperario.fecha_ingreso || null,
          licencia_conduccion: formDataOperario.es_conductor ? formDataOperario.licencia_conduccion || null : null,
          categoria_licencia: formDataOperario.es_conductor ? formDataOperario.categoria_licencia || null : null,
          licencia_vencimiento: formDataOperario.es_conductor ? formDataOperario.licencia_vencimiento || null : null,
        }

        if (editingOperario) {
          await updateOperario(editingOperario.id, dataToSave)
          toast({
            title: "Operario actualizado",
            description: "Los datos se actualizaron correctamente",
          })
        } else {
          await createOperario(dataToSave)
          toast({
            title: "Operario creado",
            description: "El operario se registró correctamente",
          })
        }
      } else {
        const dataToSave = {
          ...formDataAuxiliar,
          activo: true,
          fecha_ingreso: formDataAuxiliar.fecha_ingreso || null,
        }

        if (editingAuxiliar) {
          await updateAuxiliar(editingAuxiliar.id, dataToSave)
          toast({
            title: "Auxiliar actualizado",
            description: "Los datos se actualizaron correctamente",
          })
        } else {
          await createAuxiliar(dataToSave)
          toast({
            title: "Auxiliar creado",
            description: "El auxiliar se registró correctamente",
          })
        }
      }

      setDialogOpen(false)
      cargarDatos()
    } catch (error) {
      console.error("Error al guardar:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar la información",
        variant: "destructive",
      })
    }
  }

  async function handleDarDeBaja() {
    if (!personalBaja || !motivoBaja.trim()) {
      toast({
        title: "Error",
        description: "Debe indicar el motivo de la baja",
        variant: "destructive",
      })
      return
    }

    try {
      if (personalBaja.tipo === "operario") {
        await darDeBajaOperario(personalBaja.id, motivoBaja)
      } else {
        await darDeBajaAuxiliar(personalBaja.id, motivoBaja)
      }

      toast({
        title: "Baja registrada",
        description: "El personal fue dado de baja correctamente",
      })

      setDialogBajaOpen(false)
      setPersonalBaja(null)
      setMotivoBaja("")
      cargarDatos()
    } catch (error) {
      console.error("Error al dar de baja:", error)
      toast({
        title: "Error",
        description: "No se pudo registrar la baja",
        variant: "destructive",
      })
    }
  }

  async function handleReactivar(id: string, tipo: "operario" | "auxiliar") {
    try {
      if (tipo === "operario") {
        await reactivarOperario(id)
      } else {
        await reactivarAuxiliar(id)
      }

      toast({
        title: "Personal reactivado",
        description: "El personal fue reactivado correctamente",
      })

      cargarDatos()
    } catch (error) {
      console.error("Error al reactivar:", error)
      toast({
        title: "Error",
        description: "No se pudo reactivar el personal",
        variant: "destructive",
      })
    }
  }

  function getEstadoBadge(estado: string) {
    switch (estado) {
      case "VENCIDA":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Vencida</Badge>
      case "PRÓXIMA A VENCER":
        return <Badge className="bg-orange-500 hover:bg-orange-600 gap-1"><AlertTriangle className="h-3 w-3" />Próxima</Badge>
      case "VIGENTE":
        return <Badge className="bg-green-600 hover:bg-green-700 gap-1"><CheckCircle className="h-3 w-3" />Vigente</Badge>
      default:
        return <Badge variant="outline">No registrada</Badge>
    }
  }

  const operariosFiltrados = operarios.filter((o) =>
    o.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.cedula.includes(searchTerm)
  )

  const auxiliaresFiltrados = auxiliares.filter((a) =>
    a.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.cedula.includes(searchTerm)
  )

  const operariosActivos = operariosFiltrados.filter((o) => o.activo)
  const operariosInactivos = operariosFiltrados.filter((o) => !o.activo)
  const auxiliaresActivos = auxiliaresFiltrados.filter((a) => a.activo)
  const auxiliaresInactivos = auxiliaresFiltrados.filter((a) => !a.activo)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Recurso Humano</h1>
          <p className="text-muted-foreground">Administre operarios, auxiliares y licencias</p>
        </div>
        <div className="flex gap-2">
          <ExportReportButton
            reportData={() => generarReporteOperarios(operariosFiltrados, { estado: "todos" })}
            label="Exportar Operarios"
            size="sm"
            disabled={operariosFiltrados.length === 0}
          />
          <ExportReportButton
            reportData={() => generarReporteAuxiliares(auxiliaresFiltrados, { estado: "todos" })}
            label="Exportar Auxiliares"
            size="sm"
            variant="secondary"
            disabled={auxiliaresFiltrados.length === 0}
          />
          <ExportReportButton
            reportData={() => generarReporteVencimientosLicencias(operariosActivos)}
            label="Exportar Licencias"
            size="sm"
            variant="outline"
            disabled={operariosActivos.length === 0}
          />
          <Button onClick={abrirDialogNuevoOperario} variant="default">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Operario
          </Button>
          <Button onClick={abrirDialogNuevoAuxiliar} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Auxiliar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Personal</CardTitle>
          <CardDescription>Filtre por nombre o cédula</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Buscar personal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="operarios">
        <TabsList>
          <TabsTrigger value="operarios">
            <UserCog className="h-4 w-4 mr-2" />
            Operarios ({operariosActivos.length})
          </TabsTrigger>
          <TabsTrigger value="auxiliares">
            <Users className="h-4 w-4 mr-2" />
            Auxiliares ({auxiliaresActivos.length})
          </TabsTrigger>
          <TabsTrigger value="inactivos">
            Inactivos ({operariosInactivos.length + auxiliaresInactivos.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB OPERARIOS */}
        <TabsContent value="operarios" className="space-y-4">

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>N° Documento</TableHead>
                    <TableHead>Ingreso</TableHead>
                    <TableHead>Conductor</TableHead>
                    <TableHead>Licencia</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : operariosActivos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        No hay operarios activos
                      </TableCell>
                    </TableRow>
                  ) : (
                    operariosActivos.map((operario) => {
                      const estadoLicencia = getEstadoLicencia(operario.licencia_vencimiento || null)
                      const diasLicencia = getDiasRestantesLicencia(operario.licencia_vencimiento || null)

                      return (
                        <TableRow key={operario.id}>
                          <TableCell className="font-semibold">{operario.nombre}</TableCell>
                          <TableCell>{operario.cedula}</TableCell>
                          <TableCell>
                            {operario.fecha_ingreso
                              ? format(parseFechaLocal(operario.fecha_ingreso), "dd/MM/yyyy", { locale: es })
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {operario.es_conductor ? (
                              <Badge className="bg-blue-600">Sí</Badge>
                            ) : (
                              <Badge variant="outline">No</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {operario.es_conductor ? (
                              <div className="space-y-1">
                                {getEstadoBadge(estadoLicencia)}
                                {operario.licencia_vencimiento && (
                                  <div className="text-xs text-muted-foreground">
                                    Cat. {operario.categoria_licencia} - {" "}
                                    {format(parseFechaLocal(operario.licencia_vencimiento), "dd/MM/yyyy", { locale: es })}
                                    {diasLicencia !== null && ` (${diasLicencia} días)`}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => abrirDialogEditarOperario(operario)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => abrirDialogBaja(operario.id, "operario", operario.nombre)}
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB AUXILIARES */}
        <TabsContent value="auxiliares" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>N° Documento</TableHead>
                    <TableHead>Ingreso</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        Cargando...
                      </TableCell>
                    </TableRow>
                  ) : auxiliaresActivos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        No hay auxiliares activos
                      </TableCell>
                    </TableRow>
                  ) : (
                    auxiliaresActivos.map((auxiliar) => (
                      <TableRow key={auxiliar.id}>
                        <TableCell className="font-semibold">{auxiliar.nombre}</TableCell>
                        <TableCell>{auxiliar.cedula}</TableCell>
                        <TableCell>
                          {auxiliar.fecha_ingreso
                            ? format(parseFechaLocal(auxiliar.fecha_ingreso), "dd/MM/yyyy", { locale: es })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => abrirDialogEditarAuxiliar(auxiliar)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => abrirDialogBaja(auxiliar.id, "auxiliar", auxiliar.nombre)}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB INACTIVOS */}
        <TabsContent value="inactivos" className="space-y-4">
          {operariosInactivos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Operarios Inactivos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>N° Documento</TableHead>
                      <TableHead>Fecha Retiro</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operariosInactivos.map((operario) => (
                      <TableRow key={operario.id}>
                        <TableCell className="font-semibold">{operario.nombre}</TableCell>
                        <TableCell>{operario.cedula}</TableCell>
                        <TableCell>
                          {operario.fecha_retiro
                            ? format(parseFechaLocal(operario.fecha_retiro), "dd/MM/yyyy", { locale: es })
                            : "-"}
                        </TableCell>
                        <TableCell>{operario.motivo_retiro || "-"}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReactivar(operario.id, "operario")}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reactivar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {auxiliaresInactivos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Auxiliares Inactivos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>N° Documento</TableHead>
                      <TableHead>Fecha Retiro</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auxiliaresInactivos.map((auxiliar) => (
                      <TableRow key={auxiliar.id}>
                        <TableCell className="font-semibold">{auxiliar.nombre}</TableCell>
                        <TableCell>{auxiliar.cedula}</TableCell>
                        <TableCell>
                          {auxiliar.fecha_retiro
                            ? format(parseFechaLocal(auxiliar.fecha_retiro), "dd/MM/yyyy", { locale: es })
                            : "-"}
                        </TableCell>
                        <TableCell>{auxiliar.motivo_retiro || "-"}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReactivar(auxiliar.id, "auxiliar")}
                          >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Reactivar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {operariosInactivos.length === 0 && auxiliaresInactivos.length === 0 && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  No hay personal inactivo
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog para crear/editar personal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {tipoPersonal === "operario"
                ? editingOperario
                  ? "Editar Operario"
                  : "Nuevo Operario"
                : editingAuxiliar
                ? "Editar Auxiliar"
                : "Nuevo Auxiliar"}
            </DialogTitle>
            <DialogDescription>
              Complete los datos del personal
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tipoPersonal === "operario" ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre Completo *</Label>
                    <Input
                      id="nombre"
                      value={formDataOperario.nombre}
                      onChange={(e) => setFormDataOperario({ ...formDataOperario, nombre: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cedula">Cédula *</Label>
                    <Input
                      id="cedula"
                      value={formDataOperario.cedula}
                      onChange={(e) => setFormDataOperario({ ...formDataOperario, cedula: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="fecha_ingreso">Fecha de Ingreso</Label>
                    <Input
                      id="fecha_ingreso"
                      type="date"
                      value={formDataOperario.fecha_ingreso}
                      onChange={(e) => setFormDataOperario({ ...formDataOperario, fecha_ingreso: e.target.value })}
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="es_conductor"
                      checked={formDataOperario.es_conductor}
                      onCheckedChange={(checked) =>
                        setFormDataOperario({ ...formDataOperario, es_conductor: checked as boolean })
                      }
                    />
                    <Label htmlFor="es_conductor" className="font-semibold cursor-pointer">
                      Es conductor de grúa
                    </Label>
                  </div>

                  {formDataOperario.es_conductor && (
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <div className="space-y-2">
                        <Label htmlFor="licencia_conduccion">Número de Licencia</Label>
                        <Input
                          id="licencia_conduccion"
                          value={formDataOperario.licencia_conduccion}
                          onChange={(e) =>
                            setFormDataOperario({ ...formDataOperario, licencia_conduccion: e.target.value })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="categoria_licencia">Categoría</Label>
                        <Select
                          value={formDataOperario.categoria_licencia}
                          onValueChange={(value) =>
                            setFormDataOperario({ ...formDataOperario, categoria_licencia: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIAS_LICENCIA.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="licencia_vencimiento">Vencimiento de Licencia</Label>
                        <Input
                          id="licencia_vencimiento"
                          type="date"
                          value={formDataOperario.licencia_vencimiento}
                          onChange={(e) =>
                            setFormDataOperario({ ...formDataOperario, licencia_vencimiento: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre_aux">Nombre Completo *</Label>
                  <Input
                    id="nombre_aux"
                    value={formDataAuxiliar.nombre}
                    onChange={(e) => setFormDataAuxiliar({ ...formDataAuxiliar, nombre: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cedula_aux">Cédula *</Label>
                  <Input
                    id="cedula_aux"
                    value={formDataAuxiliar.cedula}
                    onChange={(e) => setFormDataAuxiliar({ ...formDataAuxiliar, cedula: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="fecha_ingreso_aux">Fecha de Ingreso</Label>
                  <Input
                    id="fecha_ingreso_aux"
                    type="date"
                    value={formDataAuxiliar.fecha_ingreso}
                    onChange={(e) => setFormDataAuxiliar({ ...formDataAuxiliar, fecha_ingreso: e.target.value })}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {(editingOperario || editingAuxiliar) ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para dar de baja */}
      <Dialog open={dialogBajaOpen} onOpenChange={setDialogBajaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dar de Baja Personal</DialogTitle>
            <DialogDescription>
              Va a dar de baja a: <strong>{personalBaja?.nombre}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo de la Baja *</Label>
              <Textarea
                id="motivo"
                value={motivoBaja}
                onChange={(e) => setMotivoBaja(e.target.value)}
                placeholder="Indique el motivo del retiro..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogBajaOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleDarDeBaja}>
              Confirmar Baja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
