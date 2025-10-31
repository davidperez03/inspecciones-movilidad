"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, Plus, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { getAuxiliares, searchAuxiliares, createAuxiliar } from "@/lib/presets-service"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

type AuxiliarSelectorProps = {
  value: string
  onChange: (value: string) => void
  onDataChange?: (nombre: string, cedula: string) => void
}

export function AuxiliarSelector({ value, onChange, onDataChange }: AuxiliarSelectorProps) {
  const [open, setOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [auxiliares, setAuxiliares] = useState<{ label: string; value: string; cedula: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [newAuxiliar, setNewAuxiliar] = useState({ nombre: "", cedula: "" })
  const { toast } = useToast()

  useEffect(() => {
    async function loadAuxiliares() {
      try {
        setLoading(true)
        const data = await getAuxiliares()
        setAuxiliares(
          data.map((aux) => ({
            label: `${aux.nombre} (${aux.cedula})`,
            value: aux.id,
            cedula: aux.cedula,
          })),
        )
      } catch (error) {
        console.error("Error al cargar auxiliares:", error)
      } finally {
        setLoading(false)
      }
    }

    loadAuxiliares()
  }, [])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) return

    try {
      const results = await searchAuxiliares(query)
      setAuxiliares(
        results.map((aux) => ({
          label: `${aux.nombre} (${aux.cedula})`,
          value: aux.id,
          cedula: aux.cedula,
        })),
      )
    } catch (error) {
      console.error("Error al buscar auxiliares:", error)
    }
  }

  const handleSelect = (currentValue: string) => {
    onChange(currentValue)
    setOpen(false)

    // Buscar el auxiliar seleccionado y pasar sus datos
    const selected = auxiliares.find((aux) => aux.value === currentValue)
    if (selected && onDataChange) {
      const nombreSinCedula = selected.label.split(" (")[0]
      onDataChange(nombreSinCedula, selected.cedula)
    }
  }

  const handleCreateAuxiliar = async () => {
    if (!newAuxiliar.nombre || !newAuxiliar.cedula) {
      toast({
        title: "Datos incompletos",
        description: "Por favor ingrese nombre y cédula del auxiliar",
        variant: "destructive",
      })
      return
    }

    try {
      const created = await createAuxiliar({
        nombre: newAuxiliar.nombre,
        cedula: newAuxiliar.cedula,
      })

      setAuxiliares((prev) => [
        ...prev,
        {
          label: `${created.nombre} (${created.cedula})`,
          value: created.id,
          cedula: created.cedula,
        },
      ])

      toast({
        title: "Auxiliar creado",
        description: "El auxiliar ha sido agregado a la lista",
      })

      // Seleccionar automáticamente el nuevo auxiliar
      onChange(created.id)
      if (onDataChange) {
        onDataChange(created.nombre, created.cedula)
      }

      setDialogOpen(false)
      setNewAuxiliar({ nombre: "", cedula: "" })
    } catch (error: any) {
      toast({
        title: "Error al crear auxiliar",
        description: error.message || "Ha ocurrido un error",
        variant: "destructive",
      })
    }
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
              ? auxiliares.find((aux) => aux.value === value)?.label || "Seleccionar auxiliar"
              : "Sin auxiliar"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput placeholder="Buscar auxiliar..." onValueChange={handleSearch} />
            <CommandList>
              <CommandEmpty>
                {searchQuery.length > 0 ? (
                  <div className="py-3 px-2 text-center text-sm">
                    <p>No se encontraron resultados</p>
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="mt-2">
                          <Plus className="mr-2 h-4 w-4" />
                          Crear nuevo auxiliar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Agregar nuevo auxiliar</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                          <div className="space-y-2">
                            <Label htmlFor="nombre">Nombre completo</Label>
                            <Input
                              id="nombre"
                              placeholder="Nombre del auxiliar"
                              value={newAuxiliar.nombre}
                              onChange={(e) => setNewAuxiliar({ ...newAuxiliar, nombre: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cedula">Cédula</Label>
                            <Input
                              id="cedula"
                              placeholder="Número de cédula"
                              value={newAuxiliar.cedula}
                              onChange={(e) => setNewAuxiliar({ ...newAuxiliar, cedula: e.target.value })}
                            />
                          </div>
                          <Button onClick={handleCreateAuxiliar} className="w-full">
                            Guardar auxiliar
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : (
                  "No hay auxiliares"
                )}
              </CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value=""
                  onSelect={() => handleSelect("")}
                  className="flex items-center"
                >
                  <Users className="mr-2 h-4 w-4 opacity-50" />
                  <span className="text-muted-foreground">Sin auxiliar</span>
                  <Check className={cn("ml-auto h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
                </CommandItem>
                {auxiliares.map((aux) => (
                  <CommandItem
                    key={aux.value}
                    value={aux.value}
                    onSelect={() => handleSelect(aux.value)}
                    className="flex items-center"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    {aux.label}
                    <Check className={cn("ml-auto h-4 w-4", value === aux.value ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <div className="p-2 border-t">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar nuevo auxiliar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar nuevo auxiliar</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre completo</Label>
                      <Input
                        id="nombre"
                        placeholder="Nombre del auxiliar"
                        value={newAuxiliar.nombre}
                        onChange={(e) => setNewAuxiliar({ ...newAuxiliar, nombre: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cedula">Cédula</Label>
                      <Input
                        id="cedula"
                        placeholder="Número de cédula"
                        value={newAuxiliar.cedula}
                        onChange={(e) => setNewAuxiliar({ ...newAuxiliar, cedula: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleCreateAuxiliar} className="w-full">
                      Guardar auxiliar
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
