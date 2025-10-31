"use client"

import type { BitacoraEvento } from "@/lib/bitacora-service"
import type { BitacoraCierre } from "@/lib/types"
import type { ReportData, ReportColumn } from "@/lib/report-generator"
import { formatDate, formatDateTime, formatNumber } from "@/lib/report-generator"
import { getTipoEvento, parseFechaLocal } from "@/lib/bitacora-config"

// ============================================================================
// REPORTE DE EVENTOS DE BITÁCORA
// ============================================================================

export interface BitacoraReportFilters {
  vehiculo?: string
  fechaDesde?: string
  fechaHasta?: string
  turno?: string
  tipoEvento?: string
}

export function generarReporteBitacora(
  eventos: BitacoraEvento[],
  filtros: BitacoraReportFilters = {}
): ReportData {
  // Calcular estadísticas
  const totalHoras = eventos.reduce((sum, e) => sum + (e.horas_operacion || 0), 0)
  const eventosAbiertos = eventos.filter((e) => !e.hora_fin).length
  const eventosCerrados = eventos.filter((e) => e.hora_fin).length
  const eventosPorTipo = calcularEventosPorTipo(eventos)

  // Columnas del reporte
  const columns: ReportColumn[] = [
    {
      header: "Fecha",
      key: "fecha",
      width: 12,
      align: "center",
      format: (value) => formatDate(parseFechaLocal(value), "dd/MM/yyyy"),
    },
    {
      header: "Vehículo",
      key: "vehiculo",
      width: 12,
      align: "center",
    },
    {
      header: "Tipo de Evento",
      key: "tipo_evento",
      width: 20,
    },
    {
      header: "Turno",
      key: "turno",
      width: 10,
      align: "center",
    },
    {
      header: "Hora Inicio",
      key: "hora_inicio",
      width: 10,
      align: "center",
    },
    {
      header: "Hora Fin",
      key: "hora_fin",
      width: 10,
      align: "center",
    },
    {
      header: "Horas",
      key: "horas_operacion",
      width: 8,
      align: "right",
      format: (value) => (value !== null ? formatNumber(value, 1) + "h" : "N/A"),
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
      header: "Descripción",
      key: "descripcion",
      width: 40,
    },
  ]

  // Datos formateados
  const data = eventos.map((evento) => ({
    fecha: evento.fecha,
    vehiculo: evento.vehiculos?.placa || "N/A",
    tipo_evento: getTipoEventoTexto(evento.tipo_evento),
    turno: evento.turno ? evento.turno.charAt(0).toUpperCase() + evento.turno.slice(1) : "N/A",
    hora_inicio: evento.hora_inicio,
    hora_fin: evento.hora_fin || "En curso",
    horas_operacion: evento.horas_operacion,
    operario: evento.operarios?.nombre || "N/A",
    auxiliar: evento.auxiliares?.nombre || "N/A",
    descripcion: evento.descripcion,
  }))

  // Metadata
  const metadata: Record<string, any> = {
    "Total de eventos": eventos.length,
    "Eventos cerrados": eventosCerrados,
    "Eventos abiertos": eventosAbiertos,
    "Total de horas": `${formatNumber(totalHoras, 1)}h`,
  }

  // Filtros aplicados
  const filtrosAplicados: Record<string, any> = {}
  if (filtros.vehiculo) filtrosAplicados["Vehículo"] = filtros.vehiculo
  if (filtros.fechaDesde) filtrosAplicados["Desde"] = formatDate(new Date(filtros.fechaDesde))
  if (filtros.fechaHasta) filtrosAplicados["Hasta"] = formatDate(new Date(filtros.fechaHasta))
  if (filtros.turno && filtros.turno !== "all") filtrosAplicados["Turno"] = filtros.turno
  if (filtros.tipoEvento) filtrosAplicados["Tipo de evento"] = filtros.tipoEvento

  return {
    config: {
      title: "Bitácora de Operación - Grúas de Plataforma",
      subtitle: "Registro de eventos operacionales",
      orientation: "landscape",
    },
    sections: [
      {
        title: "Eventos Registrados",
        columns,
        data,
        summary: {
          "Total de horas": `${formatNumber(totalHoras, 1)}h`,
          "Eventos cerrados": eventosCerrados,
          "Eventos abiertos": eventosAbiertos,
          ...eventosPorTipo,
        },
      },
    ],
    metadata,
    filters: filtrosAplicados,
  }
}

// ============================================================================
// REPORTE DE CIERRES DE BITÁCORA
// ============================================================================

