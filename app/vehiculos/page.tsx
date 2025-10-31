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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Pencil, AlertTriangle, CheckCircle, XCircle, RotateCcw, Truck } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { Vehiculo } from "@/lib/types"
import {
  getVehiculos,
  createVehiculo,
  updateVehiculo,
  desactivarVehiculo,
  reactivarVehiculo,
  getEstadoDocumento,
  getDiasRestantes,
} from "@/lib/vehiculos-service"
import { parseFechaLocal } from "@/lib/bitacora-config"
import { ExportReportButton } from "@/components/export-report-button"
import { generarReporteFlotaVehiculos, generarReporteVencimientos } from "@/lib/reportes/vehiculos-reports"
import { useAuth } from "@/components/auth-provider"

export default function VehiculosPage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingVehiculo, setEditingVehiculo] = useState<Vehiculo | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const { toast } = useToast()
  const { esAdministrador } = useAuth()

  const [formData, setFormData] = useState({
    placa: "",
    marca: "",
    modelo: "",
    tipo: "GRÚA DE PLATAFORMA",
    soat_vencimiento: "",
    tecnomecanica_vencimiento: "",
    soat_aseguradora: "",
    numero_poliza_soat: "",
    observaciones: "",
  })

  useEffect(() => {
    cargarVehiculos()
  }, [])

  async function cargarVehiculos() {
    try {
      setLoading(true)
      const data = await getVehiculos()
      setVehiculos(data)
    } catch (error) {
      console.error("Error al cargar vehículos:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los vehículos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  function abrirDialogNuevo() {
    setEditingVehiculo(null)
    setFormData({
      placa: "",
      marca: "",
      modelo: "",
      tipo: "GRÚA DE PLATAFORMA",
      soat_vencimiento: "",
      tecnomecanica_vencimiento: "",
      soat_aseguradora: "",
      numero_poliza_soat: "",
      observaciones: "",
    })
    setDialogOpen(true)
  }

  function abrirDialogEditar(vehiculo: Vehiculo) {
    setEditingVehiculo(vehiculo)
    setFormData({
      placa: vehiculo.placa,
      marca: vehiculo.marca || "",
      modelo: vehiculo.modelo || "",
      tipo: vehiculo.tipo || "GRÚA DE PLATAFORMA",
      soat_vencimiento: vehiculo.soat_vencimiento || "",
      tecnomecanica_vencimiento: vehiculo.tecnomecanica_vencimiento || "",
      soat_aseguradora: vehiculo.soat_aseguradora || "",
      numero_poliza_soat: vehiculo.numero_poliza_soat || "",
      observaciones: vehiculo.observaciones || "",
    })
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Verificar permisos
    if (!esAdministrador()) {
      toast({
        title: "Permisos insuficientes",
        description: "Solo los administradores pueden crear o modificar vehículos. Contacta a tu administrador para que te asigne el rol adecuado.",
        variant: "destructive",
      })
      return
    }

    try {
      if (editingVehiculo) {
        await updateVehiculo(editingVehiculo.id, {
          ...formData,
          soat_vencimiento: formData.soat_vencimiento || null,
          tecnomecanica_vencimiento: formData.tecnomecanica_vencimiento || null,
          soat_aseguradora: formData.soat_aseguradora || null,
          numero_poliza_soat: formData.numero_poliza_soat || null,
          observaciones: formData.observaciones || null,
        })
        toast({
          title: "Vehículo actualizado",
          description: "Los datos del vehículo se actualizaron correctamente",
        })
      } else {
        await createVehiculo({
          placa: formData.placa,
          marca: formData.marca || null,
          modelo: formData.modelo || null,
          tipo: formData.tipo,
          activo: true,
          soat_vencimiento: formData.soat_vencimiento || null,
          tecnomecanica_vencimiento: formData.tecnomecanica_vencimiento || null,
          soat_aseguradora: formData.soat_aseguradora || null,
          numero_poliza_soat: formData.numero_poliza_soat || null,
          observaciones: formData.observaciones || null,
        })
        toast({
          title: "Vehículo creado",
          description: "El vehículo se registró correctamente",
        })
      }

      setDialogOpen(false)
      cargarVehiculos()
    } catch (error: any) {
      console.error("Error al guardar vehículo:", error)

      let descripcionError = "No se pudo guardar el vehículo"

      if (error?.message?.includes("row-level security")) {
        descripcionError = "No tienes permisos para realizar esta acción. Solo los administradores pueden gestionar vehículos."
      } else if (error?.message) {
        descripcionError = error.message
      }

      toast({
        title: "Error",
        description: descripcionError,
        variant: "destructive",
      })
    }
  }

  async function handleDesactivar(id: string) {
    if (!confirm("¿Está seguro de desactivar este vehículo?")) return

    try {
      await desactivarVehiculo(id)
      toast({
        title: "Vehículo desactivado",
        description: "El vehículo se desactivó correctamente",
      })
      cargarVehiculos()
    } catch (error) {
      console.error("Error al desactivar vehículo:", error)
      toast({
        title: "Error",
        description: "No se pudo desactivar el vehículo",
        variant: "destructive",
      })
    }
  }

  async function handleReactivar(id: string) {
    try {
      await reactivarVehiculo(id)
      toast({
        title: "Vehículo reactivado",
        description: "El vehículo se reactivó correctamente",
      })
      cargarVehiculos()
    } catch (error) {
      console.error("Error al reactivar vehículo:", error)
      toast({
        title: "Error",
        description: "No se pudo reactivar el vehículo",
        variant: "destructive",
      })
    }
  }

  function getEstadoBadge(estado: string) {
    switch (estado) {
      case "VENCIDO":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Vencido</Badge>
      case "PRÓXIMO A VENCER":
        return <Badge className="bg-orange-500 hover:bg-orange-600 gap-1"><AlertTriangle className="h-3 w-3" />Próximo</Badge>
      case "VIGENTE":
        return <Badge className="bg-green-600 hover:bg-green-700 gap-1"><CheckCircle className="h-3 w-3" />Vigente</Badge>
      default:
        return <Badge variant="outline">No registrado</Badge>
    }
  }

  const vehiculosFiltrados = vehiculos.filter((v) =>
    v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.marca?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.modelo?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const vehiculosActivos = vehiculosFiltrados.filter((v) => v.activo)
  const vehiculosInactivos = vehiculosFiltrados.filter((v) => !v.activo)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Vehículos</h1>
          <p className="text-muted-foreground">Administre la flota de vehículos y sus documentos</p>
        </div>
        <div className="flex gap-2">
          <ExportReportButton
            reportData={() => generarReporteFlotaVehiculos(vehiculosFiltrados, {
              estado: "todos"
            })}
            label="Exportar Flota"
            disabled={vehiculosFiltrados.length === 0}
          />
          <ExportReportButton
            reportData={() => generarReporteVencimientos(vehiculosActivos)}
            label="Exportar Vencimientos"
            variant="secondary"
            disabled={vehiculosActivos.length === 0}
          />
          {esAdministrador() && (
            <Button onClick={abrirDialogNuevo}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Vehículo
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Vehículos</CardTitle>
          <CardDescription>Filtre por placa, marca o modelo</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Buscar vehículo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="activos">
        <TabsList>
          <TabsTrigger value="activos">
            Activos ({vehiculosActivos.length})
          </TabsTrigger>
          <TabsTrigger value="inactivos">
            Inactivos ({vehiculosInactivos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activos" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Placa</TableHead>
                    <TableHead>Marca/Modelo</TableHead>
                    <TableHead>SOAT</TableHead>
                    <TableHead>Tecnomecánica</TableHead>
                    <TableHead>Aseguradora</TableHead>
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
                  ) : vehiculosActivos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        No hay vehículos activos
                      </TableCell>
                    </TableRow>
                  ) : (
                    vehiculosActivos.map((vehiculo) => {
                      const estadoSoat = getEstadoDocumento(vehiculo.soat_vencimiento || null)
                      const estadoTecno = getEstadoDocumento(vehiculo.tecnomecanica_vencimiento || null)
                      const diasSoat = getDiasRestantes(vehiculo.soat_vencimiento || null)
                      const diasTecno = getDiasRestantes(vehiculo.tecnomecanica_vencimiento || null)

                      return (
                        <TableRow key={vehiculo.id}>
                          <TableCell className="font-semibold">{vehiculo.placa}</TableCell>
                          <TableCell>
                            {vehiculo.marca} {vehiculo.modelo}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {getEstadoBadge(estadoSoat)}
                              {vehiculo.soat_vencimiento && (
                                <div className="text-xs text-muted-foreground">
                                  {format(parseFechaLocal(vehiculo.soat_vencimiento), "dd/MM/yyyy", { locale: es })}
                                  {diasSoat !== null && ` (${diasSoat} días)`}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {getEstadoBadge(estadoTecno)}
                              {vehiculo.tecnomecanica_vencimiento && (
                                <div className="text-xs text-muted-foreground">
                                  {format(parseFechaLocal(vehiculo.tecnomecanica_vencimiento), "dd/MM/yyyy", { locale: es })}
                                  {diasTecno !== null && ` (${diasTecno} días)`}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{vehiculo.soat_aseguradora || "-"}</TableCell>
                          <TableCell>
                            {esAdministrador() ? (
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => abrirDialogEditar(vehiculo)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDesactivar(vehiculo.id)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Solo lectura</span>
                            )}
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

        <TabsContent value="inactivos" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Placa</TableHead>
                    <TableHead>Marca/Modelo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehiculosInactivos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">
                        No hay vehículos inactivos
                      </TableCell>
                    </TableRow>
                  ) : (
                    vehiculosInactivos.map((vehiculo) => (
                      <TableRow key={vehiculo.id}>
                        <TableCell className="font-semibold">{vehiculo.placa}</TableCell>
                        <TableCell>
                          {vehiculo.marca} {vehiculo.modelo}
                        </TableCell>
                        <TableCell>{vehiculo.tipo}</TableCell>
                        <TableCell>
                          {esAdministrador() ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReactivar(vehiculo.id)}
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Reactivar
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">Solo lectura</span>
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
      </Tabs>

      {/* Dialog para crear/editar vehículo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingVehiculo ? "Editar Vehículo" : "Nuevo Vehículo"}
            </DialogTitle>
            <DialogDescription>
              Complete los datos del vehículo y sus documentos
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="placa">Placa *</Label>
                <Input
                  id="placa"
                  value={formData.placa}
                  onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                  required
                  placeholder="ABC123"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Input
                  id="tipo"
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  placeholder="GRÚA DE PLATAFORMA"
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="marca">Marca</Label>
                <Input
                  id="marca"
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  placeholder="Chevrolet"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modelo">Modelo</Label>
                <Input
                  id="modelo"
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  placeholder="NPR"
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Documentos del Vehículo</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="soat_vencimiento">Vencimiento SOAT</Label>
                  <Input
                    id="soat_vencimiento"
                    type="date"
                    value={formData.soat_vencimiento}
                    onChange={(e) => setFormData({ ...formData, soat_vencimiento: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="soat_aseguradora">Aseguradora SOAT</Label>
                  <Input
                    id="soat_aseguradora"
                    value={formData.soat_aseguradora}
                    onChange={(e) => setFormData({ ...formData, soat_aseguradora: e.target.value })}
                    placeholder="Seguros Bolívar"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero_poliza_soat">Número de Póliza SOAT</Label>
                  <Input
                    id="numero_poliza_soat"
                    value={formData.numero_poliza_soat}
                    onChange={(e) => setFormData({ ...formData, numero_poliza_soat: e.target.value })}
                    placeholder="123456789"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tecnomecanica_vencimiento">Vencimiento Tecnomecánica</Label>
                  <Input
                    id="tecnomecanica_vencimiento"
                    type="date"
                    value={formData.tecnomecanica_vencimiento}
                    onChange={(e) => setFormData({ ...formData, tecnomecanica_vencimiento: e.target.value })}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Input
                    id="observaciones"
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    placeholder="Notas adicionales sobre el vehículo"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingVehiculo ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
