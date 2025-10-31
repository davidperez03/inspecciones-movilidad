"use client"

import type { Operario, Auxiliar, HistorialPersonal } from "@/lib/types"
import type { ReportData, ReportColumn } from "@/lib/report-generator"
import { formatDate, formatBoolean, capitalizarTexto } from "@/lib/report-generator"
import { differenceInDays } from "date-fns"

// ============================================================================
// REPORTE DE OPERARIOS
// ============================================================================

export interface OperariosReportFilters {
  estado?: "activos" | "inactivos" | "todos"
}

export function generarReporteOperarios(
  operarios: Operario[],
  filtros: OperariosReportFilters = {}
): ReportData {
  const totalOperarios = operarios.length
  const operariosActivos = operarios.filter((o) => o.activo).length
  const operariosInactivos = operarios.filter((o) => !o.activo).length

  const columns: ReportColumn[] = [
    {
      header: "Nombre",
      key: "nombre",
      width: 25,
    },
    {
      header: "Cédula",
      key: "cedula",
      width: 12,
      align: "center",
    },
    {
      header: "Número Licencia",
      key: "numero_licencia",
      width: 15,
      align: "center",
    },
    {
      header: "Categoría Licencia",
      key: "categoria_licencia",
      width: 12,
      align: "center",
    },
    {
      header: "Vencimiento Licencia",
      key: "vencimiento_licencia",
      width: 15,
      align: "center",
      format: (value) => (value ? formatDate(new Date(value)) : "N/A"),
    },
    {
      header: "Días Licencia",
      key: "dias_licencia",
      width: 12,
      align: "center",
    },
    {
      header: "Fecha Ingreso",
      key: "fecha_ingreso",
      width: 12,
      align: "center",
      format: (value) => (value ? formatDate(new Date(value)) : "N/A"),
    },
    {
      header: "Fecha Retiro",
      key: "fecha_retiro",
      width: 12,
      align: "center",
      format: (value) => (value ? formatDate(new Date(value)) : "N/A"),
    },
    {
      header: "Estado",
      key: "estado",
      width: 10,
      align: "center",
    },
  ]

  const hoy = new Date()
  const data = operarios.map((operario) => {
    const diasLicencia = operario.licencia_vencimiento
      ? differenceInDays(new Date(operario.licencia_vencimiento), hoy)
      : null

    return {
      nombre: capitalizarTexto(operario.nombre),
      cedula: operario.cedula,
      numero_licencia: operario.licencia_conduccion || "N/A",
      categoria_licencia: operario.categoria_licencia || "N/A",
      vencimiento_licencia: operario.licencia_vencimiento,
      dias_licencia: diasLicencia !== null
        ? diasLicencia >= 0
          ? `${diasLicencia} días`
          : `Vencido ${Math.abs(diasLicencia)} días`
        : "N/A",
      fecha_ingreso: operario.fecha_ingreso,
      fecha_retiro: operario.fecha_retiro,
      estado: operario.activo ? "Activo" : "Inactivo",
    }
  })

  // Alertas de licencias
  const alertasLicencia = operarios.filter(
    (o) => o.activo && o.licencia_vencimiento && differenceInDays(new Date(o.licencia_vencimiento), hoy) <= 30
  )

  const metadata: Record<string, any> = {
    "Total de operarios": totalOperarios,
    "Operarios activos": operariosActivos,
    "Operarios inactivos": operariosInactivos,
  }

  const filtrosAplicados: Record<string, any> = {}
  if (filtros.estado && filtros.estado !== "todos") {
    filtrosAplicados["Estado"] = filtros.estado === "activos" ? "Activos" : "Inactivos"
  }

  return {
    config: {
      title: "Registro de Operarios",
      subtitle: "Personal operativo de grúas plataforma",
      orientation: "landscape",
    },
    sections: [
      {
        title: "Operarios Registrados",
        columns,
        data,
        summary: {
          "Total de operarios": totalOperarios,
          "Operarios activos": operariosActivos,
          "Alertas de licencia (30 dias o menos)": alertasLicencia.length,
        },
      },
    ],
    metadata,
    filters: filtrosAplicados,
  }
}

// ============================================================================
// REPORTE DE AUXILIARES
// ============================================================================