export function generarReporteCierresBitacora(
  cierres: BitacoraCierre[],
  filtros: BitacoraReportFilters = {}
): ReportData {
  // Calcular estadísticas totales
  const totalHorasOperacion = cierres.reduce((sum, c) => sum + c.horas_operacion, 0)
  const totalHorasNovedades = cierres.reduce((sum, c) => sum + c.horas_novedades, 0)
  const totalHorasEfectivas = cierres.reduce((sum, c) => sum + c.horas_efectivas, 0)
  const totalEventos = cierres.reduce((sum, c) => sum + c.eventos_ids.length, 0)

  const columns: ReportColumn[] = [
    {
      header: "Vehículo",
      key: "vehiculo",
      width: 12,
      align: "center",
    },
    {
      header: "Período",
      key: "periodo",
      width: 30,
    },
    {
      header: "Turno",
      key: "turno",
      width: 10,
      align: "center",
    },
    {
      header: "Horas Turno",
      key: "horas_totales_turno",
      width: 10,
      align: "right",
      format: (value) => formatNumber(value, 1) + "h",
    },
    {
      header: "H. Operación",
      key: "horas_operacion",
      width: 10,
      align: "right",
      format: (value) => formatNumber(value, 1) + "h",
    },
    {
      header: "H. Novedades",
      key: "horas_novedades",
      width: 10,
      align: "right",
      format: (value) => formatNumber(value, 1) + "h",
    },
    {
      header: "H. Efectivas",
      key: "horas_efectivas",
      width: 10,
      align: "right",
      format: (value) => formatNumber(value, 1) + "h",
    },
    {
      header: "% Efectividad",
      key: "porcentaje_efectividad",
      width: 12,
      align: "right",
      format: (value) => formatNumber(value, 1) + "%",
    },
    {
      header: "Eventos",
      key: "total_eventos",
      width: 8,
      align: "center",
    },
    {
      header: "Operario",
      key: "operario",
      width: 20,
    },
    {
      header: "Observaciones",
      key: "observaciones",
      width: 30,
    },
  ]

  const data = cierres.map((cierre) => {
    const porcentajeEfectividad = (cierre.horas_efectivas / cierre.horas_totales_turno) * 100

    return {
      vehiculo: cierre.vehiculos?.placa || "N/A",
      periodo: formatPeriodo(cierre.fecha_inicio, cierre.hora_inicio, cierre.fecha_fin, cierre.hora_fin),
      turno: cierre.turno.charAt(0).toUpperCase() + cierre.turno.slice(1),
      horas_totales_turno: cierre.horas_totales_turno,
      horas_operacion: cierre.horas_operacion,
      horas_novedades: cierre.horas_novedades,
      horas_efectivas: cierre.horas_efectivas,
      porcentaje_efectividad: porcentajeEfectividad,
      total_eventos: cierre.eventos_ids.length,
      operario: cierre.operarios?.nombre || "N/A",
      observaciones: cierre.observaciones || "N/A",
    }
  })

  const metadata: Record<string, any> = {
    "Total de cierres": cierres.length,
    "Total de eventos": totalEventos,
  }

  const filtrosAplicados: Record<string, any> = {}
  if (filtros.vehiculo) filtrosAplicados["Vehículo"] = filtros.vehiculo
  if (filtros.fechaDesde) filtrosAplicados["Desde"] = formatDate(new Date(filtros.fechaDesde))
  if (filtros.fechaHasta) filtrosAplicados["Hasta"] = formatDate(new Date(filtros.fechaHasta))
  if (filtros.turno && filtros.turno !== "all") filtrosAplicados["Turno"] = filtros.turno

  return {
    config: {
      title: "Cierres de Bitácora",
      subtitle: "Resumen de cierres por vehículo y turno",
      orientation: "landscape",
    },
    sections: [
      {
        title: "Cierres Registrados",
        columns,
        data,
        summary: {
          "Total de cierres": cierres.length,
          "Total de eventos": totalEventos,
          "Total horas de operación": `${formatNumber(totalHorasOperacion, 1)}h`,
          "Total horas de novedades": `${formatNumber(totalHorasNovedades, 1)}h`,
          "Total horas efectivas": `${formatNumber(totalHorasEfectivas, 1)}h`,
          "Promedio efectividad": `${formatNumber((totalHorasEfectivas / totalHorasOperacion) * 100, 1)}%`,
        },
      },
    ],
    metadata,
    filters: filtrosAplicados,
  }
}

// ============================================================================
// REPORTE DIARIO POR GRÚA
// ============================================================================

