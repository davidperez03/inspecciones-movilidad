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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Pencil, UserMinus, RotateCcw, Users, UserCog, Shield, UserPlus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { Operario, Auxiliar, Inspector } from "@/lib/types"
import {
  getOperarios,
  getAuxiliares,
  getInspectoresActivos,
  createOperario,
  createAuxiliar,
  updateOperario,
  updateAuxiliar,
  darDeBajaOperario,
  darDeBajaAuxiliar,
  reactivarOperario,
  reactivarAuxiliar,
} from "@/lib/recurso-humano-service"
import type { Perfil } from "@/lib/perfiles-service"
import {
  getPerfiles,
  asignarRolOperativo,
  quitarRolOperativo,
  toggleRolOperativo
} from "@/lib/perfiles-service"

const CATEGORIAS_LICENCIA = ["A1", "A2", "B1", "B2", "B3", "C1", "C2", "C3"]

export default function GestionPersonalPage() {
  const [operarios, setOperarios] = useState<Operario[]>([])
  const [auxiliares, setAuxiliares] = useState<Auxiliar[]>([])
  const [inspectores, setInspectores] = useState<Inspector[]>([])
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogBajaOpen, setDialogBajaOpen] = useState(false)
  const [dialogAsignarRolOpen, setDialogAsignarRolOpen] = useState(false)
  const [tipoPersonal, setTipoPersonal] = useState<"operario" | "auxiliar" | "inspector">("operario")
  const [editingOperario, setEditingOperario] = useState<Operario | null>(null)
  const [editingAuxiliar, setEditingAuxiliar] = useState<Auxiliar | null>(null)
  const [personalBaja, setPersonalBaja] = useState<{ id: string; tipo: "operario" | "auxiliar"; nombre: string } | null>(null)
  const [motivoBaja, setMotivoBaja] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [perfilSeleccionado, setPerfilSeleccionado] = useState<Perfil | null>(null)
  const [nuevoRol, setNuevoRol] = useState<'operario' | 'auxiliar' | 'inspector'>('operario')
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    nombre: "",
    correo: "",
    telefono: "",
    es_conductor: false,
    licencia_conduccion: "",
    categoria_licencia: "",
    licencia_vencimiento: "",
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      setLoading(true)
      const [dataOperarios, dataAuxiliares, dataInspectores, dataPerfiles] = await Promise.all([
        getOperarios(),
        getAuxiliares(),
        getInspectoresActivos(),
        getPerfiles(),
      ])
      setOperarios(dataOperarios)
      setAuxiliares(dataAuxiliares)
      setInspectores(dataInspectores)
      setPerfiles(dataPerfiles)
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

  function abrirDialogNuevo(tipo: "operario" | "auxiliar" | "inspector") {
    setTipoPersonal(tipo)
    setEditingOperario(null)
    setEditingAuxiliar(null)
    setFormData({
      nombre: "",
      correo: "",
      telefono: "",
      es_conductor: false,
      licencia_conduccion: "",
      categoria_licencia: "",
      licencia_vencimiento: "",
    })
    setDialogOpen(true)
  }

  function abrirDialogEditar(item: Operario | Auxiliar | Inspector, tipo: "operario" | "auxiliar" | "inspector") {
    setTipoPersonal(tipo)
    if (tipo === "operario") {
      setEditingOperario(item as Operario)
    } else if (tipo === "auxiliar") {
      setEditingAuxiliar(item as Auxiliar)
    }
    setFormData({
      nombre: item.nombre,
      correo: item.correo,
      telefono: item.telefono || "",
      es_conductor: (item as Operario).es_conductor || false,
      licencia_conduccion: (item as Operario).licencia_conduccion || "",
      categoria_licencia: (item as Operario).categoria_licencia || "",
      licencia_vencimiento: (item as Operario).licencia_vencimiento || "",
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

    if (!formData.nombre || !formData.correo) {
      toast({
        title: "Datos incompletos",
        description: "Nombre y correo son obligatorios",
        variant: "destructive",
      })
      return
    }

    try {
      if (tipoPersonal === "operario") {
        const dataToSave = {
          nombre: formData.nombre,
          correo: formData.correo,
          telefono: formData.telefono || undefined,
          licencia_conduccion: formData.es_conductor ? formData.licencia_conduccion || undefined : undefined,
          categoria_licencia: formData.es_conductor ? formData.categoria_licencia || undefined : undefined,
          licencia_vencimiento: formData.es_conductor ? formData.licencia_vencimiento || undefined : undefined,
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
            description: "El operario ha sido creado exitosamente",
          })
        }
      } else if (tipoPersonal === "auxiliar") {
        const dataToSave = {
          nombre: formData.nombre,
          correo: formData.correo,
          telefono: formData.telefono || undefined,
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
            description: "El auxiliar ha sido creado exitosamente",
          })
        }
      }

      setDialogOpen(false)
      cargarDatos()
    } catch (error: any) {
      console.error("Error al guardar:", error)
      toast({
        title: "Error al guardar",
        description: error.message || "Ha ocurrido un error al guardar los datos",
        variant: "destructive",
      })
    }
  }

  async function handleDarDeBaja() {
    if (!personalBaja) return

    try {
      if (personalBaja.tipo === "operario") {
        await darDeBajaOperario(personalBaja.id, motivoBaja)
        toast({
          title: "Operario dado de baja",
          description: "El operario ha sido desactivado",
        })
      } else {
        await darDeBajaAuxiliar(personalBaja.id, motivoBaja)
        toast({
          title: "Auxiliar dado de baja",
          description: "El auxiliar ha sido desactivado",
        })
      }
      setDialogBajaOpen(false)
      cargarDatos()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo dar de baja",
        variant: "destructive",
      })
    }
  }

  async function handleReactivar(id: string, tipo: "operario" | "auxiliar") {
    try {
      if (tipo === "operario") {
        await reactivarOperario(id)
        toast({
          title: "Operario reactivado",
          description: "El operario ha sido reactivado exitosamente",
        })
      } else {
        await reactivarAuxiliar(id)
        toast({
          title: "Auxiliar reactivado",
          description: "El auxiliar ha sido reactivado exitosamente",
        })
      }
      cargarDatos()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo reactivar",
        variant: "destructive",
      })
    }
  }

  function abrirDialogAsignarRol(perfil: Perfil) {
    setPerfilSeleccionado(perfil)
    setNuevoRol('operario')
    setDialogAsignarRolOpen(true)
  }

  async function handleAsignarRol() {
    if (!perfilSeleccionado) return

    try {
      await asignarRolOperativo(perfilSeleccionado.id, nuevoRol)
      toast({
        title: "Rol asignado",
        description: `Se ha asignado el rol de ${nuevoRol} exitosamente`,
      })
      setDialogAsignarRolOpen(false)
      cargarDatos()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo asignar el rol",
        variant: "destructive",
      })
    }
  }

  async function handleQuitarRol(rolOperativoId: string, rolNombre: string) {
    try {
      await quitarRolOperativo(rolOperativoId)
      toast({
        title: "Rol removido",
        description: `Se ha removido el rol de ${rolNombre}`,
      })
      cargarDatos()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo quitar el rol",
        variant: "destructive",
      })
    }
  }

  const operariosFiltrados = operarios.filter(op =>
    op.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.correo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const auxiliaresFiltrados = auxiliares.filter(aux =>
    aux.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    aux.correo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const inspectoresFiltrados = inspectores.filter(insp =>
    insp.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    insp.correo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const perfilesFiltrados = perfiles.filter(perfil =>
    perfil.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    perfil.correo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Personal</h1>
          <p className="text-muted-foreground">Administra operarios, auxiliares e inspectores</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Personal</CardTitle>
          <CardDescription>Filtra por nombre o correo</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="usuarios" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usuarios" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Usuarios del Sistema ({perfiles.length})
          </TabsTrigger>
          <TabsTrigger value="operarios" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Operarios ({operarios.length})
          </TabsTrigger>
          <TabsTrigger value="auxiliares" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Auxiliares ({auxiliares.length})
          </TabsTrigger>
          <TabsTrigger value="inspectores" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Inspectores ({inspectores.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Usuarios del Sistema</h2>
              <p className="text-sm text-muted-foreground">
                Asigna roles operativos a los usuarios registrados
              </p>
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Rol Sistema</TableHead>
                  <TableHead>Roles Operativos</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perfilesFiltrados.map((perfil) => (
                  <TableRow key={perfil.id}>
                    <TableCell className="font-medium">{perfil.nombre_completo}</TableCell>
                    <TableCell>{perfil.correo}</TableCell>
                    <TableCell>
                      <Badge variant={perfil.rol === 'administrador' ? 'default' : 'secondary'}>
                        {perfil.rol}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {perfil.roles_operativos && perfil.roles_operativos.length > 0 ? (
                          perfil.roles_operativos.map((rol) => (
                            <Badge
                              key={rol.id}
                              variant={rol.activo ? "default" : "secondary"}
                              className="flex items-center gap-1"
                            >
                              {rol.rol}
                              <button
                                onClick={() => handleQuitarRol(rol.id, rol.rol)}
                                className="ml-1 hover:text-destructive"
                              >
                                ×
                              </button>
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Sin roles</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirDialogAsignarRol(perfil)}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Asignar Rol
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="operarios" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Operarios</h2>
            <Button onClick={() => abrirDialogNuevo("operario")}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Operario
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Conductor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operariosFiltrados.map((operario) => (
                  <TableRow key={operario.id}>
                    <TableCell className="font-medium">{operario.nombre}</TableCell>
                    <TableCell>{operario.correo}</TableCell>
                    <TableCell>{operario.telefono || "N/A"}</TableCell>
                    <TableCell>
                      {operario.es_conductor ? (
                        <Badge variant="default">Sí - {operario.categoria_licencia}</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {operario.activo ? (
                        <Badge variant="default">Activo</Badge>
                      ) : (
                        <Badge variant="destructive">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirDialogEditar(operario, "operario")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {operario.activo ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => abrirDialogBaja(operario.id, "operario", operario.nombre)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleReactivar(operario.id, "operario")}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="auxiliares" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Auxiliares</h2>
            <Button onClick={() => abrirDialogNuevo("auxiliar")}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Auxiliar
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auxiliaresFiltrados.map((auxiliar) => (
                  <TableRow key={auxiliar.id}>
                    <TableCell className="font-medium">{auxiliar.nombre}</TableCell>
                    <TableCell>{auxiliar.correo}</TableCell>
                    <TableCell>{auxiliar.telefono || "N/A"}</TableCell>
                    <TableCell>
                      {auxiliar.activo ? (
                        <Badge variant="default">Activo</Badge>
                      ) : (
                        <Badge variant="destructive">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => abrirDialogEditar(auxiliar, "auxiliar")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {auxiliar.activo ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => abrirDialogBaja(auxiliar.id, "auxiliar", auxiliar.nombre)}
                          >
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleReactivar(auxiliar.id, "auxiliar")}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="inspectores" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Inspectores</h2>
            <p className="text-sm text-muted-foreground">
              Los inspectores deben ser creados manualmente en Supabase
            </p>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspectoresFiltrados.map((inspector) => (
                  <TableRow key={inspector.id}>
                    <TableCell className="font-medium">{inspector.nombre}</TableCell>
                    <TableCell>{inspector.correo}</TableCell>
                    <TableCell>{inspector.telefono || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant="default">Activo</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingOperario || editingAuxiliar ? "Editar" : "Nuevo"}{" "}
              {tipoPersonal === "operario" ? "Operario" : "Auxiliar"}
            </DialogTitle>
            <DialogDescription>
              Complete los datos del {tipoPersonal}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre completo *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="correo">Correo electrónico *</Label>
                <Input
                  id="correo"
                  type="email"
                  value={formData.correo}
                  onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                  required
                  disabled={!!(editingOperario || editingAuxiliar)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>
            </div>

            {tipoPersonal === "operario" && (
              <>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="es_conductor"
                    checked={formData.es_conductor}
                    onChange={(e) => setFormData({ ...formData, es_conductor: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="es_conductor">Es conductor (tiene licencia)</Label>
                </div>

                {formData.es_conductor && (
                  <div className="grid grid-cols-3 gap-4 pl-6 border-l-2">
                    <div className="space-y-2">
                      <Label htmlFor="licencia">Número de licencia</Label>
                      <Input
                        id="licencia"
                        value={formData.licencia_conduccion}
                        onChange={(e) => setFormData({ ...formData, licencia_conduccion: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="categoria">Categoría</Label>
                      <Select
                        value={formData.categoria_licencia}
                        onValueChange={(value) => setFormData({ ...formData, categoria_licencia: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
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

                    <div className="space-y-2">
                      <Label htmlFor="vencimiento">Vencimiento</Label>
                      <Input
                        id="vencimiento"
                        type="date"
                        value={formData.licencia_vencimiento}
                        onChange={(e) => setFormData({ ...formData, licencia_vencimiento: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingOperario || editingAuxiliar ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para dar de baja */}
      <Dialog open={dialogBajaOpen} onOpenChange={setDialogBajaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dar de baja a {personalBaja?.nombre}</DialogTitle>
            <DialogDescription>
              Esta acción desactivará al personal. Puede reactivarlo más tarde.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo de baja</Label>
            <Input
              id="motivo"
              value={motivoBaja}
              onChange={(e) => setMotivoBaja(e.target.value)}
              placeholder="Ej: Renuncia, Despido, etc."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogBajaOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDarDeBaja}>
              Dar de baja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para asignar rol operativo */}
      <Dialog open={dialogAsignarRolOpen} onOpenChange={setDialogAsignarRolOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Rol Operativo</DialogTitle>
            <DialogDescription>
              Asigna un rol operativo a {perfilSeleccionado?.nombre_completo}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rol">Selecciona el rol</Label>
              <Select value={nuevoRol} onValueChange={(value: any) => setNuevoRol(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operario">Operario</SelectItem>
                  <SelectItem value="auxiliar">Auxiliar</SelectItem>
                  <SelectItem value="inspector">Inspector</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>El usuario podrá aparecer en los selectores de {nuevoRol} en formularios de inspecciones y bitácoras.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAsignarRolOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAsignarRol}>
              Asignar Rol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