export function generarReporteAuxiliares(
  auxiliares: Auxiliar[],
  filtros: OperariosReportFilters = {}
): ReportData {
  const totalAuxiliares = auxiliares.length
  const auxiliaresActivos = auxiliares.filter((a) => a.activo).length
  const auxiliaresInactivos = auxiliares.filter((a) => !a.activo).length

  const columns: ReportColumn[] = [
    {
      header: "Nombre",
      key: "nombre",
      width: 30,
    },
    {
      header: "Cédula",
      key: "cedula",
      width: 15,
      align: "center",
    },
    {
      header: "Fecha Ingreso",
      key: "fecha_ingreso",
      width: 15,
      align: "center",
      format: (value) => (value ? formatDate(new Date(value)) : "N/A"),
    },
    {
      header: "Fecha Retiro",
      key: "fecha_retiro",
      width: 15,
      align: "center",
      format: (value) => (value ? formatDate(new Date(value)) : "N/A"),
    },
    {
      header: "Estado",
      key: "estado",
      width: 12,
      align: "center",
    },
  ]

  const data = auxiliares.map((auxiliar) => ({
    nombre: capitalizarTexto(auxiliar.nombre),
    cedula: auxiliar.cedula,
    fecha_ingreso: auxiliar.fecha_ingreso,
    fecha_retiro: auxiliar.fecha_retiro,
    estado: auxiliar.activo ? "Activo" : "Inactivo",
  }))

  const metadata: Record<string, any> = {
    "Total de auxiliares": totalAuxiliares,
    "Auxiliares activos": auxiliaresActivos,
    "Auxiliares inactivos": auxiliaresInactivos,
  }

  const filtrosAplicados: Record<string, any> = {}
  if (filtros.estado && filtros.estado !== "todos") {
    filtrosAplicados["Estado"] = filtros.estado === "activos" ? "Activos" : "Inactivos"
  }

  return {
    config: {
      title: "Registro de Auxiliares",
      subtitle: "Personal auxiliar de grúas plataforma",
      orientation: "portrait",
    },
    sections: [
      {
        title: "Auxiliares Registrados",
        columns,
        data,
        summary: {
          "Total de auxiliares": totalAuxiliares,
          "Auxiliares activos": auxiliaresActivos,
        },
      },
    ],
    metadata,
    filters: filtrosAplicados,
  }
}

// ============================================================================
// REPORTE DE VENCIMIENTOS DE LICENCIAS
// ============================================================================

export function generarReporteVencimientosLicencias(operarios: Operario[]): ReportData {
  const hoy = new Date()

  // Filtrar solo operarios activos con licencia
  const operariosActivos = operarios.filter((o) => o.activo && o.licencia_vencimiento)

  const operariosConLicencia = operariosActivos
    .map((o) => ({
      nombre: capitalizarTexto(o.nombre),
      cedula: o.cedula,
      numero_licencia: o.licencia_conduccion || "N/A",
      categoria: o.categoria_licencia || "N/A",
      vencimiento: o.licencia_vencimiento!,
      dias: differenceInDays(new Date(o.licencia_vencimiento!), hoy),
      estado: getEstadoVencimientoLicencia(differenceInDays(new Date(o.licencia_vencimiento!), hoy)),
    }))
    .sort((a, b) => a.dias - b.dias)

  const columns: ReportColumn[] = [
    {
      header: "Nombre",
      key: "nombre",
      width: 25,
    },
    {
      header: "Cédula",
      key: "cedula",
      width: 12,
      align: "center",
    },
    {
      header: "N° Licencia",
      key: "numero_licencia",
      width: 15,
      align: "center",
    },
    {
      header: "Categoría",
      key: "categoria",
      width: 10,
      align: "center",
    },
    {
      header: "Vencimiento",
      key: "vencimiento",
      width: 15,
      align: "center",
      format: (value) => formatDate(new Date(value)),
    },
    {
      header: "Días Restantes",
      key: "dias",
      width: 12,
      align: "center",
    },
    {
      header: "Estado",
      key: "estado",
      width: 15,
      align: "center",
    },
  ]

  const data = operariosConLicencia.map((o) => ({
    nombre: o.nombre,
    cedula: o.cedula,
    numero_licencia: o.numero_licencia,
    categoria: o.categoria,
    vencimiento: o.vencimiento,
    dias: o.dias >= 0 ? o.dias : `Vencido ${Math.abs(o.dias)}`,
    estado: o.estado,
  }))

  const vencidas = operariosConLicencia.filter((o) => o.dias < 0).length
  const porVencer = operariosConLicencia.filter((o) => o.dias >= 0 && o.dias <= 30).length
  const criticas = operariosConLicencia.filter((o) => o.dias >= 0 && o.dias <= 7).length

  return {
    config: {
      title: "Vencimientos de Licencias de Conducción",
      subtitle: "Control de licencias de operarios",
      orientation: "portrait",
    },
    sections: [
      {
        title: "Licencias de Operarios",
        columns,
        data,
        summary: {
          "Total operarios con licencia": operariosConLicencia.length,
          "Licencias vencidas": vencidas,
          "Criticas (7 dias o menos)": criticas,
          "Por vencer (30 dias o menos)": porVencer,
        },
      },
    ],
    metadata: {
      "Fecha del reporte": formatDate(hoy),
      "Operarios activos": operarios.filter((o) => o.activo).length,
    },
  }
}

