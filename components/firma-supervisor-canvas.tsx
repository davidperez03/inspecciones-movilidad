"use client"

import type React from "react"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Eraser } from "lucide-react"
import { useMobile } from "@/hooks/use-mobile"

type FirmaSupervisorCanvasProps = {
  onChange: (dataURL: string) => void
}

export function FirmaSupervisorCanvas({ onChange }: FirmaSupervisorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSigned, setHasSigned] = useState(false)
  const isMobile = useMobile()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Configurar el canvas
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.strokeStyle = "#000"

    // Limpiar el canvas
    ctx.fillStyle = "#fff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Dibujar línea base para la firma
    ctx.beginPath()
    ctx.moveTo(20, canvas.height - 20)
    ctx.lineTo(canvas.width - 20, canvas.height - 20)
    ctx.stroke()

    // Texto de instrucción
    ctx.font = "14px Arial"
    ctx.fillStyle = "#666"
    ctx.fillText("Firma del Supervisor aquí", 20, canvas.height - 30)
  }, [])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    setIsDrawing(true)
    setHasSigned(true)

    // Obtener coordenadas
    let x, y
    if ("touches" in e) {
      // Evento táctil
      const rect = canvas.getBoundingClientRect()
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top
    } else {
      // Evento de mouse
      x = e.nativeEvent.offsetX
      y = e.nativeEvent.offsetY
    }

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Obtener coordenadas
    let x, y
    if ("touches" in e) {
      // Evento táctil
      const rect = canvas.getBoundingClientRect()
      x = e.touches[0].clientX - rect.left
      y = e.touches[0].clientY - rect.top

      // Prevenir desplazamiento de la página en dispositivos táctiles
      e.preventDefault()
    } else {
      // Evento de mouse
      x = e.nativeEvent.offsetX
      y = e.nativeEvent.offsetY
    }

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const endDrawing = () => {
    setIsDrawing(false)

    const canvas = canvasRef.current
    if (!canvas) return

    // Guardar la firma como imagen
    const dataURL = canvas.toDataURL("image/png")
    onChange(dataURL)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Limpiar el canvas
    ctx.fillStyle = "#fff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Dibujar línea base para la firma
    ctx.beginPath()
    ctx.moveTo(20, canvas.height - 20)
    ctx.lineTo(canvas.width - 20, canvas.height - 20)
    ctx.stroke()

    // Texto de instrucción
    ctx.font = "14px Arial"
    ctx.fillStyle = "#666"
    ctx.fillText("Firma del Supervisor aquí", 20, canvas.height - 30)

    setHasSigned(false)
    onChange("")
  }

  return (
    <div className="space-y-3">
      <div className="border rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          className="w-full h-40 touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
        />
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={clearCanvas} disabled={!hasSigned}>
          <Eraser className="h-4 w-4 mr-2" />
          Borrar firma
        </Button>
      </div>

      {isMobile && (
        <p className="text-sm text-muted-foreground mt-2">
          Utilice su dedo o un lápiz táctil para firmar en el recuadro.
        </p>
      )}
    </div>
  )
}
