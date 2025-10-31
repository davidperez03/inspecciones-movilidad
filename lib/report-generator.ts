"use client"

import { format } from "date-fns"
import { es } from "date-fns/locale"

/**
 * Servicio central de generación de reportes
 * Soporta PDF, Excel y CSV con diseño profesional
 */

// ============================================================================
// TIPOS Y CONFIGURACIONES
// ============================================================================

export type ReportFormat = "pdf" | "excel" | "csv"

export interface ReportConfig {
  title: string
  subtitle?: string
  company?: string
  logo?: string
  footer?: string
  orientation?: "portrait" | "landscape"
  pageSize?: "a4" | "letter"
}

export interface ReportColumn {
  header: string
  key: string
  width?: number
  align?: "left" | "center" | "right"
  format?: (value: any) => string
}

export interface ReportSection {
  title: string
  data: any[]
  columns: ReportColumn[]
  summary?: Record<string, any>
}

export interface ReportData {
  config: ReportConfig
  sections: ReportSection[]
  metadata?: Record<string, any>
  filters?: Record<string, any>
}

// ============================================================================
// UTILIDADES DE FORMATO
// ============================================================================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatDate(date: Date | string, formatStr = "dd/MM/yyyy"): string {
  const d = typeof date === "string" ? new Date(date) : date
  return format(d, formatStr, { locale: es })
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, "dd/MM/yyyy HH:mm")
}

export function formatBoolean(value: boolean, trueText = "Sí", falseText = "No"): string {
  return value ? trueText : falseText
}

export function capitalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ")
}

// ============================================================================
// GENERACIÓN DE PDF
// ============================================================================