export function generarReporteDiarioPorGrua(
  eventos: BitacoraEvento[],
  vehiculoPlaca: string,
  fecha: string
): ReportData {
  // Agrupar eventos por turno
  const eventosDiurno = eventos.filter((e) => e.turno === "diurno")
  const eventosNocturno = eventos.filter((e) => e.turno === "nocturno")

  const horasDiurno = eventosDiurno.reduce((sum, e) => sum + (e.horas_operacion || 0), 0)
  const horasNocturno = eventosNocturno.reduce((sum, e) => sum + (e.horas_operacion || 0), 0)

  const columns: ReportColumn[] = [
    {
      header: "Hora Inicio",
      key: "hora_inicio",
      width: 10,
      align: "center",
    },
    {
      header: "Hora Fin",
      key: "hora_fin",
      width: 10,
      align: "center",
    },
    {
      header: "Tipo de Evento",
      key: "tipo_evento",
      width: 20,
    },
    {
      header: "Horas",
      key: "horas_operacion",
      width: 8,
      align: "right",
      format: (value) => (value !== null ? formatNumber(value, 1) + "h" : "N/A"),
    },
    {
      header: "Operario",
      key: "operario",
      width: 20,
    },
    {
      header: "Descripción",
      key: "descripcion",
      width: 40,
    },
  ]

  const sections: any[] = []

  // Sección Turno Diurno
  if (eventosDiurno.length > 0) {
    sections.push({
      title: "Turno Diurno (06:00 - 17:59)",
      columns,
      data: eventosDiurno.map((e) => ({
        hora_inicio: e.hora_inicio,
        hora_fin: e.hora_fin || "En curso",
        tipo_evento: getTipoEventoTexto(e.tipo_evento),
        horas_operacion: e.horas_operacion,
        operario: e.operarios?.nombre || "N/A",
        descripcion: e.descripcion,
      })),
      summary: {
        "Total de eventos": eventosDiurno.length,
        "Total de horas": `${formatNumber(horasDiurno, 1)}h`,
      },
    })
  }

  // Sección Turno Nocturno
  if (eventosNocturno.length > 0) {
    sections.push({
      title: "Turno Nocturno (18:00 - 05:59)",
      columns,
      data: eventosNocturno.map((e) => ({
        hora_inicio: e.hora_inicio,
        hora_fin: e.hora_fin || "En curso",
        tipo_evento: getTipoEventoTexto(e.tipo_evento),
        horas_operacion: e.horas_operacion,
        operario: e.operarios?.nombre || "N/A",
        descripcion: e.descripcion,
      })),
      summary: {
        "Total de eventos": eventosNocturno.length,
        "Total de horas": `${formatNumber(horasNocturno, 1)}h`,
      },
    })
  }

  return {
    config: {
      title: `Bitácora Diaria - ${vehiculoPlaca}`,
      subtitle: `Fecha: ${formatDate(new Date(fecha))}`,
      orientation: "portrait",
    },
    sections,
    metadata: {
      Vehículo: vehiculoPlaca,
      Fecha: formatDate(new Date(fecha)),
      "Total de eventos": eventos.length,
      "Total de horas": `${formatNumber(horasDiurno + horasNocturno, 1)}h`,
    },
  }
}

// ============================================================================
// UTILIDADES
// ============================================================================

function getTipoEventoTexto(tipo: string): string {
  const config = getTipoEvento(tipo)
  if (config) return config.nombre

  // Fallback para tipos antiguos
  const labels: Record<string, string> = {
    operacion: "Operación",
    mantenimiento: "Mantenimiento",
    falla: "Falla",
    inactivo: "Inactivo",
  }
  return labels[tipo] || tipo
}

function calcularEventosPorTipo(eventos: BitacoraEvento[]): Record<string, number> {
  const conteo: Record<string, number> = {}

  eventos.forEach((evento) => {
    const tipoTexto = getTipoEventoTexto(evento.tipo_evento)
    conteo[tipoTexto] = (conteo[tipoTexto] || 0) + 1
  })

  return conteo
}

function formatPeriodo(
  fechaInicio: string,
  horaInicio: string,
  fechaFin: string,
  horaFin: string
): string {
  const inicio = formatDate(new Date(fechaInicio), "dd/MM/yy")
  const fin = formatDate(new Date(fechaFin), "dd/MM/yy")

  if (inicio === fin) {
    return `${inicio} ${horaInicio}-${horaFin}`
  }

  return `${inicio} ${horaInicio} - ${fin} ${horaFin}`
}
