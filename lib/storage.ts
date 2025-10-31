import { supabase } from "./supabase"

export async function subirFirmaBase64(base64: string, filename: string): Promise<string> {
  try {
    const [prefix, base64Data] = base64.split(",")
    const contentType = prefix?.match(/data:(.*);base64/)?.[1] || "image/png"
    const buffer = Buffer.from(base64Data, "base64")
    const path = `firmas/${filename}`

    const { error } = await supabase.storage.from("firmas").upload(path, buffer, {
      contentType,
      upsert: true,
    })

    if (error) {
      console.error("Error al subir firma:", error.message)
      throw error
    }

    // Obtener la URL pública
    const { data: publicUrlData } = supabase.storage.from("firmas").getPublicUrl(path)

    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error("No se pudo obtener la URL pública de la firma")
    }

    return publicUrlData.publicUrl
  } catch (error) {
    console.error("Error en subirFirmaBase64:", error)
    throw error
  }
}
