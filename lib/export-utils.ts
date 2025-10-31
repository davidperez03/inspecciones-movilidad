import type { BitacoraEvento } from "./bitacora-service"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { getTipoEvento, parseFechaLocal } from "./bitacora-config"

export async function exportarBitacoraAPDF(
  eventos: BitacoraEvento[],
  periodo?: { nombre: string; desde: string; hasta: string }
) {
  // Importación dinámica para evitar errores en SSR
  const jsPDF = (await import("jspdf")).default
  const autoTable = (await import("jspdf-autotable")).default

  const doc = new jsPDF()

  // Título
  doc.setFontSize(18)
  doc.setTextColor(41, 128, 185)
  doc.text("BITÁCORA DE OPERACIÓN - GRÚAS DE PLATAFORMA", 14, 15)

  // Información del reporte
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  let yPosition = 25

  if (periodo) {
    doc.setFont(undefined, "bold")
    doc.text(`Período: ${periodo.nombre}`, 14, yPosition)
    yPosition += 6
    doc.setFont(undefined, "normal")
    doc.text(`Desde: ${format(new Date(periodo.desde), "dd/MM/yyyy", { locale: es })} - Hasta: ${format(new Date(periodo.hasta), "dd/MM/yyyy", { locale: es })}`, 14, yPosition)
    yPosition += 6
  }

  doc.text(`Fecha de generación: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`, 14, yPosition)
  yPosition += 6
  doc.text(`Total de eventos: ${eventos.length}`, 14, yPosition)
  yPosition += 10

  // Tabla de eventos
  const tableData = eventos.map((evento) => [
    format(parseFechaLocal(evento.fecha), "dd/MM/yyyy", { locale: es }),
    evento.vehiculos?.placa || "N/A",
    getTipoEventoTexto(evento.tipo_evento),
    evento.turno || "N/A",
    `${evento.hora_inicio} - ${evento.hora_fin || "En curso"}`,
    evento.horas_operacion !== null ? `${evento.horas_operacion.toFixed(1)}h` : "N/A",
    evento.operarios?.nombre || "N/A",
    evento.descripcion.substring(0, 50) + (evento.descripcion.length > 50 ? "..." : ""),
  ])

  autoTable(doc, {
    startY: yPosition,
    head: [["Fecha", "Vehículo", "Tipo", "Turno", "Horario", "Horas", "Operario", "Descripción"]],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
  })

  // Estadísticas al final
  const totalHoras = eventos.reduce((sum, e) => sum + (e.horas_operacion || 0), 0)
  const eventosAbiertos = eventos.filter((e) => !e.hora_fin).length
  const eventosCerrados = eventos.filter((e) => e.hora_fin).length

  const finalY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(10)
  doc.text("Resumen", 14, finalY)
  doc.setFontSize(9)
  doc.text(`Total de horas: ${totalHoras.toFixed(1)}h`, 14, finalY + 6)
  doc.text(`Eventos cerrados: ${eventosCerrados}`, 14, finalY + 12)
  doc.text(`Eventos abiertos: ${eventosAbiertos}`, 14, finalY + 18)

  // Guardar
  const nombreArchivo = periodo
    ? `bitacora_${periodo.nombre.toLowerCase().replace(/ /g, "_")}_${format(new Date(), "yyyyMMdd")}.pdf`
    : `bitacora_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`
  doc.save(nombreArchivo)
}

export async function exportarBitacoraAExcel(
  eventos: BitacoraEvento[],
  periodo?: { nombre: string; desde: string; hasta: string }
) {
  // Importación dinámica para evitar errores en SSR
  const XLSX = await import("xlsx")

  // Preparar datos
  const data = eventos.map((evento) => ({
    Fecha: format(parseFechaLocal(evento.fecha), "dd/MM/yyyy", { locale: es }),
    Vehículo: evento.vehiculos?.placa || "N/A",
    Marca: evento.vehiculos?.marca || "N/A",
    Modelo: evento.vehiculos?.modelo || "N/A",
    "Tipo de Evento": getTipoEventoTexto(evento.tipo_evento),
    Turno: evento.turno || "N/A",
    "Hora Inicio": evento.hora_inicio,
    "Hora Fin": evento.hora_fin || "En curso",
    "Horas de Operación": evento.horas_operacion !== null ? evento.horas_operacion.toFixed(1) : "N/A",
    Operario: evento.operarios?.nombre || "N/A",
    Auxiliar: evento.auxiliares?.nombre || "N/A",
    Descripción: evento.descripcion,
  }))

  // Crear hoja de cálculo
  const ws = XLSX.utils.json_to_sheet(data)

  // Ajustar anchos de columna
  const columnWidths = [
    { wch: 12 }, // Fecha
    { wch: 12 }, // Vehículo
    { wch: 12 }, // Marca
    { wch: 12 }, // Modelo
    { wch: 15 }, // Tipo
    { wch: 10 }, // Turno
    { wch: 12 }, // Hora Inicio
    { wch: 12 }, // Hora Fin
    { wch: 12 }, // Horas
    { wch: 20 }, // Operario
    { wch: 20 }, // Auxiliar
    { wch: 50 }, // Descripción
  ]
  ws["!cols"] = columnWidths

  // Crear libro y agregar hoja
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Bitácora")

  // Agregar hoja de resumen
  const totalHoras = eventos.reduce((sum, e) => sum + (e.horas_operacion || 0), 0)
  const eventosAbiertos = eventos.filter((e) => !e.hora_fin).length
  const eventosCerrados = eventos.filter((e) => e.hora_fin).length

  const resumenData = [
    { Concepto: "Período", Valor: periodo?.nombre || "No especificado" },
    ...(periodo
      ? [
          {
            Concepto: "Rango de fechas",
            Valor: `${format(new Date(periodo.desde), "dd/MM/yyyy")} - ${format(new Date(periodo.hasta), "dd/MM/yyyy")}`,
          },
        ]
      : []),
    { Concepto: "Total de eventos", Valor: eventos.length },
    { Concepto: "Eventos cerrados", Valor: eventosCerrados },
    { Concepto: "Eventos abiertos", Valor: eventosAbiertos },
    { Concepto: "Total de horas", Valor: totalHoras.toFixed(1) },
    { Concepto: "Fecha de generación", Valor: format(new Date(), "dd/MM/yyyy HH:mm", { locale: es }) },
  ]

  const wsResumen = XLSX.utils.json_to_sheet(resumenData)
  wsResumen["!cols"] = [{ wch: 25 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen")

  // Guardar archivo
  const nombreArchivo = periodo
    ? `bitacora_${periodo.nombre.toLowerCase().replace(/ /g, "_")}_${format(new Date(), "yyyyMMdd")}.xlsx`
    : `bitacora_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`
  XLSX.writeFile(wb, nombreArchivo)
}

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
