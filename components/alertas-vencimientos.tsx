"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, XCircle, Truck, UserX, ExternalLink } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { AlertaVencimientoVehiculo, AlertaVencimientoLicencia } from "@/lib/types"
import { getAlertasVencimientosVehiculos } from "@/lib/vehiculos-service"
import { getAlertasVencimientosLicencias } from "@/lib/recurso-humano-service"
import { parseFechaLocal } from "@/lib/bitacora-config"

export function AlertasVencimientos() {
  const [alertasVehiculos, setAlertasVehiculos] = useState<AlertaVencimientoVehiculo[]>([])
  const [alertasLicencias, setAlertasLicencias] = useState<AlertaVencimientoLicencia[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarAlertas()
  }, [])

  async function cargarAlertas() {
    try {
      setLoading(true)
      const [vehiculos, licencias] = await Promise.all([
        getAlertasVencimientosVehiculos(),
        getAlertasVencimientosLicencias(),
      ])
      setAlertasVehiculos(vehiculos)
      setAlertasLicencias(licencias)
    } catch (error) {
      console.error("Error al cargar alertas:", error)
    } finally {
      setLoading(false)
    }
  }

  const totalAlertas = alertasVehiculos.length + alertasLicencias.length

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground">Cargando alertas...</div>
        </CardContent>
      </Card>
    )
  }

  if (totalAlertas === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800">Sin Alertas</CardTitle>
          <CardDescription>Todos los documentos y licencias están vigentes</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Alertas de Vehículos */}
      {alertasVehiculos.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-orange-800 flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Documentos de Vehículos
                </CardTitle>
                <CardDescription>
                  {alertasVehiculos.length} {alertasVehiculos.length === 1 ? "vehículo requiere" : "vehículos requieren"} atención
                </CardDescription>
              </div>
              <Link href="/vehiculos">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver Gestión
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alertasVehiculos.map((alerta) => (
                <div
                  key={alerta.id}
                  className="border rounded-lg p-3 bg-white"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-semibold text-lg">{alerta.placa}</span>
                      <p className="text-sm text-muted-foreground">
                        {alerta.marca} {alerta.modelo}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    {/* SOAT */}
                    {alerta.soat_estado !== "VIGENTE" && alerta.soat_vencimiento && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {alerta.soat_estado === "VENCIDO" ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                          )}
                          <span>SOAT:</span>
                        </div>
                        <div className="text-right">
                          <Badge variant={alerta.soat_estado === "VENCIDO" ? "destructive" : "default"} className="mb-1">
                            {alerta.soat_estado}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {format(parseFechaLocal(alerta.soat_vencimiento), "dd/MM/yyyy", { locale: es })}
                            {alerta.dias_soat !== null && ` (${alerta.dias_soat} días)`}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tecnomecánica */}
                    {alerta.tecnomecanica_estado !== "VIGENTE" && alerta.tecnomecanica_vencimiento && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {alerta.tecnomecanica_estado === "VENCIDO" ? (
                            <XCircle className="h-4 w-4 text-red-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-orange-600" />
                          )}
                          <span>Tecnomecánica:</span>
                        </div>
                        <div className="text-right">
                          <Badge variant={alerta.tecnomecanica_estado === "VENCIDO" ? "destructive" : "default"} className="mb-1">
                            {alerta.tecnomecanica_estado}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {format(parseFechaLocal(alerta.tecnomecanica_vencimiento), "dd/MM/yyyy", { locale: es })}
                            {alerta.dias_tecnomecanica !== null && ` (${alerta.dias_tecnomecanica} días)`}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas de Licencias */}
      {alertasLicencias.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <UserX className="h-5 w-5" />
                  Licencias de Conducción
                </CardTitle>
                <CardDescription>
                  {alertasLicencias.length} {alertasLicencias.length === 1 ? "licencia requiere" : "licencias requieren"} atención
                </CardDescription>
              </div>
              <Link href="/recurso-humano">
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver Gestión
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alertasLicencias.map((alerta) => (
                <div
                  key={alerta.id}
                  className="border rounded-lg p-3 bg-white"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <span className="font-semibold text-lg">{alerta.nombre}</span>
                      <p className="text-sm text-muted-foreground">
                        C.C. {alerta.cedula}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Licencia {alerta.licencia_conduccion} - Categoría {alerta.categoria_licencia}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={alerta.licencia_estado === "VENCIDA" ? "destructive" : "default"} className="mb-1">
                        {alerta.licencia_estado}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        {format(parseFechaLocal(alerta.licencia_vencimiento), "dd/MM/yyyy", { locale: es })}
                        {alerta.dias_restantes !== null && ` (${alerta.dias_restantes} días)`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
