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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { FileText, Eye, Download, Search, Filter, X, Calendar, Trash2, Clock } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { getInspecciones, getInspeccion, deleteInspeccion } from "@/lib/inspeccion-service"
import { generatePDF } from "@/lib/pdf-generator"
import type { Inspeccion } from "@/lib/types"
import { ExportReportButton } from "@/components/export-report-button"
import { generarReporteInspecciones } from "@/lib/reportes/inspecciones-reports"

interface FilterState {
  searchTerm: string
  dateFrom: string
  dateTo: string
  estado: string // 'all', 'apto', 'no-apto'
  inspector: string
}

export function DashboardTable() {
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([])
  const [filteredInspecciones, setFilteredInspecciones] = useState<Inspeccion[]>([])
  const [loading, setLoading] = useState(true)
  const [inspectores, setInspectores] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [inspeccionToDelete, setInspeccionToDelete] = useState<Inspeccion | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [downloadingPDFs, setDownloadingPDFs] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    dateFrom: '',
    dateTo: '',
    estado: 'all',
    inspector: 'all'
  })
  const { toast } = useToast()

  useEffect(() => {
    loadInspecciones()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [inspecciones, filters])

  // Agrupar inspecciones por fecha
  const groupedInspecciones = filteredInspecciones.reduce((groups, inspeccion) => {
    const fecha = inspeccion.fecha
    if (!groups[fecha]) {
      groups[fecha] = []
    }
    groups[fecha].push(inspeccion)
    return groups
  }, {} as Record<string, Inspeccion[]>)

  const sortedDates = Object.keys(groupedInspecciones).sort((a, b) => b.localeCompare(a))

  async function loadInspecciones() {
    try {
      const data = await getInspecciones()
      setInspecciones(data)
      
      // Extraer lista única de inspectores
      const uniqueInspectores = [...new Set(data.map(i => i.nombreinspector))]
        .filter(Boolean)
        .sort()
      setInspectores(uniqueInspectores)
    } catch (error: any) {
      console.error("Error al cargar inspecciones:", error)
      toast({
        title: "Error",
        description: error.message || "Error al cargar las inspecciones",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  function applyFilters() {
    let filtered = [...inspecciones]

    // Filtro de búsqueda (placa, operario)
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(i =>
        i.placavehiculo.toLowerCase().includes(searchLower) ||
        i.nombreoperario.toLowerCase().includes(searchLower)
      )
    }

    // Filtro de fecha desde
    if (filters.dateFrom) {
      filtered = filtered.filter(i => i.fecha >= filters.dateFrom)
    }

    // Filtro de fecha hasta
    if (filters.dateTo) {
      filtered = filtered.filter(i => i.fecha <= filters.dateTo)
    }

    // Filtro de estado
    if (filters.estado !== 'all') {
      const esApto = filters.estado === 'apto'
      filtered = filtered.filter(i => i.esapto === esApto)
    }

    // Filtro de inspector
    if (filters.inspector !== 'all') {
      filtered = filtered.filter(i => i.nombreinspector === filters.inspector)
    }

    setFilteredInspecciones(filtered)
  }

  function clearFilters() {
    setFilters({
      searchTerm: '',
      dateFrom: '',
      dateTo: '',
      estado: 'all',
      inspector: 'all'
    })
  }

  function hasActiveFilters() {
    return filters.searchTerm !== '' || 
           filters.dateFrom !== '' || 
           filters.dateTo !== '' || 
           filters.estado !== 'all' || 
           filters.inspector !== 'all'
  }

  async function handleDownloadPDF(inspeccion: Inspeccion) {
    try {
      // Obtener los detalles completos de la inspección
      const inspeccionCompleta = await getInspeccion(inspeccion.id)

      // Formatear items para el PDF
      const itemsFormateados = inspeccionCompleta.items.map((item) => ({
        id: item.item_id,
        nombre: item.nombre,
        estado: item.estado,
        observacion: item.observacion || "",
      }))

      await generatePDF({
        nombreoperario: inspeccionCompleta.nombreoperario,
        cedulaoperario: inspeccionCompleta.cedulaoperario,
        nombreauxiliar: inspeccionCompleta.nombreauxiliar || "",
        cedulaauxiliar: inspeccionCompleta.cedulaauxiliar || "",
        tieneauxiliar: inspeccionCompleta.tieneauxiliar,
        placavehiculo: inspeccionCompleta.placavehiculo,
        fecha: inspeccionCompleta.fecha,
        hora: inspeccionCompleta.hora,
        nombreinspector: inspeccionCompleta.nombreinspector,
        cargoinspector: inspeccionCompleta.cargoinspector,
        documentoinspector: inspeccionCompleta.documentoinspector,
        nombreOperarioRecibe: "",
        cedulaOperarioRecibe: "",
        hayOperarioRecibe: false,
        items: itemsFormateados,
        firmadataurl: inspeccionCompleta.firmadataurl,
        firmasupervisordataurl: inspeccionCompleta.firmasupervisordataurl,
        esapto: inspeccionCompleta.esapto,
        tipoInspeccion: "Inspección",
        // IDs para validación automática de documentación
        vehiculo_id: inspeccionCompleta.vehiculo_id,
        operario_id: inspeccionCompleta.operario_id,
        auxiliar_id: inspeccionCompleta.auxiliar_id,
        fotos: (inspeccionCompleta.fotos || []).map(f => ({
          url: f.url,
          descripcion: f.descripcion || ""
        })),
      })

      toast({
        title: "PDF generado correctamente",
        description: "El PDF ha sido descargado",
      })
    } catch (error: any) {
      console.error("Error al generar PDF:", error)
      toast({
        title: "Error al generar PDF",
        description: error.message || "Ha ocurrido un error",
        variant: "destructive",
      })
    }
  }

  async function handleDownloadSelectedPDFs() {
    if (selectedIds.size === 0) return

    setDownloadingPDFs(true)
    let successCount = 0
    let errorCount = 0

    try {
      const selectedInspecciones = filteredInspecciones.filter(i => selectedIds.has(i.id))

      toast({
        title: "Generando PDFs",
        description: `Descargando ${selectedIds.size} inspecciones...`,
      })

      // Descargar PDFs secuencialmente para evitar sobrecargar el navegador
      for (const inspeccion of selectedInspecciones) {
        try {
          const inspeccionCompleta = await getInspeccion(inspeccion.id)

          const itemsFormateados = inspeccionCompleta.items.map((item) => ({
            id: item.item_id,
            nombre: item.nombre,
            estado: item.estado,
            observacion: item.observacion || "",
          }))

          await generatePDF({
            nombreoperario: inspeccionCompleta.nombreoperario,
            cedulaoperario: inspeccionCompleta.cedulaoperario,
            nombreauxiliar: inspeccionCompleta.nombreauxiliar || "",
            cedulaauxiliar: inspeccionCompleta.cedulaauxiliar || "",
            tieneauxiliar: inspeccionCompleta.tieneauxiliar,
            placavehiculo: inspeccionCompleta.placavehiculo,
            fecha: inspeccionCompleta.fecha,
            hora: inspeccionCompleta.hora,
            nombreinspector: inspeccionCompleta.nombreinspector,
            cargoinspector: inspeccionCompleta.cargoinspector,
            documentoinspector: inspeccionCompleta.documentoinspector,
            nombreOperarioRecibe: "",
            cedulaOperarioRecibe: "",
            hayOperarioRecibe: false,
            items: itemsFormateados,
            firmadataurl: inspeccionCompleta.firmadataurl,
            firmasupervisordataurl: inspeccionCompleta.firmasupervisordataurl,
            esapto: inspeccionCompleta.esapto,
            tipoInspeccion: "Inspección",
            // IDs para validación automática de documentación
            vehiculo_id: inspeccionCompleta.vehiculo_id,
            operario_id: inspeccionCompleta.operario_id,
            auxiliar_id: inspeccionCompleta.auxiliar_id,
            fotos: (inspeccionCompleta.fotos || []).map(f => ({
              url: f.url,
              descripcion: f.descripcion || ""
            })),
          })

          successCount++

          // Pequeña pausa entre descargas para no saturar
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          console.error(`Error al generar PDF para inspección ${inspeccion.id}:`, error)
          errorCount++
        }
      }

      if (successCount > 0) {
        toast({
          title: "PDFs descargados",
          description: `Se descargaron ${successCount} PDF${successCount > 1 ? 's' : ''} correctamente${errorCount > 0 ? `, ${errorCount} fallaron` : ''}`,
        })
      }

      if (errorCount > 0 && successCount === 0) {
        toast({
          title: "Error al descargar PDFs",
          description: `No se pudieron descargar ${errorCount} PDF${errorCount > 1 ? 's' : ''}`,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error al descargar PDFs:", error)
      toast({
        title: "Error",
        description: error.message || "Ha ocurrido un error al descargar los PDFs",
        variant: "destructive",
      })
    } finally {
      setDownloadingPDFs(false)
    }
  }

  function handleSelectAll() {
    if (selectedIds.size === filteredInspecciones.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredInspecciones.map(i => i.id)))
    }
  }

  function handleSelectOne(id: string) {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  function handleDeleteClick(inspeccion: Inspeccion) {
    setInspeccionToDelete(inspeccion)
    setDeleteDialogOpen(true)
  }

  function handleDeleteSelected() {
    setDeleteDialogOpen(true)
  }

  async function handleConfirmDelete() {
    try {
      // Si hay una inspección específica, eliminar solo esa
      if (inspeccionToDelete) {
        await deleteInspeccion(inspeccionToDelete.id)
        toast({
          title: "Inspección eliminada",
          description: "La inspección ha sido eliminada correctamente",
        })
      }
      // Si hay selecciones múltiples, eliminar todas
      else if (selectedIds.size > 0) {
        const deletePromises = Array.from(selectedIds).map(id => deleteInspeccion(id))
        await Promise.all(deletePromises)

        toast({
          title: "Inspecciones eliminadas",
          description: `Se eliminaron ${selectedIds.size} inspecciones correctamente`,
        })
        setSelectedIds(new Set())
      }

      // Recargar las inspecciones
      await loadInspecciones()
    } catch (error: any) {
      console.error("Error al eliminar inspección:", error)
      toast({
        title: "Error al eliminar",
        description: error.message || "Ha ocurrido un error",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setInspeccionToDelete(null)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString + "T00:00:00Z")
      return `${date.getUTCDate().toString().padStart(2, "0")}/${(date.getUTCMonth() + 1).toString().padStart(2, "0")}/${date.getUTCFullYear()}`
    } catch (error) {
      console.error("Error al formatear fecha:", error)
      return dateString
    }
  }

  const formatDateHeader = (dateString: string) => {
    try {
      const date = new Date(dateString + "T00:00:00Z")
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      const dateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
      const inspectionDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())

      if (inspectionDate.getTime() === dateOnly.getTime()) {
        return "Hoy"
      } else if (inspectionDate.getTime() === yesterdayOnly.getTime()) {
        return "Ayer"
      } else {
        const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
        const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
        return `${dias[date.getUTCDay()]}, ${date.getUTCDate()} de ${meses[date.getUTCMonth()]} ${date.getUTCFullYear()}`
      }
    } catch (error) {
      console.error("Error al formatear fecha:", error)
      return dateString
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cargando inspecciones...</CardTitle>
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
            <CardTitle className="text-2xl">Historial de Inspecciones</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {filteredInspecciones.length} {filteredInspecciones.length === 1 ? 'inspección' : 'inspecciones'}
              {hasActiveFilters() && ' (filtradas)'}
            </p>
          </div>
          <div className="flex gap-2">
            <ExportReportButton
              reportData={() => generarReporteInspecciones(filteredInspecciones, {
                vehiculo: filters.searchTerm || undefined,
                fechaDesde: filters.dateFrom || undefined,
                fechaHasta: filters.dateTo || undefined,
                resultado: filters.estado === 'apto' ? 'aptas' : filters.estado === 'no-apto' ? 'no_aptas' : 'todas',
                inspector: filters.inspector !== 'all' ? filters.inspector : undefined,
              })}
              variant="outline"
              size="sm"
              label="Exportar"
              disabled={filteredInspecciones.length === 0}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
              {hasActiveFilters() && (
                <Badge variant="secondary" className="ml-1">
                  {Object.values(filters).filter(v => v !== '' && v !== 'all').length}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Barra de acciones múltiples */}
        {selectedIds.size > 0 && (
          <div className="p-4 bg-gray-50 border-2 border-gray-300 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-gray-700 hover:bg-gray-800">
                  {selectedIds.size} {selectedIds.size === 1 ? 'inspección seleccionada' : 'inspecciones seleccionadas'}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleDownloadSelectedPDFs}
                  disabled={downloadingPDFs}
                  className="flex items-center gap-2"
                >
                  {downloadingPDFs ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Descargando...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Descargar {selectedIds.size} PDF{selectedIds.size > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={downloadingPDFs}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar {selectedIds.size}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Filtros */}
        {showFilters && (
          <div className="p-4 border-2 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros de búsqueda
              </h3>
              {hasActiveFilters() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpiar todo
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Búsqueda */}
              <div className="space-y-1.5 lg:col-span-2">
                <Label htmlFor="search" className="text-xs font-medium">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Placa o operario..."
                    value={filters.searchTerm}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
              </div>

              {/* Fecha desde */}
              <div className="space-y-1.5">
                <Label htmlFor="dateFrom" className="text-xs font-medium">Desde</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>

              {/* Fecha hasta */}
              <div className="space-y-1.5">
                <Label htmlFor="dateTo" className="text-xs font-medium">Hasta</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>

              {/* Estado */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Estado</Label>
                <Select value={filters.estado} onValueChange={(value) => setFilters(prev => ({ ...prev, estado: value }))}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="apto">✓ Apto</SelectItem>
                    <SelectItem value="no-apto">✗ No Apto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Inspector */}
              <div className="space-y-1.5 lg:col-span-2">
                <Label className="text-xs font-medium">Inspector</Label>
                <Select value={filters.inspector} onValueChange={(value) => setFilters(prev => ({ ...prev, inspector: value }))}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los inspectores</SelectItem>
                    {inspectores.map((inspector) => (
                      <SelectItem key={inspector} value={inspector}>
                        {inspector}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Resumen de resultados */}
            {hasActiveFilters() && (
              <div className="flex items-center gap-2 pt-2 border-t text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                Mostrando {filteredInspecciones.length} de {inspecciones.length} inspecciones
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        {filteredInspecciones.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">
              {hasActiveFilters() ? 'No se encontraron inspecciones' : 'No hay inspecciones registradas'}
            </h3>
            <p className="text-muted-foreground mt-2">
              {hasActiveFilters() ? 
                'Intenta ajustar los filtros de búsqueda' : 
                'Las inspecciones que realices aparecerán aquí'
              }
            </p>
            {!hasActiveFilters() && (
              <Button className="mt-4" asChild>
                <Link href="/inspecciones/nueva">Crear Inspección</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((fecha) => {
              const inspeccionesDelDia = groupedInspecciones[fecha]
              const inspeccionesSeleccionadas = inspeccionesDelDia.filter(i => selectedIds.has(i.id)).length

              return (
                <div key={fecha} className="rounded-lg border overflow-hidden shadow-sm">
                  {/* Encabezado de fecha */}
                  <div className="bg-gray-100 border-b px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-md shadow-sm">
                        <Calendar className="h-4 w-4 text-gray-700" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-base text-gray-900">{formatDateHeader(fecha)}</h3>
                        <p className="text-xs text-gray-600">
                          {inspeccionesDelDia.length} {inspeccionesDelDia.length === 1 ? 'inspección' : 'inspecciones'}
                        </p>
                      </div>
                    </div>
                    {inspeccionesSeleccionadas > 0 && (
                      <Badge variant="secondary" className="bg-gray-700 text-white hover:bg-gray-800">
                        {inspeccionesSeleccionadas} seleccionada{inspeccionesSeleccionadas > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>

                  {/* Tabla de inspecciones */}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-white">
                        <TableRow className="border-b border-gray-200">
                          <TableHead className="w-12 py-3">
                            <Checkbox
                              checked={inspeccionesDelDia.every(i => selectedIds.has(i.id))}
                              onCheckedChange={() => {
                                const allSelected = inspeccionesDelDia.every(i => selectedIds.has(i.id))
                                const newSelected = new Set(selectedIds)
                                if (allSelected) {
                                  inspeccionesDelDia.forEach(i => newSelected.delete(i.id))
                                } else {
                                  inspeccionesDelDia.forEach(i => newSelected.add(i.id))
                                }
                                setSelectedIds(newSelected)
                              }}
                              aria-label="Seleccionar todas del día"
                            />
                          </TableHead>
                          <TableHead className="py-3 font-semibold text-xs uppercase text-gray-600">Hora</TableHead>
                          <TableHead className="py-3 font-semibold text-xs uppercase text-gray-600">Placa</TableHead>
                          <TableHead className="py-3 font-semibold text-xs uppercase text-gray-600">Operario</TableHead>
                          <TableHead className="py-3 font-semibold text-xs uppercase text-gray-600">Inspector</TableHead>
                          <TableHead className="py-3 font-semibold text-xs uppercase text-gray-600 text-center">Estado</TableHead>
                          <TableHead className="py-3 font-semibold text-xs uppercase text-gray-600 text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inspeccionesDelDia.map((inspeccion, index) => (
                          <TableRow
                            key={inspeccion.id}
                            className={`
                              ${selectedIds.has(inspeccion.id) ? "bg-gray-50 hover:bg-gray-100" : "hover:bg-gray-50"}
                              transition-colors border-b border-gray-100
                            `}
                          >
                            <TableCell className="py-2.5">
                              <Checkbox
                                checked={selectedIds.has(inspeccion.id)}
                                onCheckedChange={() => handleSelectOne(inspeccion.id)}
                                aria-label={`Seleccionar inspección ${inspeccion.placavehiculo}`}
                              />
                            </TableCell>
                            <TableCell className="py-2.5">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm font-medium">{inspeccion.hora}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2.5">
                              <span className="font-semibold text-sm">
                                {inspeccion.placavehiculo.toUpperCase()}
                              </span>
                            </TableCell>
                            <TableCell className="py-2.5">
                              <span className="text-sm">{inspeccion.nombreoperario}</span>
                            </TableCell>
                            <TableCell className="py-2.5">
                              <span className="text-sm text-muted-foreground">{inspeccion.nombreinspector}</span>
                            </TableCell>
                            <TableCell className="py-2.5 text-center">
                              <Badge
                                variant={inspeccion.esapto ? "default" : "destructive"}
                                className={
                                  inspeccion.esapto
                                    ? "bg-green-100 text-green-800 hover:bg-green-200 text-xs font-medium border border-green-300"
                                    : "bg-red-100 text-red-800 hover:bg-red-200 text-xs font-medium border border-red-300"
                                }
                              >
                                {inspeccion.esapto ? "✓ Apto" : "✗ No Apto"}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hover:bg-gray-100"
                                  asChild
                                >
                                  <Link href={`/inspecciones/${inspeccion.id}`} title="Ver detalles">
                                    <Eye className="h-3.5 w-3.5" />
                                  </Link>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hover:bg-gray-100"
                                  onClick={() => handleDownloadPDF(inspeccion)}
                                  title="Descargar PDF"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteClick(inspeccion)}
                                  title="Eliminar"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              {inspeccionToDelete ? (
                <>
                  Esta acción no se puede deshacer. Se eliminará permanentemente la inspección
                  <span className="font-medium">
                    {" "}del vehículo {inspeccionToDelete.placavehiculo.toUpperCase()} realizada el{" "}
                    {formatDate(inspeccionToDelete.fecha)}
                  </span>
                  .
                </>
              ) : (
                <>
                  Esta acción no se puede deshacer. Se eliminarán permanentemente{" "}
                  <span className="font-medium">{selectedIds.size} inspecciones</span>.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {inspeccionToDelete ? 'Eliminar' : `Eliminar ${selectedIds.size} inspecciones`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
