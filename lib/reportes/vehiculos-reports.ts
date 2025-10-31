"use client"

import type { Vehiculo } from "@/lib/types"
import type { ReportData, ReportColumn } from "@/lib/report-generator"
import { formatDate, formatBoolean, capitalizarTexto } from "@/lib/report-generator"
import { differenceInDays } from "date-fns"

// ============================================================================
// REPORTE DE FLOTA DE VEHÍCULOS
// ============================================================================

export interface VehiculosReportFilters {
  estado?: "activos" | "inactivos" | "todos"
  tipo?: string
}

export function generarReporteFlotaVehiculos(
  vehiculos: Vehiculo[],
  filtros: VehiculosReportFilters = {}
): ReportData {
  // Calcular estadísticas
  const totalVehiculos = vehiculos.length
  const vehiculosActivos = vehiculos.filter((v) => v.activo).length
  const vehiculosInactivos = vehiculos.filter((v) => !v.activo).length

  const columns: ReportColumn[] = [
    {
      header: "Placa",
      key: "placa",
      width: 12,
      align: "center",
    },
    {
      header: "Marca",
      key: "marca",
      width: 15,
    },
    {
      header: "Modelo",
      key: "modelo",
      width: 15,
    },
    {
      header: "Año",
      key: "anio",
      width: 8,
      align: "center",
    },
    {
      header: "Tipo",
      key: "tipo",
      width: 15,
    },
    {
      header: "SOAT",
      key: "vencimiento_soat",
      width: 12,
      align: "center",
      format: (value) => (value ? formatDate(new Date(value)) : "N/A"),
    },
    {
      header: "Días SOAT",
      key: "dias_soat",
      width: 10,
      align: "center",
    },
    {
      header: "Tecnomecánica",
      key: "vencimiento_tecno",
      width: 12,
      align: "center",
      format: (value) => (value ? formatDate(new Date(value)) : "N/A"),
    },
    {
      header: "Días Tecno",
      key: "dias_tecno",
      width: 10,
      align: "center",
    },
    {
      header: "Estado",
      key: "estado",
      width: 10,
      align: "center",
    },
  ]

  const data = vehiculos.map((vehiculo) => {
    const hoy = new Date()
    const diasSoat = vehiculo.soat_vencimiento
      ? differenceInDays(new Date(vehiculo.soat_vencimiento), hoy)
      : null
    const diasTecno = vehiculo.tecnomecanica_vencimiento
      ? differenceInDays(new Date(vehiculo.tecnomecanica_vencimiento), hoy)
      : null

    return {
      placa: vehiculo.placa.toUpperCase(),
      marca: capitalizarTexto(vehiculo.marca),
      modelo: vehiculo.modelo,
      anio: vehiculo.anio || "N/A",
      tipo: vehiculo.tipo ? capitalizarTexto(vehiculo.tipo) : "N/A",
      vencimiento_soat: vehiculo.soat_vencimiento,
      dias_soat: diasSoat !== null ? (diasSoat >= 0 ? `${diasSoat} días` : `Vencido ${Math.abs(diasSoat)} días`) : "N/A",
      vencimiento_tecno: vehiculo.tecnomecanica_vencimiento,
      dias_tecno: diasTecno !== null ? (diasTecno >= 0 ? `${diasTecno} días` : `Vencido ${Math.abs(diasTecno)} días`) : "N/A",
      estado: vehiculo.activo ? "Activo" : "Inactivo",
    }
  })

  // Vehículos con alertas
  const alertasSoat = vehiculos.filter(
    (v) => v.activo && v.soat_vencimiento && differenceInDays(new Date(v.soat_vencimiento), new Date()) <= 30
  )
  const alertasTecno = vehiculos.filter(
    (v) =>
      v.activo &&
      v.tecnomecanica_vencimiento &&
      differenceInDays(new Date(v.tecnomecanica_vencimiento), new Date()) <= 30
  )

  const metadata: Record<string, any> = {
    "Total de vehículos": totalVehiculos,
    "Vehículos activos": vehiculosActivos,
    "Vehículos inactivos": vehiculosInactivos,
  }

  const filtrosAplicados: Record<string, any> = {}
  if (filtros.estado && filtros.estado !== "todos") {
    filtrosAplicados["Estado"] = filtros.estado === "activos" ? "Activos" : "Inactivos"
  }
  if (filtros.tipo) filtrosAplicados["Tipo"] = filtros.tipo

  return {
    config: {
      title: "Flota de Vehículos",
      subtitle: "Registro de grúas plataforma",
      orientation: "landscape",
    },
    sections: [
      {
        title: "Vehículos Registrados",
        columns,
        data,
        summary: {
          "Total de vehiculos": totalVehiculos,
          "Vehiculos activos": vehiculosActivos,
          "Alertas SOAT (30 dias o menos)": alertasSoat.length,
          "Alertas Tecnomecanica (30 dias o menos)": alertasTecno.length,
        },
      },
    ],
    metadata,
    filters: filtrosAplicados,
  }
}