// ============================================================================
// REPORTE DE HISTORIAL DE MOVIMIENTOS
// ============================================================================

export function generarReporteHistorialPersonal(
  historial: HistorialPersonal[],
  fechaDesde?: string,
  fechaHasta?: string
): ReportData {
  const columns: ReportColumn[] = [
    {
      header: "Fecha",
      key: "fecha",
      width: 12,
      align: "center",
      format: (value) => formatDate(new Date(value)),
    },
    {
      header: "Tipo Personal",
      key: "tipo_personal",
      width: 12,
      align: "center",
    },
    {
      header: "Nombre",
      key: "nombre",
      width: 25,
    },
    {
      header: "Cédula",
      key: "cedula",
      width: 12,
      align: "center",
    },
    {
      header: "Tipo Movimiento",
      key: "tipo_movimiento",
      width: 15,
      align: "center",
    },
    {
      header: "Observaciones",
      key: "observaciones",
      width: 40,
    },
  ]

  const data = historial.map((h) => ({
    fecha: h.fecha,
    tipo_personal: h.tipo_personal === "operario" ? "Operario" : "Auxiliar",
    nombre:
      h.tipo_personal === "operario"
        ? h.operarios
          ? capitalizarTexto(h.operarios.nombre)
          : "N/A"
        : h.auxiliares
          ? capitalizarTexto(h.auxiliares.nombre)
          : "N/A",
    cedula:
      h.tipo_personal === "operario" ? h.operarios?.cedula || "N/A" : h.auxiliares?.cedula || "N/A",
    tipo_movimiento: formatTipoMovimiento(h.tipo_movimiento),
    observaciones: h.observaciones || "-",
  }))

  // Contar por tipo de movimiento
  const movimientosPorTipo: Record<string, number> = {}
  historial.forEach((h) => {
    const tipo = formatTipoMovimiento(h.tipo_movimiento)
    movimientosPorTipo[tipo] = (movimientosPorTipo[tipo] || 0) + 1
  })

  const metadata: Record<string, any> = {
    "Total de movimientos": historial.length,
  }

  if (fechaDesde) metadata["Desde"] = formatDate(new Date(fechaDesde))
  if (fechaHasta) metadata["Hasta"] = formatDate(new Date(fechaHasta))

  const filtrosAplicados: Record<string, any> = {}
  if (fechaDesde) filtrosAplicados["Desde"] = formatDate(new Date(fechaDesde))
  if (fechaHasta) filtrosAplicados["Hasta"] = formatDate(new Date(fechaHasta))

  return {
    config: {
      title: "Historial de Movimientos de Personal",
      subtitle: "Registro de ingresos, bajas y actualizaciones",
      orientation: "landscape",
    },
    sections: [
      {
        title: "Movimientos Registrados",
        columns,
        data,
        summary: {
          "Total de movimientos": historial.length,
          ...movimientosPorTipo,
        },
      },
    ],
    metadata,
    filters: filtrosAplicados,
  }
}

// ============================================================================
// UTILIDADES
// ============================================================================

function getEstadoVencimientoLicencia(dias: number): string {
  if (dias < 0) return "VENCIDA"
  if (dias <= 7) return "CRÍTICO"
  if (dias <= 30) return "ALERTA"
  return "VIGENTE"
}

function formatTipoMovimiento(tipo: string): string {
  const tipos: Record<string, string> = {
    ingreso: "Ingreso",
    baja: "Baja",
    reingreso: "Reingreso",
    actualizacion: "Actualización",
  }
  return tipos[tipo] || tipo
}
