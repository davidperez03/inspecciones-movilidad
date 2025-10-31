"use client"

import type { Inspeccion } from "@/lib/types"
import type { ReportData, ReportColumn } from "@/lib/report-generator"
import { formatDate, formatBoolean, capitalizarTexto } from "@/lib/report-generator"

// ============================================================================
// REPORTE DE INSPECCIONES
// ============================================================================

export interface InspeccionesReportFilters {
  vehiculo?: string
  fechaDesde?: string
  fechaHasta?: string
  resultado?: "aptas" | "no_aptas" | "todas"
  inspector?: string
}

export function generarReporteInspecciones(
  inspecciones: Inspeccion[],
  filtros: InspeccionesReportFilters = {}
): ReportData {
  // Calcular estadísticas
  const totalInspecciones = inspecciones.length
  const inspeccionesAptas = inspecciones.filter((i) => i.esapto).length
  const inspeccionesNoAptas = inspecciones.filter((i) => !i.esapto).length
  const porcentajeAptas = totalInspecciones > 0 ? (inspeccionesAptas / totalInspecciones) * 100 : 0

  // Columnas del reporte
  const columns: ReportColumn[] = [
    {
      header: "Fecha",
      key: "fecha",
      width: 12,
      align: "center",
      format: (value) => formatDate(new Date(value)),
    },
    {
      header: "Hora",
      key: "hora",
      width: 8,
      align: "center",
    },
    {
      header: "Vehículo",
      key: "vehiculo",
      width: 12,
      align: "center",
    },
    {
      header: "Operario",
      key: "operario",
      width: 20,
    },
    {
      header: "Auxiliar",
      key: "auxiliar",
      width: 20,
    },
    {
      header: "Inspector",
      key: "inspector",
      width: 20,
    },
    {
      header: "Cargo",
      key: "cargo_inspector",
      width: 15,
    },
    {
      header: "Resultado",
      key: "resultado",
      width: 12,
      align: "center",
    },
    {
      header: "Items OK",
      key: "items_ok",
      width: 8,
      align: "center",
    },
    {
      header: "Items Regulares",
      key: "items_regulares",
      width: 8,
      align: "center",
    },
    {
      header: "Items Malos",
      key: "items_malos",
      width: 8,
      align: "center",
    },
  ]

  // Datos formateados
  const data = inspecciones.map((inspeccion) => {
    return {
      fecha: inspeccion.fecha,
      hora: inspeccion.hora,
      vehiculo: inspeccion.placavehiculo || "N/A",
      operario: inspeccion.nombreoperario ? capitalizarTexto(inspeccion.nombreoperario) : "N/A",
      auxiliar: inspeccion.nombreauxiliar
        ? capitalizarTexto(inspeccion.nombreauxiliar)
        : inspeccion.tieneauxiliar
          ? "N/A"
          : "No aplica",
      inspector: inspeccion.nombreinspector ? capitalizarTexto(inspeccion.nombreinspector) : "N/A",
      cargo_inspector: inspeccion.cargoinspector ? capitalizarTexto(inspeccion.cargoinspector) : "N/A",
      resultado: inspeccion.esapto ? "APTO" : "NO APTO",
      items_ok: 0, // No tenemos items en la estructura básica
      items_regulares: 0,
      items_malos: 0,
    }
  })

  // Metadata
  const metadata: Record<string, any> = {
    "Total de inspecciones": totalInspecciones,
    "Inspecciones aptas": inspeccionesAptas,
    "Inspecciones no aptas": inspeccionesNoAptas,
    "% Aprobación": `${porcentajeAptas.toFixed(1)}%`,
  }

  // Filtros aplicados
  const filtrosAplicados: Record<string, any> = {}
  if (filtros.vehiculo) filtrosAplicados["Vehículo"] = filtros.vehiculo
  if (filtros.fechaDesde) filtrosAplicados["Desde"] = formatDate(new Date(filtros.fechaDesde))
  if (filtros.fechaHasta) filtrosAplicados["Hasta"] = formatDate(new Date(filtros.fechaHasta))
  if (filtros.resultado && filtros.resultado !== "todas") {
    filtrosAplicados["Resultado"] = filtros.resultado === "aptas" ? "Aptas" : "No Aptas"
  }
  if (filtros.inspector) filtrosAplicados["Inspector"] = filtros.inspector

  return {
    config: {
      title: "Inspecciones de Vehículos",
      subtitle: "Registro de inspecciones técnicas de grúas plataforma",
      orientation: "landscape",
    },
    sections: [
      {
        title: "Inspecciones Registradas",
        columns,
        data,
        summary: {
          "Total de inspecciones": totalInspecciones,
          "Inspecciones aptas": `${inspeccionesAptas} (${porcentajeAptas.toFixed(1)}%)`,
          "Inspecciones no aptas": `${inspeccionesNoAptas} (${(100 - porcentajeAptas).toFixed(1)}%)`,
        },
      },
    ],
    metadata,
    filters: filtrosAplicados,
  }
}

