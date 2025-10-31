"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { InspeccionForm } from "@/components/inspeccion-form"
import { FirmaCanvas } from "@/components/firma-canvas"
import { generatePDF } from "@/lib/pdf-generator"
import { itemsInspeccion } from "@/lib/items-inspeccion"
import { FirmaSupervisorCanvas } from "@/components/firma-supervisor-canvas"
import { Checkbox } from "@/components/ui/checkbox"

import { FotoUpload } from "@/components/foto-upload"
import { saveInspeccion } from "@/lib/inspeccion-service"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { OperarioSelector } from "@/components/operario-selector"
import { AuxiliarSelector } from "@/components/auxiliar-selector"
import { VehiculoSelector } from "@/components/vehiculo-selector"

import { InspectorSelector } from "@/components/inspector-selector"
import { getFechaHoyLocal, getHoraActualLocal } from "@/lib/bitacora-config"

export default function InspeccionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("datos")

  const [formData, setFormData] = useState({
    operarioId: "",
    nombreOperario: "",
    cedulaOperario: "",
    auxiliarId: "",
    nombreAuxiliar: "",
    cedulaAuxiliar: "",
    tieneAuxiliar: false,
    vehiculoId: "",
    placaVehiculo: "",
    // Usar getFechaHoyLocal() para obtener fecha sin problemas de zona horaria
    fecha: getFechaHoyLocal(),
    hora: getHoraActualLocal(),
    inspectorId: "",
    nombreInspector: "",
    cargoInspector: "",
    documentoInspector: "",
    nombreOperarioRecibe: "",
    cedulaOperarioRecibe: "",
    hayOperarioRecibe: false,
    items: itemsInspeccion.map((item) => ({
      id: item.id,
      nombre: item.nombre,
      estado: "",
      observacion: "",
    })),
    firmaDataURL: "",
    firmaSupervisorDataURL: "",
    esApto: true,
  })

  const [isFormValid, setIsFormValid] = useState({
    datos: false,
    items: false,
    firma: false,
    firmaSupervisor: false,
  })

  // Dentro de la función InspeccionPage, agregar el estado para las fotos
  const [fotos, setFotos] = useState<{ url: string; descripcion: string }[]>([])
  const [user, setUser] = useState<any>(null)

  // Agregar este useEffect para verificar la autenticación
  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
      } else {
        router.push("/auth")
      }
    }

    checkAuth()
  }, [router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    validateForm()
  }

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, tieneAuxiliar: checked === true }))
    validateForm()
  }

  const handleOperarioChange = (operarioId: string) => {
    setFormData((prev) => ({ ...prev, operarioId }))
    validateForm()
  }

  const handleOperarioDataChange = (nombre: string, cedula: string) => {
    setFormData((prev) => ({ ...prev, nombreOperario: nombre, cedulaOperario: cedula }))
    validateForm()
  }

  const handleAuxiliarChange = (auxiliarId: string) => {
    setFormData((prev) => ({ ...prev, auxiliarId }))
    validateForm()
  }

  const handleAuxiliarDataChange = (nombre: string, cedula: string) => {
    setFormData((prev) => ({ ...prev, nombreAuxiliar: nombre, cedulaAuxiliar: cedula }))
    validateForm()
  }

  const handleVehiculoChange = (vehiculoId: string) => {
    setFormData((prev) => ({ ...prev, vehiculoId }))
    validateForm()
  }

  const handleVehiculoDataChange = (placa: string) => {
    setFormData((prev) => ({ ...prev, placaVehiculo: placa }))
    validateForm()
  }

  // Agregar funciones para manejar el cambio de inspector
  const handleInspectorChange = (inspectorId: string) => {
    setFormData((prev) => ({ ...prev, inspectorId }))
    validateForm()
  }

  const handleInspectorDataChange = (nombre: string, cargo: string, documento: string) => {
    setFormData((prev) => ({ ...prev, nombreInspector: nombre, cargoInspector: cargo, documentoInspector: documento }))
    validateForm()
  }

  const validateForm = () => {
    setTimeout(() => {
      // Validar datos básicos
      const datosCompletos =
        formData.nombreOperario.trim() !== "" &&
        formData.cedulaOperario.trim() !== "" &&
        formData.placaVehiculo.trim() !== "" &&
        formData.fecha.trim() !== "" &&
        formData.hora.trim() !== "" &&
        formData.nombreInspector.trim() !== "" &&
        formData.cargoInspector.trim() !== "" &&
        formData.documentoInspector.trim() !== "" &&
        // Si tiene auxiliar, validar sus datos
        (!formData.tieneAuxiliar || (formData.nombreAuxiliar.trim() !== "" && formData.cedulaAuxiliar.trim() !== ""))

      setIsFormValid((prev) => ({ ...prev, datos: datosCompletos }))
    }, 100)
  }

  const handleItemsChange = (updatedItems: any[], esApto: boolean) => {
    setFormData((prev) => ({ ...prev, items: updatedItems, esApto }))

    // Validar que todos los items tengan un estado seleccionado
    const itemsCompletos = updatedItems.every((item) => item.estado !== "")
    setIsFormValid((prev) => ({ ...prev, items: itemsCompletos }))
  }

  const handleFirmaChange = (firmaDataURL: string) => {
    setFormData((prev) => ({ ...prev, firmaDataURL }))
    setIsFormValid((prev) => ({ ...prev, firma: firmaDataURL !== "" }))
  }

  const handleFirmaSupervisorChange = (firmaSupervisorDataURL: string) => {
    setFormData((prev) => ({ ...prev, firmaSupervisorDataURL }))
    setIsFormValid((prev) => ({ ...prev, firmaSupervisor: firmaSupervisorDataURL !== "" }))
  }

  // Modificar la función handleSubmit para guardar en la base de datos
  const handleSubmit = async () => {
    // Validar que todos los pasos estén completos
    if (!isFormValid.datos || !isFormValid.items || !isFormValid.firma || !isFormValid.firmaSupervisor) {
      toast({
        title: "Formulario incompleto",
        description: "Por favor complete todos los campos requeridos en cada sección, incluyendo ambas firmas.",
        variant: "destructive",
      })
      return
    }

    try {
      // Transformar formData para que coincida con el tipo Inspeccion (lowercase)
      const inspeccionData = {
        nombreoperario: formData.nombreOperario,
        cedulaoperario: formData.cedulaOperario,
        nombreauxiliar: formData.nombreAuxiliar,
        cedulaauxiliar: formData.cedulaAuxiliar,
        tieneauxiliar: formData.tieneAuxiliar,
        placavehiculo: formData.placaVehiculo,
        fecha: formData.fecha,
        hora: formData.hora,
        nombreinspector: formData.nombreInspector,
        cargoinspector: formData.cargoInspector,
        documentoinspector: formData.documentoInspector,
        esapto: formData.esApto,
        firmadataurl: formData.firmaDataURL,
        firmasupervisordataurl: formData.firmaSupervisorDataURL,
        nombreOperarioRecibe: formData.nombreOperarioRecibe,
        cedulaOperarioRecibe: formData.cedulaOperarioRecibe,
        hayOperarioRecibe: formData.hayOperarioRecibe,
        items: formData.items,
        fotos: [],
        // IDs para validación automática de documentación
        vehiculo_id: formData.vehiculoId || null,
        operario_id: formData.operarioId || null,
        auxiliar_id: formData.tieneAuxiliar ? formData.auxiliarId || null : null,
      }

      // Guardar en la base de datos
      await saveInspeccion(inspeccionData as any, inspeccionData.items, fotos)

      // Generar PDF con datos en lowercase y IDs para validación automática
      await generatePDF({
        ...inspeccionData,
        fotos,
        tipoInspeccion: "Inspección",
      })

      toast({
        title: "Inspección completada",
        description: "La inspección ha sido guardada y el PDF ha sido generado correctamente.",
      })

      // Redireccionar al dashboard después de 2 segundos
      setTimeout(() => {
        router.push("/dashboard")
      }, 2000)
    } catch (error: any) {
      toast({
        title: "Error al guardar la inspección",
        description: error.message || "Ocurrió un error al guardar la inspección. Intente nuevamente.",
        variant: "destructive",
      })
    }
  }

  const handleNextTab = () => {
    if (activeTab === "datos" && isFormValid.datos) {
      setActiveTab("items")
    } else if (activeTab === "items" && isFormValid.items) {
      setActiveTab("firma")
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Formato de Inspección de Grúa Plataforma</h1>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="datos">Datos Básicos</TabsTrigger>
            <TabsTrigger value="items" disabled={!isFormValid.datos}>
              Ítems de Inspección
            </TabsTrigger>
            <TabsTrigger value="firma" disabled={!isFormValid.items}>
              Firma y Finalización
            </TabsTrigger>
          </TabsList>

          <TabsContent value="datos">
            <Card>
              <CardHeader>
                <CardTitle>Datos Básicos</CardTitle>
                <CardDescription>Ingrese la información básica del vehículo y operario</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="operarioId">Operario *</Label>
                  <OperarioSelector
                    value={formData.operarioId}
                    onChange={handleOperarioChange}
                    onDataChange={handleOperarioDataChange}
                  />
                </div>

                <div className="flex items-center space-x-2 mt-4">
                  <Checkbox
                    id="tieneAuxiliar"
                    checked={formData.tieneAuxiliar}
                    onCheckedChange={handleCheckboxChange}
                  />
                  <Label htmlFor="tieneAuxiliar">¿Tiene auxiliar?</Label>
                </div>

                {formData.tieneAuxiliar && (
                  <div className="border-l-2 border-primary pl-4">
                    <div className="space-y-2">
                      <Label htmlFor="auxiliarId">Auxiliar *</Label>
                      <AuxiliarSelector
                        value={formData.auxiliarId}
                        onChange={handleAuxiliarChange}
                        onDataChange={handleAuxiliarDataChange}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2 mt-4">
                  <Label htmlFor="vehiculoId">Vehículo *</Label>
                  <VehiculoSelector
                    value={formData.vehiculoId}
                    onChange={handleVehiculoChange}
                    onDataChange={handleVehiculoDataChange}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fecha">Fecha *</Label>
                    <Input
                      id="fecha"
                      name="fecha"
                      type="date"
                      value={formData.fecha}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hora">Hora *</Label>
                    <Input
                      id="hora"
                      name="hora"
                      type="time"
                      value={formData.hora}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                {/* Reemplazar los campos de inspector con el selector */}
                {/* Buscar la sección "Datos del Inspector" y reemplazarla con: */}
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-lg font-medium mb-3">Datos del Inspector</h3>
                  <div className="space-y-2">
                    <Label htmlFor="inspectorId">Inspector *</Label>
                    <InspectorSelector
                      value={formData.inspectorId}
                      onChange={handleInspectorChange}
                      onDataChange={handleInspectorDataChange}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={handleNextTab} disabled={!isFormValid.datos}>
                  Siguiente
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="items">
            <InspeccionForm items={formData.items} onChange={handleItemsChange} onNext={handleNextTab} />
          </TabsContent>

          <TabsContent value="firma">
            <Card>
              <CardHeader>
                <CardTitle>Firma y Finalización</CardTitle>
                <CardDescription>Firme digitalmente para completar la inspección</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-3">Firma del Operario</h3>
                    <FirmaCanvas onChange={handleFirmaChange} />
                  </div>

                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-3">Firma del Supervisor</h3>
                    <FirmaSupervisorCanvas onChange={handleFirmaSupervisorChange} />
                  </div>

                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-3">Fotos de la Inspección</h3>
                    <FotoUpload onFotosChange={setFotos} />
                  </div>

                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <h3 className="font-semibold mb-2">Resultado de la Inspección:</h3>
                    <div className="flex items-center space-x-4 mb-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="apto-si"
                          name="esApto"
                          checked={formData.esApto}
                          onChange={() => setFormData((prev) => ({ ...prev, esApto: true }))}
                          className="h-4 w-4"
                        />
                        <label htmlFor="apto-si" className="text-green-600 font-medium">
                          ✅ VEHÍCULO APTO PARA OPERAR
                        </label>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="apto-no"
                          name="esApto"
                          checked={!formData.esApto}
                          onChange={() => setFormData((prev) => ({ ...prev, esApto: false }))}
                          className="h-4 w-4"
                        />
                        <label htmlFor="apto-no" className="text-red-600 font-medium">
                          ❌ VEHÍCULO NO APTO PARA OPERAR
                        </label>
                      </div>
                    </div>
                    {!formData.esApto && (
                      <p className="text-sm mt-2 text-muted-foreground">
                        Se han detectado problemas que deben ser corregidos antes de operar el vehículo.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveTab("items")}>
                  Atrás
                </Button>
                <Button onClick={handleSubmit} disabled={!isFormValid.firma || !isFormValid.firmaSupervisor}>
                  Generar PDF
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
