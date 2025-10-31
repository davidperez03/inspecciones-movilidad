"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Eye, Wrench } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import type { BitacoraEvento } from "@/lib/bitacora-service"
import { getTipoEvento, parseFechaLocal } from "@/lib/bitacora-config"

interface BitacoraFallasProps {
  eventos: BitacoraEvento[]
  onVerDetalle: (evento: BitacoraEvento) => void
}

export function BitacoraFallas({ eventos, onVerDetalle }: BitacoraFallasProps) {
  // Filtrar solo fallas (por categoría "falla")
  const fallas = eventos.filter((e) => {
    return e.tipo_evento === "falla"
  })

  // Separar fallas abiertas y cerradas
  const fallasAbiertas = fallas.filter((f) => !f.hora_fin)
  const fallasCerradas = fallas.filter((f) => f.hora_fin)

  // Estadísticas por tipo de falla
  const estadisticasPorTipo = fallas.reduce(
    (acc, falla) => {
      const tipo = falla.tipo_evento
      if (!acc[tipo]) {
        acc[tipo] = { count: 0, abiertas: 0 }
      }
      acc[tipo].count++
      if (!falla.hora_fin) acc[tipo].abiertas++
      return acc
    },
    {} as Record<string, { count: number; abiertas: number }>
  )

  if (fallas.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800 flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Sin Fallas Reportadas
          </CardTitle>
          <CardDescription>No hay fallas ni daños registrados en este período</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumen de Fallas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={fallasAbiertas.length > 0 ? "border-red-300 bg-red-50" : "border-gray-200"}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Fallas Abiertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{fallasAbiertas.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Requieren atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Fallas Cerradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{fallasCerradas.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Resueltas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Fallas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{fallas.length}</div>
            <p className="text-xs text-muted-foreground mt-1">En el período</p>
          </CardContent>
        </Card>
      </div>

      {/* Fallas Abiertas - Críticas */}
      {fallasAbiertas.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Fallas Abiertas - Requieren Atención ({fallasAbiertas.length})
            </CardTitle>
            <CardDescription>Vehículos con fallas sin resolver</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {fallasAbiertas.map((falla) => {
                const config = getTipoEvento(falla.tipo_evento)
                const diasAbierto = Math.floor(
                  (new Date().getTime() - parseFechaLocal(falla.fecha).getTime()) / (1000 * 60 * 60 * 24)
                )

                return (
                  <div
                    key={falla.id}
                    className="bg-white rounded-lg border border-red-200 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-lg">{falla.vehiculos?.placa}</span>
                          {config && (
                            <Badge className={config.color} variant="outline">
                              {config.nombre}
                            </Badge>
                          )}
                          {diasAbierto > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {diasAbierto} {diasAbierto === 1 ? "día" : "días"} abierto
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-gray-700 mb-2">{falla.descripcion}</p>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            Reportado: {format(parseFechaLocal(falla.fecha), "dd/MM/yyyy", { locale: es })} a las{" "}
                            {falla.hora_inicio}
                          </span>
                          <span>Turno: {falla.turno}</span>
                        </div>
                      </div>

                      <Button variant="outline" size="sm" onClick={() => onVerDetalle(falla)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estadísticas por Tipo de Falla */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución de Fallas por Tipo</CardTitle>
          <CardDescription>Resumen de fallas registradas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(estadisticasPorTipo)
              .sort(([, a], [, b]) => b.count - a.count)
              .map(([tipo, stats]) => {
                const config = getTipoEvento(tipo)
                return (
                  <div key={tipo} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {config && (
                        <Badge className={config.color} variant="outline">
                          {config.nombre}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-medium">Total: {stats.count}</span>
                      {stats.abiertas > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {stats.abiertas} {stats.abiertas === 1 ? "abierta" : "abiertas"}
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Fallas Cerradas (últimas 5) */}
      {fallasCerradas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fallas Resueltas Recientemente</CardTitle>
            <CardDescription>Últimas 5 fallas cerradas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fallasCerradas.slice(0, 5).map((falla) => {
                const config = getTipoEvento(falla.tipo_evento)
                return (
                  <div key={falla.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{falla.vehiculos?.placa}</span>
                        {config && (
                          <Badge className={config.color} variant="outline">
                            {config.nombre}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{falla.descripcion}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => onVerDetalle(falla)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
