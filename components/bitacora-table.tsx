"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Filter, X, FileSpreadsheet, FileDown } from "lucide-react"
import { getBitacoraEventos } from "@/lib/bitacora-service"
import type { BitacoraEvento } from "@/lib/bitacora-service"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { exportarBitacoraAPDF, exportarBitacoraAExcel } from "@/lib/export-utils"
import { TIPOS_EVENTOS, TURNOS, parseFechaLocal } from "@/lib/bitacora-config"

interface FilterState {
  searchTerm: string
  dateFrom: string
  dateTo: string
  tipoEvento: string
  turno: string
}

export function BitacoraTable() {
  const [eventos, setEventos] = useState<BitacoraEvento[]>([])
  const [filteredEventos, setFilteredEventos] = useState<BitacoraEvento[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: "",
    dateFrom: "",
    dateTo: "",
    tipoEvento: "todos",
    turno: "todos",
  })
  const { toast } = useToast()

  useEffect(() => {
    loadEventos()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [filters, eventos])

  async function loadEventos() {
    try {
      const data = await getBitacoraEventos()
      setEventos(data)
      setFilteredEventos(data)
    } catch (error: any) {
      console.error("Error al cargar eventos:", error)
      toast({
        title: "Error",
        description: error.message || "Error al cargar los eventos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  function applyFilters() {
    let filtered = [...eventos]

    // Búsqueda por texto
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(
        (evento) =>
          evento.vehiculos?.placa?.toLowerCase().includes(searchLower) ||
          evento.descripcion?.toLowerCase().includes(searchLower) ||
          evento.operarios?.nombre?.toLowerCase().includes(searchLower)
      )
    }

    // Filtro por fecha desde
    if (filters.dateFrom) {
      filtered = filtered.filter((evento) => {
        const eventoDate = parseFechaLocal(evento.fecha)
        const fromDate = parseFechaLocal(filters.dateFrom)
        return eventoDate >= fromDate
      })
    }

    // Filtro por fecha hasta
    if (filters.dateTo) {
      filtered = filtered.filter((evento) => {
        const eventoDate = parseFechaLocal(evento.fecha)
        const toDate = parseFechaLocal(filters.dateTo)
        return eventoDate <= toDate
      })
    }

    // Filtro por tipo de evento
    if (filters.tipoEvento !== "todos") {
      filtered = filtered.filter((evento) => evento.tipo_evento === filters.tipoEvento)
    }

    // Filtro por turno
    if (filters.turno !== "todos") {
      filtered = filtered.filter((evento) => evento.turno === filters.turno)
    }

    setFilteredEventos(filtered)
  }

  function clearFilters() {
    setFilters({
      searchTerm: "",
      dateFrom: "",
      dateTo: "",
      tipoEvento: "todos",
      turno: "todos",
    })
  }

  function hasActiveFilters() {
    return (
      filters.searchTerm !== "" ||
      filters.dateFrom !== "" ||
      filters.dateTo !== "" ||
      filters.tipoEvento !== "todos" ||
      filters.turno !== "todos"
    )
  }

  async function handleExportPDF() {
    await exportarBitacoraAPDF(filteredEventos)
  }

  async function handleExportExcel() {
    await exportarBitacoraAExcel(filteredEventos)
  }

  const getTipoEventoBadge = (tipo: string) => {
    const config = TIPOS_EVENTOS.find((t) => t.id === tipo)
    return config ? (
      <Badge variant="outline" className={config.color}>
        {config.nombre}
      </Badge>
    ) : (
      <Badge variant="outline">{tipo}</Badge>
    )
  }

  const getTurnoBadge = (turno: string | null) => {
    if (!turno) return <Badge variant="secondary">-</Badge>
    const config = TURNOS.find((t) => t.id === turno)
    return config ? (
      <Badge variant="secondary">{config.nombre}</Badge>
    ) : (
      <Badge variant="secondary">{turno}</Badge>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cargando eventos...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        {/* Encabezado principal */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">Historial de Bitácoras</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredEventos.length} {filteredEventos.length === 1 ? 'evento' : 'eventos'}
              {hasActiveFilters() && ' (filtrados)'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={filteredEventos.length === 0}
              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={filteredEventos.length === 0}
            >
              <FileDown className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? "Ocultar Filtros" : "Mostrar Filtros"}
            </Button>
          </div>
        </div>

        {/* Sección de Filtros */}
        {showFilters && (
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Búsqueda */}
              <div className="space-y-2">
                <Label htmlFor="search">Buscar</Label>
                <Input
                  id="search"
                  placeholder="Placa, operario..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                />
              </div>

              {/* Fecha Desde */}
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Desde</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>

              {/* Fecha Hasta */}
              <div className="space-y-2">
                <Label htmlFor="dateTo">Hasta</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>

              {/* Tipo de Evento */}
              <div className="space-y-2">
                <Label htmlFor="tipoEvento">Tipo de Evento</Label>
                <Select value={filters.tipoEvento} onValueChange={(value) => setFilters({ ...filters, tipoEvento: value })}>
                  <SelectTrigger id="tipoEvento">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {TIPOS_EVENTOS.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.id}>
                        {tipo.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Turno */}
              <div className="space-y-2">
                <Label htmlFor="turno">Turno</Label>
                <Select value={filters.turno} onValueChange={(value) => setFilters({ ...filters, turno: value })}>
                  <SelectTrigger id="turno">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {TURNOS.map((turno) => (
                      <SelectItem key={turno.id} value={turno.id}>
                        {turno.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasActiveFilters() && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Limpiar Filtros
                </Button>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha/Hora</TableHead>
                <TableHead>Vehículo</TableHead>
                <TableHead>Tipo de Evento</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead>Operario</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Horas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEventos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    {hasActiveFilters()
                      ? "No se encontraron eventos con los filtros aplicados"
                      : "No hay eventos registrados"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEventos.map((evento) => (
                  <TableRow key={evento.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{format(parseFechaLocal(evento.fecha), "dd/MM/yyyy", { locale: es })}</span>
                        <span className="text-xs text-muted-foreground">
                          {evento.hora_inicio}
                          {evento.hora_fin && ` - ${evento.hora_fin}`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold">{evento.vehiculos?.placa}</span>
                        <span className="text-xs text-muted-foreground">
                          {evento.vehiculos?.marca} {evento.vehiculos?.modelo}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getTipoEventoBadge(evento.tipo_evento)}</TableCell>
                    <TableCell>{getTurnoBadge(evento.turno)}</TableCell>
                    <TableCell>
                      {evento.operarios?.nombre ? (
                        <span className="text-sm">{evento.operarios.nombre}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={evento.descripcion}>
                      {evento.descripcion}
                    </TableCell>
                    <TableCell className="text-right">
                      {evento.horas_operacion ? (
                        <Badge variant="outline">{evento.horas_operacion}h</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      </CardContent>
    </Card>
  )
}