// ============================================================================
// REPORTE DETALLADO DE UNA INSPECCIÓN
// ============================================================================

export function generarReporteInspeccionDetallada(inspeccion: Inspeccion): ReportData {
  // Agrupar items por categoría
  const itemsPorCategoria: Record<string, any[]> = {}

  inspeccion.items.forEach((item) => {
    const categoryId = item.id.substring(0, 2)
    if (!itemsPorCategoria[categoryId]) {
      itemsPorCategoria[categoryId] = []
    }
    itemsPorCategoria[categoryId].push(item)
  })

  const categoryNames: Record<string, string> = {
    "01": "Documentación y Administración",
    "02": "Sistema Mecánico del Vehículo",
    "03": "Sistema Eléctrico y Óptico",
    "04": "Elementos de Seguridad",
    "05": "Cabina y Estructura",
    "06": "Operatividad de la Grúa",
  }

  // Columnas para items
  const columnsItems: ReportColumn[] = [
    {
      header: "Ítem",
      key: "nombre",
      width: 50,
    },
    {
      header: "Estado",
      key: "estado",
      width: 12,
      align: "center",
    },
    {
      header: "Observación",
      key: "observacion",
      width: 40,
    },
  ]

  // Crear secciones por categoría
  const sections: any[] = []

  Object.entries(itemsPorCategoria).forEach(([categoryId, items]) => {
    const dataItems = items.map((item) => ({
      nombre: item.nombre,
      estado: formatEstado(item.estado),
      observacion: item.observacion || "-",
    }))

    sections.push({
      title: categoryNames[categoryId] || `Categoría ${categoryId}`,
      columns: columnsItems,
      data: dataItems,
    })
  })

  // Metadata
  const metadata: Record<string, any> = {
    "Fecha de inspección": formatDate(new Date(inspeccion.fecha)),
    "Hora": inspeccion.hora,
    "Vehículo": inspeccion.placavehiculo || "N/A",
    "Operario": inspeccion.nombreoperario ? capitalizarTexto(inspeccion.nombreoperario) : "N/A",
    "Cédula Operario": inspeccion.cedulaoperario || "N/A",
  }

  if (inspeccion.tieneauxiliar && inspeccion.nombreauxiliar) {
    metadata["Auxiliar"] = capitalizarTexto(inspeccion.nombreauxiliar)
    metadata["Cédula Auxiliar"] = inspeccion.cedulaauxiliar || "N/A"
  }

  metadata["Inspector"] = inspeccion.nombreinspector ? capitalizarTexto(inspeccion.nombreinspector) : "N/A"
  metadata["Cargo Inspector"] = inspeccion.cargoinspector ? capitalizarTexto(inspeccion.cargoinspector) : "N/A"
  metadata["Documento Inspector"] = inspeccion.documentoinspector || "N/A"
  metadata["Resultado"] = inspeccion.esapto ? "APTO PARA OPERAR" : "NO APTO PARA OPERAR"

  return {
    config: {
      title: `Inspección de Vehículo ${inspeccion.placavehiculo || ""}`,
      subtitle: `Fecha: ${formatDate(new Date(inspeccion.fecha))} - ${inspeccion.hora}`,
      orientation: "portrait",
    },
    sections,
    metadata,
  }
}

// ============================================================================
// REPORTE DE INSPECCIONES POR VEHÍCULO
// ============================================================================

