"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Camera, X, Upload } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import Image from "next/image"

type FotoUploadProps = {
  inspeccionId?: string
  onFotosChange: (fotos: { url: string; descripcion: string }[]) => void
}

export function FotoUpload({ inspeccionId, onFotosChange }: FotoUploadProps) {
  const [fotos, setFotos] = useState<{ url: string; descripcion: string }[]>([])
  const [descripcion, setDescripcion] = useState("")
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const file = e.target.files[0]
    setUploading(true)

    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
      const filePath = `${inspeccionId || "temp"}/${fileName}`

      // Subir la imagen
      const { error: uploadError } = await supabase.storage
        .from("inspecciones")
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Obtener la URL pública
      const { data: publicUrlData } = supabase.storage
        .from("inspecciones")
        .getPublicUrl(filePath)

      const publicUrl = publicUrlData?.publicUrl
      if (!publicUrl) throw new Error("No se pudo obtener la URL pública")

      // Añadir a lista
      const newFoto = { url: publicUrl, descripcion }
      const updatedFotos = [...fotos, newFoto]
      setFotos(updatedFotos)
      onFotosChange(updatedFotos)
      setDescripcion("")

      toast({
        title: "Foto subida correctamente",
        description: "La foto ha sido agregada a la inspección",
      })
    } catch (error: any) {
      toast({
        title: "Error al subir la foto",
        description: error.message || "Ha ocurrido un error",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const handleRemoveFoto = (index: number) => {
    const updatedFotos = fotos.filter((_, i) => i !== index)
    setFotos(updatedFotos)
    onFotosChange(updatedFotos)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2">
        <Label htmlFor="descripcion">Descripción de la foto</Label>
        <Input
          id="descripcion"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Ej: Daño en la llanta delantera derecha"
        />
      </div>

      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          type="button"
          className="flex items-center gap-2"
          disabled={uploading}
          onClick={() => document.getElementById("foto-input")?.click()}
        >
          {uploading ? "Subiendo..." : "Tomar foto"}
          <Camera className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          type="button"
          className="flex items-center gap-2"
          disabled={uploading}
          onClick={() => document.getElementById("foto-upload")?.click()}
        >
          {uploading ? "Subiendo..." : "Subir foto"}
          <Upload className="h-4 w-4" />
        </Button>

        <input
          id="foto-input"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          id="foto-upload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {fotos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          {fotos.map((foto, index) => (
            <Card key={index} className="overflow-hidden">
              <div className="relative h-40">
                <Image
                  src={foto.url}
                  alt={foto.descripcion || `Foto ${index + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => handleRemoveFoto(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardContent className="p-2">
                <p className="text-xs truncate">{foto.descripcion || `Foto ${index + 1}`}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
