"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, Plus, Truck } from "lucide-react"
import { cn } from "@/lib/utils"
import { getVehiculos, searchVehiculos, createVehiculo } from "@/lib/presets-service"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

type VehiculoSelectorProps = {
  value: string
  onChange: (value: string) => void
  onDataChange?: (placa: string, marca?: string, modelo?: string) => void
}

export function VehiculoSelector({ value, onChange, onDataChange }: VehiculoSelectorProps) {
  const [open, setOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [vehiculos, setVehiculos] = useState<
    { label: string; value: string; placa: string; marca?: string; modelo?: string }[]
  >([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [newVehiculo, setNewVehiculo] = useState({ placa: "", marca: "", modelo: "", tipo: "GRÚA PLATAFORMA" })
  const { toast } = useToast()

  useEffect(() => {
    async function loadVehiculos() {
      try {
        setLoading(true)
        const data = await getVehiculos()
        setVehiculos(
          data.map((veh) => ({
            label: `${veh.placa} - ${veh.marca} ${veh.modelo}`,
            value: veh.id,
            placa: veh.placa,
            marca: veh.marca,
            modelo: veh.modelo,
          })),
        )
      } catch (error) {
        console.error("Error al cargar vehículos:", error)
      } finally {
        setLoading(false)
      }
    }

    loadVehiculos()
  }, [])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) return

    try {
      const results = await searchVehiculos(query)
      setVehiculos(
        results.map((veh) => ({
          label: `${veh.placa} - ${veh.marca} ${veh.modelo}`,
          value: veh.id,
          placa: veh.placa,
          marca: veh.marca,
          modelo: veh.modelo,
        })),
      )
    } catch (error) {
      console.error("Error al buscar vehículos:", error)
    }
  }

  const handleSelect = (currentValue: string) => {
    onChange(currentValue)
    setOpen(false)

    // Buscar el vehículo seleccionado y pasar sus datos
    const selected = vehiculos.find((veh) => veh.value === currentValue)
    if (selected && onDataChange) {
      onDataChange(selected.placa, selected.marca, selected.modelo)
    }
  }

  const handleCreateVehiculo = async () => {
    if (!newVehiculo.placa) {
      toast({
        title: "Datos incompletos",
        description: "Por favor ingrese al menos la placa del vehículo",
        variant: "destructive",
      })
      return
    }

    try {
      const created = await createVehiculo({
        placa: newVehiculo.placa.toUpperCase(),
        marca: newVehiculo.marca,
        modelo: newVehiculo.modelo,
        tipo: newVehiculo.tipo,
      })

      setVehiculos((prev) => [
        ...prev,
        {
          label: `${created.placa} - ${created.marca} ${created.modelo}`,
          value: created.id,
          placa: created.placa,
          marca: created.marca,
          modelo: created.modelo,
        },
      ])

      toast({
        title: "Vehículo creado",
        description: "El vehículo ha sido agregado a la lista",
      })

      // Seleccionar automáticamente el nuevo vehículo
      onChange(created.id)
      if (onDataChange) {
        onDataChange(created.placa, created.marca, created.modelo)
      }

      setDialogOpen(false)
      setNewVehiculo({ placa: "", marca: "", modelo: "", tipo: "GRÚA PLATAFORMA" })
    } catch (error: any) {
      toast({
        title: "Error al crear vehículo",
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
              ? vehiculos.find((veh) => veh.value === value)?.label || "Seleccionar vehículo"
              : "Seleccionar vehículo"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput placeholder="Buscar vehículo..." onValueChange={handleSearch} />
            <CommandList>
              <CommandEmpty>
                {searchQuery.length > 0 ? (
                  <div className="py-3 px-2 text-center text-sm">
                    <p>No se encontraron resultados</p>
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="mt-2">
                          <Plus className="mr-2 h-4 w-4" />
                          Crear nuevo vehículo
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Agregar nuevo vehículo</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                          <div className="space-y-2">
                            <Label htmlFor="placa">Placa</Label>
                            <Input
                              id="placa"
                              placeholder="Ej: ABC123"
                              value={newVehiculo.placa}
                              onChange={(e) => setNewVehiculo({ ...newVehiculo, placa: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="marca">Marca</Label>
                            <Input
                              id="marca"
                              placeholder="Ej: Chevrolet"
                              value={newVehiculo.marca}
                              onChange={(e) => setNewVehiculo({ ...newVehiculo, marca: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="modelo">Modelo</Label>
                            <Input
                              id="modelo"
                              placeholder="Ej: 2023"
                              value={newVehiculo.modelo}
                              onChange={(e) => setNewVehiculo({ ...newVehiculo, modelo: e.target.value })}
                            />
                          </div>
                          <Button onClick={handleCreateVehiculo} className="w-full">
                            Guardar vehículo
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : (
                  "No hay vehículos"
                )}
              </CommandEmpty>
            </CommandList>
            <CommandList>
              <CommandGroup>
                {vehiculos.map((veh) => (
                  <CommandItem
                    key={veh.value}
                    value={veh.value}
                    onSelect={() => handleSelect(veh.value)}
                    className="flex items-center"
                  >
                    <Truck className="mr-2 h-4 w-4" />
                    {veh.label}
                    <Check className={cn("ml-auto h-4 w-4", value === veh.value ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <div className="p-2 border-t">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar nuevo vehículo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar nuevo vehículo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="placa">Placa</Label>
                      <Input
                        id="placa"
                        placeholder="Ej: ABC123"
                        value={newVehiculo.placa}
                        onChange={(e) => setNewVehiculo({ ...newVehiculo, placa: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="marca">Marca</Label>
                      <Input
                        id="marca"
                        placeholder="Ej: Chevrolet"
                        value={newVehiculo.marca}
                        onChange={(e) => setNewVehiculo({ ...newVehiculo, marca: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="modelo">Modelo</Label>
                      <Input
                        id="modelo"
                        placeholder="Ej: 2023"
                        value={newVehiculo.modelo}
                        onChange={(e) => setNewVehiculo({ ...newVehiculo, modelo: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleCreateVehiculo} className="w-full">
                      Guardar vehículo
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