export function generarReporteInspeccionesPorVehiculo(
  inspecciones: Inspeccion[],
  vehiculoPlaca: string,
  fechaDesde?: string,
  fechaHasta?: string
): ReportData {
  // Calcular estadísticas
  const totalInspecciones = inspecciones.length
  const inspeccionesAptas = inspecciones.filter((i) => i.esapto).length
  const inspeccionesNoAptas = inspecciones.filter((i) => !i.esapto).length
  const porcentajeAptas = totalInspecciones > 0 ? (inspeccionesAptas / totalInspecciones) * 100 : 0

  // Calcular items más problemáticos
  const itemsProblematicos = calcularItemsProblematicos(inspecciones)

  const columns: ReportColumn[] = [
    {
      header: "Fecha",
      key: "fecha",
      width: 12,
      align: "center",
      format: (value) => formatDate(new Date(value)),
    },
    {
      header: "Hora",
      key: "hora",
      width: 8,
      align: "center",
    },
    {
      header: "Operario",
      key: "operario",
      width: 25,
    },
    {
      header: "Inspector",
      key: "inspector",
      width: 25,
    },
    {
      header: "Resultado",
      key: "resultado",
      width: 12,
      align: "center",
    },
    {
      header: "Items OK",
      key: "items_ok",
      width: 8,
      align: "center",
    },
    {
      header: "Items Problema",
      key: "items_problema",
      width: 8,
      align: "center",
    },
  ]

  const data = inspecciones.map((inspeccion) => {
    const itemsOk = inspeccion.items.filter((item) => item.estado === "ok").length
    const itemsProblema = inspeccion.items.filter((item) => item.estado !== "ok" && item.estado !== "na").length

    return {
      fecha: inspeccion.fecha,
      hora: inspeccion.hora,
      operario: inspeccion.nombreoperario ? capitalizarTexto(inspeccion.operarios.nombre) : "N/A",
      inspector: inspeccion.nombre_inspector ? capitalizarTexto(inspeccion.nombre_inspector) : "N/A",
      resultado: inspeccion.es_apto ? "APTO" : "NO APTO",
      items_ok: itemsOk,
      items_problema: itemsProblema,
    }
  })

  // Secciones
  const sections: any[] = [
    {
      title: "Historial de Inspecciones",
      columns,
      data,
      summary: {
        "Total de inspecciones": totalInspecciones,
        "Inspecciones aptas": `${inspeccionesAptas} (${porcentajeAptas.toFixed(1)}%)`,
        "Inspecciones no aptas": `${inspeccionesNoAptas} (${(100 - porcentajeAptas).toFixed(1)}%)`,
      },
    },
  ]

  // Si hay items problemáticos, agregar sección
  if (itemsProblematicos.length > 0) {
    sections.push({
      title: "Ítems con Mayor Frecuencia de Problemas",
      columns: [
        { header: "Ítem", key: "item", width: 50 },
        { header: "Veces Problemático", key: "count", width: 15, align: "center" },
      ],
      data: itemsProblematicos.slice(0, 10), // Top 10
    })
  }

  const metadata: Record<string, any> = {
    Vehículo: vehiculoPlaca,
    "Total de inspecciones": totalInspecciones,
    "Tasa de aprobación": `${porcentajeAptas.toFixed(1)}%`,
  }

  if (fechaDesde) metadata["Desde"] = formatDate(new Date(fechaDesde))
  if (fechaHasta) metadata["Hasta"] = formatDate(new Date(fechaHasta))

  return {
    config: {
      title: `Historial de Inspecciones - ${vehiculoPlaca}`,
      subtitle: "Análisis de inspecciones del vehículo",
      orientation: "portrait",
    },
    sections,
    metadata,
  }
}

// ============================================================================
// UTILIDADES
// ============================================================================

function formatEstado(estado: string): string {
  const estados: Record<string, string> = {
    ok: "OK",
    regular: "REGULAR",
    malo: "MALO",
    na: "N/A",
  }
  return estados[estado] || estado.toUpperCase()
}

function calcularItemsProblematicos(inspecciones: Inspeccion[]): { item: string; count: number }[] {
  const conteo: Record<string, number> = {}

  inspecciones.forEach((inspeccion) => {
    inspeccion.items.forEach((item) => {
      if (item.estado === "regular" || item.estado === "malo") {
        conteo[item.nombre] = (conteo[item.nombre] || 0) + 1
      }
    })
  })

  return Object.entries(conteo)
    .map(([item, count]) => ({ item, count }))
    .sort((a, b) => b.count - a.count)
}