// ============================================================================
// REPORTE DE VENCIMIENTOS
// ============================================================================

export function generarReporteVencimientos(vehiculos: Vehiculo[]): ReportData {
  const hoy = new Date()

  // Filtrar solo vehículos activos
  const vehiculosActivos = vehiculos.filter((v) => v.activo)

  // Vehículos con alertas de SOAT
  const vehiculosSoat = vehiculosActivos
    .filter((v) => v.soat_vencimiento)
    .map((v) => ({
      placa: v.placa.toUpperCase(),
      marca: capitalizarTexto(v.marca),
      modelo: v.modelo,
      vencimiento: v.soat_vencimiento!,
      dias: differenceInDays(new Date(v.soat_vencimiento!), hoy),
      estado: getEstadoVencimiento(differenceInDays(new Date(v.soat_vencimiento!), hoy)),
    }))
    .sort((a, b) => a.dias - b.dias)

  // Vehículos con alertas de Tecnomecánica
  const vehiculosTecno = vehiculosActivos
    .filter((v) => v.tecnomecanica_vencimiento)
    .map((v) => ({
      placa: v.placa.toUpperCase(),
      marca: capitalizarTexto(v.marca),
      modelo: v.modelo,
      vencimiento: v.tecnomecanica_vencimiento!,
      dias: differenceInDays(new Date(v.tecnomecanica_vencimiento!), hoy),
      estado: getEstadoVencimiento(differenceInDays(new Date(v.tecnomecanica_vencimiento!), hoy)),
    }))
    .sort((a, b) => a.dias - b.dias)

  const columnasVencimiento: ReportColumn[] = [
    {
      header: "Placa",
      key: "placa",
      width: 12,
      align: "center",
    },
    {
      header: "Vehículo",
      key: "vehiculo",
      width: 30,
    },
    {
      header: "Fecha Vencimiento",
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

  const dataSoat = vehiculosSoat.map((v) => ({
    placa: v.placa,
    vehiculo: `${v.marca} ${v.modelo}`,
    vencimiento: v.vencimiento,
    dias: v.dias >= 0 ? v.dias : `Vencido ${Math.abs(v.dias)}`,
    estado: v.estado,
  }))

  const dataTecno = vehiculosTecno.map((v) => ({
    placa: v.placa,
    vehiculo: `${v.marca} ${v.modelo}`,
    vencimiento: v.vencimiento,
    dias: v.dias >= 0 ? v.dias : `Vencido ${Math.abs(v.dias)}`,
    estado: v.estado,
  }))

  const sections: any[] = []

  // Sección SOAT
  if (vehiculosSoat.length > 0) {
    const vencidos = vehiculosSoat.filter((v) => v.dias < 0).length
    const porVencer = vehiculosSoat.filter((v) => v.dias >= 0 && v.dias <= 30).length

    sections.push({
      title: "Vencimientos de SOAT",
      columns: columnasVencimiento,
      data: dataSoat,
      summary: {
        "Total vehiculos": vehiculosSoat.length,
        "SOAT vencido": vencidos,
        "Por vencer (30 dias o menos)": porVencer,
      },
    })
  }

  // Sección Tecnomecánica
  if (vehiculosTecno.length > 0) {
    const vencidos = vehiculosTecno.filter((v) => v.dias < 0).length
    const porVencer = vehiculosTecno.filter((v) => v.dias >= 0 && v.dias <= 30).length

    sections.push({
      title: "Vencimientos de Tecnomecánica",
      columns: columnasVencimiento,
      data: dataTecno,
      summary: {
        "Total vehiculos": vehiculosTecno.length,
        "Tecnomecanica vencida": vencidos,
        "Por vencer (30 dias o menos)": porVencer,
      },
    })
  }

  return {
    config: {
      title: "Reporte de Vencimientos",
      subtitle: "SOAT y Revisión Tecnomecánica",
      orientation: "portrait",
    },
    sections,
    metadata: {
      "Fecha del reporte": formatDate(hoy),
      "Vehículos activos": vehiculosActivos.length,
    },
  }
}

// ============================================================================
// UTILIDADES
// ============================================================================

function getEstadoVencimiento(dias: number): string {
  if (dias < 0) return "VENCIDO"
  if (dias <= 7) return "CRÍTICO"
  if (dias <= 30) return "ALERTA"
  return "VIGENTE"
}
