"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CalendarIcon, ClockIcon, TrendingUpIcon, TrendingDownIcon, FileTextIcon, TrashIcon } from "lucide-react"
import type { BitacoraCierre } from "@/lib/types"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface HistorialCierresProps {
  cierres: BitacoraCierre[]
  onEliminarCierre?: (id: string) => void
  onExportarPDF?: (cierre: BitacoraCierre) => void
  onExportarExcel?: (cierre: BitacoraCierre) => void
  loading?: boolean
}

export function HistorialCierres({ cierres, onEliminarCierre, onExportarPDF, onExportarExcel, loading = false }: HistorialCierresProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de Cierres Diarios</CardTitle>
          <CardDescription>Cargando cierres...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Cargando historial...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (cierres.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de Cierres Diarios</CardTitle>
          <CardDescription>Registro de bitácoras cerradas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No hay cierres diarios registrados en este período
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Cierres de Bitácora</CardTitle>
        <CardDescription>
          {cierres.length} {cierres.length === 1 ? "cierre registrado" : "cierres registrados"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Período</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead className="text-right">Operación</TableHead>
                <TableHead className="text-right">Novedades</TableHead>
                <TableHead className="text-right">Efectivas</TableHead>
                <TableHead>Operario</TableHead>
                <TableHead className="text-center">Eventos</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cierres.map((cierre) => {
                const mismaFecha = cierre.fecha_inicio === cierre.fecha_fin

                return (
                  <TableRow key={cierre.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-sm">
                            {format(new Date(cierre.fecha_inicio), "dd/MM/yyyy", { locale: es })}
                            {!mismaFecha && ` - ${format(new Date(cierre.fecha_fin), "dd/MM/yyyy", { locale: es })}`}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <ClockIcon className="h-3 w-3" />
                            {cierre.hora_inicio} - {cierre.hora_fin}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {cierre.turno ? (
                        <Badge variant={
                          cierre.turno === "diurno" ? "default" :
                          cierre.turno === "nocturno" ? "secondary" :
                          "outline"
                        }>
                          {cierre.turno === "diurno" ? "Diurno" :
                           cierre.turno === "nocturno" ? "Nocturno" :
                           "Mixto"}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUpIcon className="h-3 w-3 text-green-500" />
                        <span className="text-green-600 font-medium">{cierre.horas_operacion}h</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TrendingDownIcon className="h-3 w-3 text-red-500" />
                        <span className="text-red-600 font-medium">{cierre.horas_novedades}h</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="font-bold text-primary">
                        {cierre.horas_efectivas}h
                      </div>
                    </TableCell>

                    <TableCell>
                      {cierre.operarios?.nombre ? (
                        <span className="text-sm">{cierre.operarios.nombre}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sin asignar</span>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <FileTextIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{cierre.eventos_ids.length}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {onExportarPDF && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onExportarPDF(cierre)}
                            className="h-8 px-2"
                            title="Exportar a PDF"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </Button>
                        )}
                        {onExportarExcel && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onExportarExcel(cierre)}
                            className="h-8 px-2"
                            title="Exportar a Excel"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </Button>
                        )}
                        {onEliminarCierre && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEliminarCierre(cierre.id)}
                            className="h-8 px-2"
                            title="Eliminar cierre"
                          >
                            <TrashIcon className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Resumen Total */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Operación</div>
              <div className="text-2xl font-bold text-green-600">
                {cierres.reduce((sum, c) => sum + c.horas_operacion, 0).toFixed(2)}h
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Novedades</div>
              <div className="text-2xl font-bold text-red-600">
                {cierres.reduce((sum, c) => sum + c.horas_novedades, 0).toFixed(2)}h
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">Total Efectivas</div>
              <div className="text-2xl font-bold text-primary">
                {cierres.reduce((sum, c) => sum + c.horas_efectivas, 0).toFixed(2)}h
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  )
}
