"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, Plus, ClipboardCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"

type InspectorSelectorProps = {
  value: string
  onChange: (value: string) => void
  onDataChange?: (nombre: string, cargo: string, documento: string) => void
}

export function InspectorSelector({ value, onChange, onDataChange }: InspectorSelectorProps) {
  const [open, setOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [inspectores, setInspectores] = useState<
    { label: string; value: string; nombre: string; cargo: string; documento: string }[]
  >([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [newInspector, setNewInspector] = useState({ nombre: "", cargo: "", documento: "" })
  const { toast } = useToast()

  useEffect(() => {
    async function loadInspectores() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("roles_operativos")
          .select(`
            id,
            perfil_id,
            perfiles:perfil_id (
              id,
              nombre_completo,
              correo,
              rol
            )
          `)
          .eq("rol", "inspector")
          .eq("activo", true)
          .order("perfiles(nombre_completo)")

        if (error) throw error

        setInspectores(
          (data || []).map((item: any) => ({
            label: `${item.perfiles.nombre_completo} (Inspector)`,
            value: item.perfil_id,
            nombre: item.perfiles.nombre_completo,
            cargo: 'Inspector',
            documento: item.perfiles.correo,
          })),
        )
      } catch (error) {
        console.error("Error al cargar inspectores:", error)
      } finally {
        setLoading(false)
      }
    }

    loadInspectores()
  }, [])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) return

    try {
      const { data, error } = await supabase
        .from("roles_operativos")
        .select(`
          id,
          perfil_id,
          perfiles:perfil_id (
            id,
            nombre_completo,
            correo
          )
        `)
        .eq("rol", "inspector")
        .eq("activo", true)
        .ilike("perfiles.nombre_completo", `%${query}%`)
        .order("perfiles(nombre_completo)")
        .limit(5)

      if (error) throw error

      setInspectores(
        (data || []).map((item: any) => ({
          label: `${item.perfiles.nombre_completo} (Inspector)`,
          value: item.perfil_id,
          nombre: item.perfiles.nombre_completo,
          cargo: 'Inspector',
          documento: item.perfiles.correo,
        })),
      )
    } catch (error) {
      console.error("Error al buscar inspectores:", error)
    }
  }

  const handleSelect = (currentValue: string) => {
    onChange(currentValue)
    setOpen(false)

    // Buscar el inspector seleccionado y pasar sus datos
    const selected = inspectores.find((insp) => insp.value === currentValue)
    if (selected && onDataChange) {
      onDataChange(selected.nombre, selected.cargo, selected.documento)
    }
  }

  const handleCreateInspector = async () => {
    // TODO: Implementar creación de inspector con autenticación completa
    toast({
      title: "Función no disponible",
      description: "Los inspectores deben ser creados desde el módulo de gestión de personal",
      variant: "destructive",
    })
    setDialogOpen(false)
  }

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={loading}
          >
            {value
              ? inspectores.find((insp) => insp.value === value)?.label || "Seleccionar inspector"
              : "Seleccionar inspector"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput placeholder="Buscar inspector..." onValueChange={handleSearch} />
            <CommandList>
              <CommandEmpty>
                {searchQuery.length > 0 ? (
                  <div className="py-3 px-2 text-center text-sm">
                    <p>No se encontraron resultados</p>
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="mt-2">
                          <Plus className="mr-2 h-4 w-4" />
                          Crear nuevo inspector
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Agregar nuevo inspector</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                          <div className="space-y-2">
                            <Label htmlFor="nombre">Nombre completo</Label>
                            <Input
                              id="nombre"
                              placeholder="Nombre del inspector"
                              value={newInspector.nombre}
                              onChange={(e) => setNewInspector({ ...newInspector, nombre: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cargo">Cargo</Label>
                            <Input
                              id="cargo"
                              placeholder="Cargo del inspector"
                              value={newInspector.cargo}
                              onChange={(e) => setNewInspector({ ...newInspector, cargo: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="documento">Documento de identidad</Label>
                            <Input
                              id="documento"
                              placeholder="Número de documento"
                              value={newInspector.documento}
                              onChange={(e) => setNewInspector({ ...newInspector, documento: e.target.value })}
                            />
                          </div>
                          <Button onClick={handleCreateInspector} className="w-full">
                            Guardar inspector
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : (
                  "No hay inspectores"
                )}
              </CommandEmpty>
              <CommandGroup>
                {inspectores.map((insp) => (
                  <CommandItem
                    key={insp.value}
                    value={insp.value}
                    onSelect={() => handleSelect(insp.value)}
                    className="flex items-center"
                  >
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    {insp.label}
                    <Check className={cn("ml-auto h-4 w-4", value === insp.value ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <div className="p-2 border-t">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar nuevo inspector
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar nuevo inspector</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre completo</Label>
                      <Input
                        id="nombre"
                        placeholder="Nombre del inspector"
                        value={newInspector.nombre}
                        onChange={(e) => setNewInspector({ ...newInspector, nombre: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cargo">Cargo</Label>
                      <Input
                        id="cargo"
                        placeholder="Cargo del inspector"
                        value={newInspector.cargo}
                        onChange={(e) => setNewInspector({ ...newInspector, cargo: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="documento">Documento de identidad</Label>
                      <Input
                        id="documento"
                        placeholder="Número de documento"
                        value={newInspector.documento}
                        onChange={(e) => setNewInspector({ ...newInspector, documento: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleCreateInspector} className="w-full">
                      Guardar inspector
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