export async function generatePDFReport(reportData: ReportData): Promise<void> {
  const jsPDF = (await import("jspdf")).default
  const autoTable = (await import("jspdf-autotable")).default

  const { config, sections, metadata, filters } = reportData
  const isLandscape = config.orientation === "landscape"

  const doc = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "mm",
    format: config.pageSize || "a4",
  })

  const pageWidth = isLandscape ? 297 : 210
  const pageHeight = isLandscape ? 210 : 297
  const margin = 20  // Márgenes más amplios

  let currentY = margin

  // ============================================================================
  // ENCABEZADO DEL REPORTE CON DISEÑO PROFESIONAL
  // ============================================================================

  // Barra superior de color
  doc.setFillColor(41, 128, 185)  // Azul corporativo
  doc.rect(0, 0, pageWidth, 12, "F")

  // Logo (si existe) sobre la barra de color
  if (config.logo) {
    try {
      doc.addImage(config.logo, "PNG", margin, 3, 25, 12)
    } catch (error) {
      console.error("Error al agregar logo:", error)
    }
  }

  // Nombre de la empresa en blanco sobre la barra
  if (config.company) {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(255, 255, 255)
    doc.text(config.company, pageWidth - margin, 8, { align: "right" })
  }

  currentY = 20

  // Caja de título con fondo
  doc.setFillColor(248, 249, 250)  // Gris muy claro
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.5)
  doc.roundedRect(margin, currentY, pageWidth - 2 * margin, 22, 2, 2, "FD")

  // Título principal
  currentY += 8
  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.setTextColor(33, 37, 41)  // Casi negro
  doc.text(config.title.toUpperCase(), pageWidth / 2, currentY, { align: "center" })
  currentY += 8

  // Subtítulo
  if (config.subtitle) {
    doc.setFontSize(11)
    doc.setTextColor(108, 117, 125)  // Gris medio
    doc.setFont("helvetica", "normal")
    doc.text(config.subtitle, pageWidth / 2, currentY, { align: "center" })
  }

  currentY += 12

  // ============================================================================
  // INFORMACIÓN DEL REPORTE (Metadata) - DISEÑO MEJORADO
  // ============================================================================

  if (metadata || filters) {
    // Caja de información con borde
    const infoBoxWidth = (pageWidth - 2 * margin) / 2 - 5
    const infoBoxX = margin

    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.5)
    doc.roundedRect(infoBoxX, currentY, infoBoxWidth, 0, 2, 2, "D")  // Se ajustará después

    const infoStartY = currentY
    currentY += 5

    // Título de sección de información
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(52, 73, 94)
    doc.text("INFORMACIÓN GENERAL", infoBoxX + 5, currentY)
    currentY += 7

    // Metadata
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        doc.setFont("helvetica", "bold")
        doc.setTextColor(73, 80, 87)
        doc.text(key + ":", infoBoxX + 5, currentY)

        doc.setFont("helvetica", "normal")
        doc.setTextColor(33, 37, 41)
        doc.text(String(value), infoBoxX + 55, currentY)
        currentY += 5
      })
    }

    // Fecha de generación
    doc.setFont("helvetica", "bold")
    doc.setTextColor(73, 80, 87)
    doc.text("Generado:", infoBoxX + 5, currentY)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(33, 37, 41)
    doc.text(formatDateTime(new Date()), infoBoxX + 55, currentY)
    currentY += 7

    const infoBoxHeight = currentY - infoStartY
    doc.roundedRect(infoBoxX, infoStartY, infoBoxWidth, infoBoxHeight, 2, 2, "D")

    // Filtros (si existen) en una segunda caja
    if (filters && Object.keys(filters).length > 0) {
      const filterBoxX = infoBoxX + infoBoxWidth + 10
      currentY = infoStartY

      doc.setFillColor(255, 248, 220)  // Fondo amarillo muy claro
      doc.setDrawColor(255, 193, 7)  // Borde amarillo
      doc.roundedRect(filterBoxX, currentY, infoBoxWidth, 0, 2, 2, "FD")

      currentY += 5
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(52, 73, 94)
      doc.text("FILTROS APLICADOS", filterBoxX + 5, currentY)
      currentY += 7

      doc.setFontSize(9)
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          doc.setFont("helvetica", "bold")
          doc.setTextColor(73, 80, 87)
          doc.text(key + ":", filterBoxX + 5, currentY)

          doc.setFont("helvetica", "normal")
          doc.setTextColor(33, 37, 41)
          doc.text(String(value), filterBoxX + 45, currentY)
          currentY += 5
        }
      })

      const filterBoxHeight = currentY - infoStartY
      doc.setDrawColor(255, 193, 7)
      doc.roundedRect(filterBoxX, infoStartY, infoBoxWidth, filterBoxHeight, 2, 2, "D")
    }

    currentY = Math.max(currentY, infoStartY + infoBoxHeight) + 10
  }

  // ============================================================================
  // SECCIONES DE DATOS
  // ============================================================================

  sections.forEach((section, sectionIndex) => {
    // Verificar si necesitamos nueva página
    if (currentY > pageHeight - 60) {
      doc.addPage()
      currentY = margin
    }

    // Banner de título de sección con diseño moderno
    doc.setFillColor(41, 128, 185)  // Azul corporativo
    doc.setDrawColor(41, 128, 185)
    doc.roundedRect(margin, currentY - 2, pageWidth - 2 * margin, 10, 1, 1, "FD")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(255, 255, 255)  // Blanco
    doc.text(section.title.toUpperCase(), margin + 5, currentY + 5)
    currentY += 12

    // Preparar columnas
    const tableColumns = section.columns.map(col => col.header)
    const tableData = section.data.map(row =>
      section.columns.map(col => {
        const value = row[col.key]
        if (col.format) {
          return col.format(value)
        }
        if (value === null || value === undefined) {
          return "N/A"
        }
        return String(value)
      })
    )

    // Calcular ancho disponible
    const availableWidth = pageWidth - 2 * margin

    // Configurar estilos de columnas
    const columnStyles: any = {}
    section.columns.forEach((col, index) => {
      columnStyles[index] = {
        halign: col.align || "left",
      }
    })

    // Generar tabla que respete los márgenes
    autoTable(doc, {
      startY: currentY,
      head: [tableColumns],
      body: tableData,
      theme: "grid",
      styles: {
        overflow: "linebreak",
        fontSize: 8,
        cellPadding: 2.5,
      },
      headStyles: {
        fillColor: [52, 73, 94],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
        halign: "center",
        cellPadding: 3,
        lineWidth: 0.1,
        lineColor: [200, 200, 200],
      },
      bodyStyles: {
        lineWidth: 0.1,
        lineColor: [220, 220, 220],
        textColor: [33, 37, 41],
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250],
      },
      columnStyles,
      margin: { left: margin, right: margin },
      tableWidth: availableWidth,
      didDrawPage: () => {
        drawFooter(doc, pageWidth, pageHeight, config.footer)
      },
    })

    currentY = (doc as any).lastAutoTable.finalY + 8

    // ============================================================================
    // RESUMEN DE SECCIÓN MEJORADO (si existe)
    // ============================================================================

    if (section.summary && Object.keys(section.summary).length > 0) {
      if (currentY > pageHeight - 50) {
        doc.addPage()
        currentY = margin + 15
      }

      // Caja de resumen con diseño destacado
      const summaryBoxWidth = (pageWidth - 2 * margin) * 0.7
      const summaryBoxX = margin + (pageWidth - 2 * margin - summaryBoxWidth) / 2

      // Título del resumen
      doc.setFont("helvetica", "bold")
      doc.setFontSize(11)
      doc.setTextColor(255, 255, 255)
      doc.setFillColor(41, 128, 185)
      doc.rect(summaryBoxX, currentY, summaryBoxWidth, 8, "F")
      doc.text("RESUMEN", summaryBoxX + summaryBoxWidth / 2, currentY + 5.5, { align: "center" })
      currentY += 8

      // Datos del resumen en tabla
      const summaryData = Object.entries(section.summary).map(([key, value]) => [
        key,
        String(value),
      ])

      autoTable(doc, {
        startY: currentY,
        body: summaryData,
        theme: "grid",
        styles: {
          fontSize: 9,
          cellPadding: 3,
          lineWidth: 0.1,
          lineColor: [220, 220, 220],
          overflow: "linebreak",
        },
        columnStyles: {
          0: {
            fontStyle: "bold",
            cellWidth: summaryBoxWidth * 0.65,
            fillColor: [248, 249, 250],
            textColor: [52, 73, 94],
            halign: "left",
          },
          1: {
            cellWidth: summaryBoxWidth * 0.35,
            halign: "right",
            fontStyle: "bold",
            textColor: [41, 128, 185],
            fillColor: [255, 255, 255],
          },
        },
        margin: { left: summaryBoxX, right: pageWidth - summaryBoxX - summaryBoxWidth },
        tableWidth: summaryBoxWidth,
      })

      currentY = (doc as any).lastAutoTable.finalY + 10
    }

    // Espacio entre secciones
    currentY += 5
  })

  // ============================================================================
  // PIE DE PÁGINA EN TODAS LAS PÁGINAS
  // ============================================================================

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: "center" })
  }

  // Guardar PDF
  const fileName = generateFileName(config.title, "pdf")
  doc.save(fileName)
}

