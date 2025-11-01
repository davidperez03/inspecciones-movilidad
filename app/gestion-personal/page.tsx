"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-provider"
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
import { supabase } from "@/lib/supabase"
import type { Operario, Auxiliar, Inspector } from "@/lib/types"
import {
  getOperarios,
  getAuxiliares,
  getInspectoresActivos,
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

export default function GestionPersonalPage() {
  const router = useRouter()
  const { esAdministrador, loading: authLoading } = useAuth()
  const [operarios, setOperarios] = useState<Operario[]>([])
  const [auxiliares, setAuxiliares] = useState<Auxiliar[]>([])
  const [inspectores, setInspectores] = useState<Inspector[]>([])
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogCrearUsuarioOpen, setDialogCrearUsuarioOpen] = useState(false)
  const [dialogBajaOpen, setDialogBajaOpen] = useState(false)
  const [dialogAsignarRolOpen, setDialogAsignarRolOpen] = useState(false)
  const [personalBaja, setPersonalBaja] = useState<{ id: string; tipo: "operario" | "auxiliar"; nombre: string } | null>(null)
  const [motivoBaja, setMotivoBaja] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [perfilSeleccionado, setPerfilSeleccionado] = useState<Perfil | null>(null)
  const [nuevoRol, setNuevoRol] = useState<'operario' | 'auxiliar' | 'inspector'>('operario')
  const { toast } = useToast()

  const [formNuevoUsuario, setFormNuevoUsuario] = useState({
    nombre_completo: "",
    correo: "",
    numero_documento: "",
    telefono: "",
    password: "",
  })

  // Verificar permisos de administrador
  useEffect(() => {
    if (!authLoading && !esAdministrador()) {
      toast({
        title: "Acceso denegado",
        description: "Solo los administradores pueden acceder a esta página",
        variant: "destructive",
      })
      router.push("/dashboard")
    }
  }, [authLoading, esAdministrador, router, toast])

  useEffect(() => {
    if (!authLoading && esAdministrador()) {
      cargarDatos()
    }
  }, [authLoading, esAdministrador])

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

  function abrirDialogNuevoUsuario() {
    setFormNuevoUsuario({
      nombre_completo: "",
      correo: "",
      numero_documento: "",
      telefono: "",
      password: "",
    })
    setDialogCrearUsuarioOpen(true)
  }

  function abrirDialogBaja(id: string, tipo: "operario" | "auxiliar", nombre: string) {
    setPersonalBaja({ id, tipo, nombre })
    setMotivoBaja("")
    setDialogBajaOpen(true)
  }

  async function handleCrearUsuario(e: React.FormEvent) {
    e.preventDefault()

    if (!formNuevoUsuario.nombre_completo || !formNuevoUsuario.correo || !formNuevoUsuario.password) {
      toast({
        title: "Datos incompletos",
        description: "Nombre, correo y contraseña son obligatorios",
        variant: "destructive",
      })
      return
    }

    try {
      // Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formNuevoUsuario.correo,
        password: formNuevoUsuario.password,
        options: {
          data: {
            nombre_completo: formNuevoUsuario.nombre_completo,
            numero_documento: formNuevoUsuario.numero_documento || null,
            telefono: formNuevoUsuario.telefono || null,
          },
        },
      })

      if (authError) throw authError

      toast({
        title: "Usuario creado",
        description: "El usuario ha sido creado exitosamente. Puede asignarle roles operativos desde la lista.",
      })

      setDialogCrearUsuarioOpen(false)
      cargarDatos()
    } catch (error: any) {
      console.error("Error al crear usuario:", error)
      toast({
        title: "Error al crear usuario",
        description: error.message || "Ha ocurrido un error al crear el usuario",
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
    perfil.correo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (perfil.numero_documento && perfil.numero_documento.includes(searchTerm))
  )

  // Mostrar loading mientras se verifica autenticación
  if (authLoading || (!esAdministrador() && loading)) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              Cargando...
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Si no es administrador, no mostrar nada (será redirigido)
  if (!esAdministrador()) {
    return null
  }

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
          <CardDescription>Filtra por nombre, correo o número de documento</CardDescription>
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
                Crea usuarios y asigna roles operativos
              </p>
            </div>
            <Button onClick={abrirDialogNuevoUsuario}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Usuario
            </Button>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>N° Documento</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Rol Sistema</TableHead>
                  <TableHead>Roles Operativos</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perfilesFiltrados.map((perfil) => (
                  <TableRow key={perfil.id}>
                    <TableCell className="font-medium">{perfil.nombre_completo}</TableCell>
                    <TableCell>{perfil.numero_documento || 'N/A'}</TableCell>
                    <TableCell>{perfil.correo}</TableCell>
                    <TableCell>{perfil.telefono || 'N/A'}</TableCell>
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
            <p className="text-sm text-muted-foreground">
              Personal con rol operativo de operario
            </p>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>N° Documento</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Fecha Ingreso</TableHead>
                  <TableHead>Conductor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operariosFiltrados.map((operario) => (
                  <TableRow key={operario.id}>
                    <TableCell className="font-medium">{operario.nombre}</TableCell>
                    <TableCell>{operario.cedula}</TableCell>
                    <TableCell>{operario.correo}</TableCell>
                    <TableCell>{operario.telefono || "N/A"}</TableCell>
                    <TableCell>
                      {operario.fecha_inicio ? new Date(operario.fecha_inicio).toLocaleDateString('es-CO') : "N/A"}
                    </TableCell>
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
            <p className="text-sm text-muted-foreground">
              Personal con rol operativo de auxiliar
            </p>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>N° Documento</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Fecha Ingreso</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auxiliaresFiltrados.map((auxiliar) => (
                  <TableRow key={auxiliar.id}>
                    <TableCell className="font-medium">{auxiliar.nombre}</TableCell>
                    <TableCell>{auxiliar.cedula}</TableCell>
                    <TableCell>{auxiliar.correo}</TableCell>
                    <TableCell>{auxiliar.telefono || "N/A"}</TableCell>
                    <TableCell>
                      {auxiliar.fecha_inicio ? new Date(auxiliar.fecha_inicio).toLocaleDateString('es-CO') : "N/A"}
                    </TableCell>
                    <TableCell>
                      {auxiliar.activo ? (
                        <Badge variant="default">Activo</Badge>
                      ) : (
                        <Badge variant="destructive">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
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
              Usuarios del sistema con rol operativo de inspector
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

      {/* Dialog para crear usuario */}
      <Dialog open={dialogCrearUsuarioOpen} onOpenChange={setDialogCrearUsuarioOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Crea un usuario en el sistema. Luego podrás asignarle roles operativos.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCrearUsuario} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre_completo">Nombre completo *</Label>
              <Input
                id="nombre_completo"
                value={formNuevoUsuario.nombre_completo}
                onChange={(e) => setFormNuevoUsuario({ ...formNuevoUsuario, nombre_completo: e.target.value })}
                required
                placeholder="Ej: Juan Pérez"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="correo">Correo electrónico *</Label>
              <Input
                id="correo"
                type="email"
                value={formNuevoUsuario.correo}
                onChange={(e) => setFormNuevoUsuario({ ...formNuevoUsuario, correo: e.target.value })}
                required
                placeholder="usuario@empresa.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña *</Label>
              <Input
                id="password"
                type="password"
                value={formNuevoUsuario.password}
                onChange={(e) => setFormNuevoUsuario({ ...formNuevoUsuario, password: e.target.value })}
                required
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero_documento">Número de documento</Label>
              <Input
                id="numero_documento"
                value={formNuevoUsuario.numero_documento}
                onChange={(e) => setFormNuevoUsuario({ ...formNuevoUsuario, numero_documento: e.target.value })}
                placeholder="Opcional"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={formNuevoUsuario.telefono}
                onChange={(e) => setFormNuevoUsuario({ ...formNuevoUsuario, telefono: e.target.value })}
                placeholder="Opcional"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogCrearUsuarioOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Crear Usuario
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
