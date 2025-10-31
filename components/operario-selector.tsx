"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, Plus, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { getOperarios, searchOperarios, createOperario } from "@/lib/presets-service"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

type OperarioSelectorProps = {
  value: string
  onChange: (value: string) => void
  onDataChange?: (nombre: string, cedula: string) => void
}

export function OperarioSelector({ value, onChange, onDataChange }: OperarioSelectorProps) {
  const [open, setOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [operarios, setOperarios] = useState<{ label: string; value: string; cedula: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [newOperario, setNewOperario] = useState({ nombre: "", cedula: "" })
  const { toast } = useToast()

  useEffect(() => {
    async function loadOperarios() {
      try {
        setLoading(true)
        const data = await getOperarios()
        setOperarios(
          data.map((op) => ({
            label: `${op.nombre} (${op.cedula})`,
            value: op.id,
            cedula: op.cedula,
          })),
        )
      } catch (error) {
        console.error("Error al cargar operarios:", error)
      } finally {
        setLoading(false)
      }
    }

    loadOperarios()
  }, [])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) return

    try {
      const results = await searchOperarios(query)
      setOperarios(
        results.map((op) => ({
          label: `${op.nombre} (${op.cedula})`,
          value: op.id,
          cedula: op.cedula,
        })),
      )
    } catch (error) {
      console.error("Error al buscar operarios:", error)
    }
  }

  const handleSelect = (currentValue: string) => {
    onChange(currentValue)
    setOpen(false)

    // Buscar el operario seleccionado y pasar sus datos
    const selected = operarios.find((op) => op.value === currentValue)
    if (selected && onDataChange) {
      const nombreSinCedula = selected.label.split(" (")[0]
      onDataChange(nombreSinCedula, selected.cedula)
    }
  }

  const handleCreateOperario = async () => {
    if (!newOperario.nombre || !newOperario.cedula) {
      toast({
        title: "Datos incompletos",
        description: "Por favor ingrese nombre y cédula del operario",
        variant: "destructive",
      })
      return
    }

    try {
      const created = await createOperario({
        nombre: newOperario.nombre,
        cedula: newOperario.cedula,
      })

      setOperarios((prev) => [
        ...prev,
        {
          label: `${created.nombre} (${created.cedula})`,
          value: created.id,
          cedula: created.cedula,
        },
      ])

      toast({
        title: "Operario creado",
        description: "El operario ha sido agregado a la lista",
      })

      // Seleccionar automáticamente el nuevo operario
      onChange(created.id)
      if (onDataChange) {
        onDataChange(created.nombre, created.cedula)
      }

      setDialogOpen(false)
      setNewOperario({ nombre: "", cedula: "" })
    } catch (error: any) {
      toast({
        title: "Error al crear operario",
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
              ? operarios.find((op) => op.value === value)?.label || "Seleccionar operario"
              : "Seleccionar operario"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput placeholder="Buscar operario..." onValueChange={handleSearch} />
            <CommandList>
              <CommandEmpty>
                {searchQuery.length > 0 ? (
                  <div className="py-3 px-2 text-center text-sm">
                    <p>No se encontraron resultados</p>
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="mt-2">
                          <Plus className="mr-2 h-4 w-4" />
                          Crear nuevo operario
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Agregar nuevo operario</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                          <div className="space-y-2">
                            <Label htmlFor="nombre">Nombre completo</Label>
                            <Input
                              id="nombre"
                              placeholder="Nombre del operario"
                              value={newOperario.nombre}
                              onChange={(e) => setNewOperario({ ...newOperario, nombre: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cedula">Cédula</Label>
                            <Input
                              id="cedula"
                              placeholder="Número de cédula"
                              value={newOperario.cedula}
                              onChange={(e) => setNewOperario({ ...newOperario, cedula: e.target.value })}
                            />
                          </div>
                          <Button onClick={handleCreateOperario} className="w-full">
                            Guardar operario
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : (
                  "No hay operarios"
                )}
              </CommandEmpty>
              <CommandGroup>
                {operarios.map((op) => (
                  <CommandItem
                    key={op.value}
                    value={op.value}
                    onSelect={() => handleSelect(op.value)}
                    className="flex items-center"
                  >
                    <User className="mr-2 h-4 w-4" />
                    {op.label}
                    <Check className={cn("ml-auto h-4 w-4", value === op.value ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <div className="p-2 border-t">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar nuevo operario
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar nuevo operario</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre completo</Label>
                      <Input
                        id="nombre"
                        placeholder="Nombre del operario"
                        value={newOperario.nombre}
                        onChange={(e) => setNewOperario({ ...newOperario, nombre: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cedula">Cédula</Label>
                      <Input
                        id="cedula"
                        placeholder="Número de cédula"
                        value={newOperario.cedula}
                        onChange={(e) => setNewOperario({ ...newOperario, cedula: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleCreateOperario} className="w-full">
                      Guardar operario
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
