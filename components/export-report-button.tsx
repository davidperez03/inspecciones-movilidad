"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, FileText, FileSpreadsheet, FileType, Loader2 } from "lucide-react"
import { exportReport, type ReportData, type ReportFormat } from "@/lib/report-generator"
import { useToast } from "@/components/ui/use-toast"

interface ExportReportButtonProps {
  reportData: ReportData | (() => ReportData)
  variant?: "default" | "outline" | "ghost" | "secondary"
  size?: "default" | "sm" | "lg" | "icon"
  label?: string
  showIcon?: boolean
  disabled?: boolean
}

export function ExportReportButton({
  reportData,
  variant = "outline",
  size = "default",
  label = "Exportar",
  showIcon = true,
  disabled = false,
}: ExportReportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportingFormat, setExportingFormat] = useState<ReportFormat | null>(null)
  const { toast } = useToast()

  async function handleExport(format: ReportFormat) {
    setIsExporting(true)
    setExportingFormat(format)

    try {
      // Si reportData es una función, ejecutarla para obtener datos frescos
      const data = typeof reportData === "function" ? reportData() : reportData
      await exportReport(data, format)

      toast({
        title: "Exportación exitosa",
        description: `El reporte ha sido exportado a ${getFormatName(format)}`,
      })
    } catch (error) {
      console.error("Error al exportar:", error)
      toast({
        title: "Error al exportar",
        description: `No se pudo exportar el reporte a ${getFormatName(format)}`,
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
      setExportingFormat(null)
    }
  }

  function getFormatName(format: ReportFormat): string {
    const names = {
      pdf: "PDF",
      excel: "Excel",
      csv: "CSV",
    }
    return names[format]
  }

  function getFormatIcon(format: ReportFormat) {
    const icons = {
      pdf: FileText,
      excel: FileSpreadsheet,
      csv: FileType,
    }
    const Icon = icons[format]
    return <Icon className="h-4 w-4 mr-2" />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={disabled || isExporting}>
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              {showIcon && <Download className="h-4 w-4 mr-2" />}
              {label}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Exportar como</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleExport("pdf")}
          disabled={isExporting}
          className="cursor-pointer"
        >
          {exportingFormat === "pdf" ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            getFormatIcon("pdf")
          )}
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("excel")}
          disabled={isExporting}
          className="cursor-pointer"
        >
          {exportingFormat === "excel" ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            getFormatIcon("excel")
          )}
          Excel
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport("csv")}
          disabled={isExporting}
          className="cursor-pointer"
        >
          {exportingFormat === "csv" ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            getFormatIcon("csv")
          )}
          CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