function drawFooter(doc: any, pageWidth: number, pageHeight: number, footerText?: string) {
  if (footerText) {
    doc.setFontSize(8)
    doc.setTextColor(128, 128, 128)
    doc.text(footerText, pageWidth / 2, pageHeight - 5, { align: "center" })
  }
}

// ============================================================================
// GENERACIÓN DE EXCEL
// ============================================================================

export async function generateExcelReport(reportData: ReportData): Promise<void> {
  const XLSX = await import("xlsx")
  const { config, sections, metadata, filters } = reportData

  const wb = XLSX.utils.book_new()

  // Definir propiedades del workbook
  wb.Props = {
    Title: config.title,
    Subject: config.subtitle || "",
    Author: config.company || "Sistema de Reportes",
    CreatedDate: new Date()
  }

  // ============================================================================
  // HOJA DE PORTADA / INFORMACIÓN
  // ============================================================================

  const infoData: any[] = []

  // Título y empresa
  infoData.push([config.title.toUpperCase()])
  if (config.subtitle) {
    infoData.push([config.subtitle])
  }
  if (config.company) {
    infoData.push([config.company])
  }
  infoData.push([]) // Línea en blanco

  // Información general
  infoData.push(["INFORMACIÓN GENERAL"])
  infoData.push(["Concepto", "Valor"])

  // Metadata
  if (metadata && Object.keys(metadata).length > 0) {
    Object.entries(metadata).forEach(([key, value]) => {
      infoData.push([key, String(value)])
    })
  }

  infoData.push(["Fecha de generación", formatDateTime(new Date())])

  // Filtros aplicados
  if (filters && Object.keys(filters).length > 0) {
    infoData.push([]) // Línea en blanco
    infoData.push(["FILTROS APLICADOS"])
    infoData.push(["Filtro", "Valor"])
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        infoData.push([key, String(value)])
      }
    })
  }

  const wsInfo = XLSX.utils.aoa_to_sheet(infoData)

  // Configurar anchos de columna
  wsInfo["!cols"] = [{ wch: 35 }, { wch: 55 }]

  // Aplicar estilos a la hoja de información (simulado con merge)
  const merges: any[] = []
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }) // Título
  if (config.subtitle) {
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 1 } })
  }
  wsInfo["!merges"] = merges

  XLSX.utils.book_append_sheet(wb, wsInfo, "Informacion")

  // ============================================================================
  // HOJAS DE DATOS CON FORMATO PROFESIONAL
  // ============================================================================

  sections.forEach((section, index) => {
    // Array para construir la hoja completa
    const sheetData: any[][] = []

    // Título de la sección
    sheetData.push([section.title.toUpperCase()])
    sheetData.push([]) // Línea en blanco

    // Encabezados de columnas
    const headers = section.columns.map(col => col.header)
    sheetData.push(headers)

    // Datos
    section.data.forEach(row => {
      const rowData = section.columns.map(col => {
        const value = row[col.key]
        if (col.format) {
          return col.format(value)
        }
        if (value === null || value === undefined) {
          return "N/A"
        }
        return value
      })
      sheetData.push(rowData)
    })

    // Agregar resumen si existe
    if (section.summary && Object.keys(section.summary).length > 0) {
      sheetData.push([]) // Línea en blanco
      sheetData.push([]) // Línea en blanco
      sheetData.push(["RESUMEN"])
      sheetData.push(["Concepto", "Valor"])

      Object.entries(section.summary).forEach(([key, value]) => {
        sheetData.push([key, String(value)])
      })
    }

    const ws = XLSX.utils.aoa_to_sheet(sheetData)

    // Configurar anchos de columna basados en el ancho definido
    const colWidths = section.columns.map(col => ({
      wch: col.width ? col.width * 1.2 : 18, // Multiplicar por factor para mejor ajuste
    }))
    ws["!cols"] = colWidths

    // Merge del título
    const merges: any[] = []
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } })
    ws["!merges"] = merges

    // Congelar paneles (freeze panes) - Primera fila de datos
    ws["!freeze"] = { xSplit: 0, ySplit: 3, topLeftCell: "A4" }

    // Nombre de hoja válido
    const sheetName = sanitizeSheetName(section.title, index + 1)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  })

  // Guardar archivo
  const fileName = generateFileName(config.title, "xlsx")
  XLSX.writeFile(wb, fileName, {
    bookType: "xlsx",
    cellStyles: true
  })
}

