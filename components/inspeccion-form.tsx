"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

type ItemInspeccion = {
  id: string
  nombre: string
  estado: string
  observacion: string
}

type InspeccionFormProps = {
  items: ItemInspeccion[]
  onChange: (items: ItemInspeccion[], esApto: boolean) => void
  onNext: () => void
}

export function InspeccionForm({ items, onChange, onNext }: InspeccionFormProps) {
  const [localItems, setLocalItems] = useState<ItemInspeccion[]>(items)
  const [expandedSections, setExpandedSections] = useState<string[]>([])

  // Agrupar items por categoría (primeros 2 caracteres del ID)
  const itemsByCategory: Record<string, ItemInspeccion[]> = {}
  localItems.forEach((item) => {
    const categoryId = item.id.substring(0, 2)
    if (!itemsByCategory[categoryId]) {
      itemsByCategory[categoryId] = []
    }
    itemsByCategory[categoryId].push(item)
  })

  // Mapeo de categorías
  const categoryNames: Record<string, string> = {
    "01": "Documentación y Administración",
    "02": "Sistema Mecánico del Vehículo",
    "03": "Sistema Eléctrico y Óptico",
    "04": "Elementos de Seguridad",
    "05": "Cabina y Estructura",
    "06": "Operatividad de la Grúa",
  }

  useEffect(() => {
    // Expandir la primera sección por defecto
    if (Object.keys(itemsByCategory).length > 0 && expandedSections.length === 0) {
      setExpandedSections([Object.keys(itemsByCategory)[0]])
    }
  }, [itemsByCategory, expandedSections])

  const handleEstadoChange = (id: string, value: string) => {
    const updatedItems = localItems.map((item) => (item.id === id ? { ...item, estado: value } : item))
    setLocalItems(updatedItems)

    // Determinar si el vehículo es apto (ningún ítem en estado "malo")
    const esApto = !updatedItems.some((item) => item.estado === "malo")
    onChange(updatedItems, esApto)
  }

  const handleObservacionChange = (id: string, value: string) => {
    const updatedItems = localItems.map((item) => (item.id === id ? { ...item, observacion: value } : item))
    setLocalItems(updatedItems)

    // Determinar si el vehículo es apto (ningún ítem en estado "malo")
    const esApto = !updatedItems.some((item) => item.estado === "malo")
    onChange(updatedItems, esApto)
  }

  const handleAccordionChange = (value: string[]) => {
    setExpandedSections(value)
  }

  const isFormValid = localItems.every((item) => item.estado !== "")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ítems de Inspección</CardTitle>
        <CardDescription>
          Evalúe cada ítem como OK, REGULAR o MALO y agregue observaciones si es necesario
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" value={expandedSections} onValueChange={handleAccordionChange} className="w-full">
          {Object.entries(itemsByCategory).map(([categoryId, categoryItems]) => (
            <AccordionItem value={categoryId} key={categoryId}>
              <AccordionTrigger className="font-medium">
                {categoryNames[categoryId] || `Categoría ${categoryId}`}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-6">
                  {categoryItems.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="font-medium mb-3">{item.nombre}</div>

                      <RadioGroup
                        value={item.estado}
                        onValueChange={(value) => handleEstadoChange(item.id, value)}
                        className="flex space-x-4 mb-3"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="ok" id={`${item.id}-ok`} />
                          <Label htmlFor={`${item.id}-ok`} className="text-green-600 font-medium">
                            ✔️ OK
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="regular" id={`${item.id}-regular`} />
                          <Label htmlFor={`${item.id}-regular`} className="text-amber-500 font-medium">
                            ⚠️ REGULAR
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="malo" id={`${item.id}-malo`} />
                          <Label htmlFor={`${item.id}-malo`} className="text-red-600 font-medium">
                            ❌ MALO
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="na" id={`${item.id}-na`} />
                          <Label htmlFor={`${item.id}-na`} className="text-gray-500 font-medium">
                            N/A
                          </Label>
                        </div>
                      </RadioGroup>

                      <div>
                        <Label htmlFor={`obs-${item.id}`} className="text-sm text-muted-foreground mb-1 block">
                          Observaciones
                        </Label>
                        <Textarea
                          id={`obs-${item.id}`}
                          value={item.observacion}
                          onChange={(e) => handleObservacionChange(item.id, e.target.value)}
                          placeholder="Ingrese observaciones si es necesario"
                          className="resize-none"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button onClick={onNext} disabled={!isFormValid}>
          Siguiente
        </Button>
      </CardFooter>
    </Card>
  )
}