// ============================================================================
// GENERACIÓN DE CSV
// ============================================================================

export async function generateCSVReport(reportData: ReportData): Promise<void> {
  const { config, sections } = reportData

  // Si hay múltiples secciones, generar un CSV por sección
  if (sections.length === 1) {
    const csvContent = generateCSVContent(sections[0])
    downloadCSV(csvContent, generateFileName(config.title, "csv"))
  } else {
    // Generar múltiples archivos CSV (uno por sección)
    sections.forEach((section) => {
      const csvContent = generateCSVContent(section)
      const fileName = generateFileName(`${config.title}_${section.title}`, "csv")
      downloadCSV(csvContent, fileName)
    })
  }
}

function generateCSVContent(section: ReportSection): string {
  // Encabezados
  const headers = section.columns.map(col => `"${col.header}"`).join(",")

  // Datos
  const rows = section.data.map(row => {
    return section.columns
      .map(col => {
        const value = row[col.key]
        let formattedValue: string

        if (col.format) {
          formattedValue = col.format(value)
        } else if (value === null || value === undefined) {
          formattedValue = "N/A"
        } else {
          formattedValue = String(value)
        }

        // Escapar comillas dobles y envolver en comillas
        return `"${formattedValue.replace(/"/g, '""')}"`
      })
      .join(",")
  })

  // Resumen (si existe)
  let summaryRows = ""
  if (section.summary && Object.keys(section.summary).length > 0) {
    summaryRows = "\n\n\"RESUMEN\",\"\"\n"
    summaryRows += Object.entries(section.summary)
      .map(([key, value]) => `"${key}","${value}"`)
      .join("\n")
  }

  return headers + "\n" + rows.join("\n") + summaryRows
}

function downloadCSV(content: string, fileName: string): void {
  // Agregar BOM para que Excel detecte UTF-8 correctamente
  const BOM = "\uFEFF"
  const blob = new Blob([BOM + content], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", fileName)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// ============================================================================
// UTILIDADES
// ============================================================================

function generateFileName(title: string, extension: string): string {
  const timestamp = format(new Date(), "yyyyMMdd_HHmmss")
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
  return `${cleanTitle}_${timestamp}.${extension}`
}

function sanitizeSheetName(name: string, index: number): string {
  // Caracteres no permitidos en nombres de hojas de Excel: \ / * ? : [ ]
  let sanitized = name.replace(/[\\\/\*\?\:\[\]]/g, "_")

  // Limitar a 31 caracteres
  if (sanitized.length > 31) {
    sanitized = sanitized.substring(0, 27) + `_${index}`
  }

  return sanitized || `Hoja ${index}`
}

// ============================================================================
// FUNCIÓN PRINCIPAL DE EXPORTACIÓN
// ============================================================================

export async function exportReport(reportData: ReportData, format: ReportFormat): Promise<void> {
  try {
    switch (format) {
      case "pdf":
        await generatePDFReport(reportData)
        break
      case "excel":
        await generateExcelReport(reportData)
        break
      case "csv":
        await generateCSVReport(reportData)
        break
      default:
        throw new Error(`Formato no soportado: ${format}`)
    }
  } catch (error) {
    console.error("Error al generar reporte:", error)
    throw error
  }
}
