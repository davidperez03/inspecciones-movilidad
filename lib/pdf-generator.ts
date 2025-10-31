"use client"

import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

// Función para capitalizar nombres (primera letra de cada palabra en mayúscula)
function capitalizarNombre(nombre: string): string {
  return nombre
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ")
}

type InspeccionData = {
  nombreoperario: string
  cedulaoperario: string
  nombreauxiliar: string
  cedulaauxiliar: string
  tieneauxiliar: boolean
  placavehiculo: string
  fecha: string
  hora: string
  nombreinspector: string
  cargoinspector: string
  documentoinspector: string
  nombreOperarioRecibe: string
  cedulaOperarioRecibe: string
  hayOperarioRecibe: boolean
  items: {
    id: string
    nombre: string
    estado: string
    observacion: string
  }[]
  firmadataurl: string
  firmasupervisordataurl: string
  esapto: boolean
  tipoInspeccion: string
  // Añadida la propiedad fotos al tipo InspeccionData
  fotos: {
    url: string
    descripcion: string
  }[]
  // IDs opcionales para validación automática de documentos
  vehiculo_id?: string | null
  operario_id?: string | null
  auxiliar_id?: string | null
}

// Función para generar ítems de documentación automáticamente
async function generarItemsDocumentacion(
  vehiculoId?: string | null,
  operarioId?: string | null,
  fechaInspeccion?: string
): Promise<Array<{ id: string; nombre: string; estado: string; observacion: string }>> {
  const itemsDoc: Array<{ id: string; nombre: string; estado: string; observacion: string }> = []

  if (!vehiculoId && !operarioId) {
    // Si no hay IDs, retornar ítems con estado N/A
    return [
      { id: "01-01", nombre: "Licencia de Tránsito vigente", estado: "na", observacion: "No verificado" },
      { id: "01-02", nombre: "SOAT vigente", estado: "na", observacion: "No verificado" },
      { id: "01-03", nombre: "Revisión Técnico-Mecánica vigente", estado: "na", observacion: "No verificado" },
      { id: "01-04", nombre: "Licencia de Conducción válida del operario", estado: "na", observacion: "No verificado" },
    ]
  }

  const fechaRef = fechaInspeccion ? new Date(fechaInspeccion) : new Date()

  try {
    // Importar supabase dinámicamente para evitar problemas de dependencias
    const { supabase } = await import("./supabase")

    // Validar documentos del vehículo
    if (vehiculoId) {
      const { data: vehiculo } = await supabase
        .from("vehiculos")
        .select("soat_vencimiento, tecnomecanica_vencimiento")
        .eq("id", vehiculoId)
        .single()

      // Licencia de Tránsito (siempre OK si el vehículo existe)
      itemsDoc.push({
        id: "01-01",
        nombre: "Licencia de Tránsito vigente",
        estado: "ok",
        observacion: ""
      })

      // SOAT
      if (vehiculo?.soat_vencimiento) {
        const fechaVenc = new Date(vehiculo.soat_vencimiento)
        const estado = fechaVenc >= fechaRef ? "ok" : "malo"
        const observacion = estado === "malo" ? `Vencido desde ${vehiculo.soat_vencimiento}` : `Vigente hasta ${vehiculo.soat_vencimiento}`
        itemsDoc.push({
          id: "01-02",
          nombre: "SOAT vigente",
          estado,
          observacion
        })
      } else {
        itemsDoc.push({
          id: "01-02",
          nombre: "SOAT vigente",
          estado: "malo",
          observacion: "Sin fecha de vencimiento registrada"
        })
      }

      // Técnico-Mecánica
      if (vehiculo?.tecnomecanica_vencimiento) {
        const fechaVenc = new Date(vehiculo.tecnomecanica_vencimiento)
        const estado = fechaVenc >= fechaRef ? "ok" : "malo"
        const observacion = estado === "malo" ? `Vencida desde ${vehiculo.tecnomecanica_vencimiento}` : `Vigente hasta ${vehiculo.tecnomecanica_vencimiento}`
        itemsDoc.push({
          id: "01-03",
          nombre: "Revisión Técnico-Mecánica vigente",
          estado,
          observacion
        })
      } else {
        itemsDoc.push({
          id: "01-03",
          nombre: "Revisión Técnico-Mecánica vigente",
          estado: "malo",
          observacion: "Sin fecha de vencimiento registrada"
        })
      }
    }

    // Validar licencia del operario
    if (operarioId) {
      const { data: operario } = await supabase
        .from("operarios")
        .select("licencia_vencimiento, categoria_licencia")
        .eq("id", operarioId)
        .single()

      if (operario?.licencia_vencimiento) {
        const fechaVenc = new Date(operario.licencia_vencimiento)
        const estado = fechaVenc >= fechaRef ? "ok" : "malo"
        const categoriaTexto = operario.categoria_licencia ? ` (Categoría ${operario.categoria_licencia})` : ""
        const observacion = estado === "malo"
          ? `Vencida desde ${operario.licencia_vencimiento}${categoriaTexto}`
          : `Vigente hasta ${operario.licencia_vencimiento}${categoriaTexto}`
        itemsDoc.push({
          id: "01-04",
          nombre: "Licencia de Conducción válida del operario",
          estado,
          observacion
        })
      } else {
        itemsDoc.push({
          id: "01-04",
          nombre: "Licencia de Conducción válida del operario",
          estado: "malo",
          observacion: "Sin fecha de vencimiento registrada"
        })
      }
    }

  } catch (error) {
    console.error("Error al validar documentación:", error)
    // En caso de error, retornar ítems con estado N/A
    return [
      { id: "01-01", nombre: "Licencia de Tránsito vigente", estado: "na", observacion: "Error al verificar" },
      { id: "01-02", nombre: "SOAT vigente", estado: "na", observacion: "Error al verificar" },
      { id: "01-03", nombre: "Revisión Técnico-Mecánica vigente", estado: "na", observacion: "Error al verificar" },
      { id: "01-04", nombre: "Licencia de Conducción válida del operario", estado: "na", observacion: "Error al verificar" },
    ]
  }

  return itemsDoc
}

// Reemplazar la función getBase64FromUrl con una versión mejorada que maneje mejor las URLs de Supabase

async function getBase64FromUrl(url: string): Promise<string> {
  try {
    // Si la URL ya es un data URL, devolverla directamente
    if (url.startsWith("data:")) {
      return url
    }

    // Verificar si la URL es válida
    if (!url || typeof url !== "string") {
      console.error("URL inválida:", url)
      throw new Error("URL inválida")
    }

    console.log("Obteniendo imagen desde URL:", url)

    // Usar fetch para obtener la imagen como blob
    const response = await fetch(url, {
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Cache-Control": "no-cache",
      },
    })

    if (!response.ok) {
      throw new Error(`Error al obtener la imagen: ${response.status}`)
    }

    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error("Error al convertir URL a base64:", error)
    // Devolver una imagen en blanco como fallback
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
  }
}

export async function generatePDF(data: InspeccionData) {
  try {
    console.log("Generando PDF con datos:", {
      placavehiculo: data.placavehiculo,
      fecha: data.fecha,
      firmadataurl: data.firmadataurl ? "URL presente" : "URL ausente",
      firmasupervisordataurl: data.firmasupervisordataurl ? "URL presente" : "URL ausente",
      // Añadir log para fotos
      numFotos: data.fotos?.length || 0,
    })

    const doc = new jsPDF()

    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text(`FORMATO DE INSPECCIÓN DE GRÚA PLATAFORMA`, 105, 20, { align: "center" })
    doc.setFont("helvetica", "normal")
    doc.setFontSize(12)
    doc.text("NORMATIVA COLOMBIANA", 105, 28, { align: "center" })
    doc.setLineWidth(0.5)
    doc.line(20, 32, 190, 32)

    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("Información General:", 20, 40)
    doc.setFont("helvetica", "normal")

    const infoBasicaBody = [
      ["Fecha", formatDate(data.fecha)],
      ["Hora", data.hora],
      ["Placa del Vehículo", data.placavehiculo.toUpperCase()],
      ["Nombre del Operario", capitalizarNombre(data.nombreoperario)],
      ["Cédula del Operario", data.cedulaoperario],
    ]

    if (data.tieneauxiliar) {
      infoBasicaBody.push(
        ["Nombre del Auxiliar", capitalizarNombre(data.nombreauxiliar)],
        ["Cédula del Auxiliar", data.cedulaauxiliar]
      )
    } else {
      infoBasicaBody.push(["Auxiliar", "No aplica"])
    }

    infoBasicaBody.push(
      ["Inspector", capitalizarNombre(data.nombreinspector)],
      ["Cargo del Inspector", capitalizarNombre(data.cargoinspector)],
      ["Documento del Inspector", data.documentoinspector],
    )

    // Agregar información del operario que recibe, si existe
    if (data.hayOperarioRecibe) {
      infoBasicaBody.push(
        ["Nombre del Operario que Recibe", capitalizarNombre(data.nombreOperarioRecibe)],
        ["Cédula del Operario que Recibe", data.cedulaOperarioRecibe]
      )
    }

    autoTable(doc, {
      startY: 45,
      head: [["Dato", "Valor"]],
      body: infoBasicaBody,
      theme: "grid",
      headStyles: { fillColor: [70, 70, 70] },
      margin: { left: 20, right: 20 },
      styles: { fontSize: 9 },
    })

    // Generar ítems de documentación automáticamente SOLO si se proporcionan IDs
    // Esto evita agregar ítems a inspecciones antiguas que no tienen IDs guardados
    let todosLosItems = data.items

    if (data.vehiculo_id || data.operario_id) {
      const itemsDocumentacion = await generarItemsDocumentacion(
        data.vehiculo_id,
        data.operario_id,
        data.fecha
      )
      // Combinar ítems de documentación con ítems del formulario
      todosLosItems = [...itemsDocumentacion, ...data.items]
    }

    const itemsByCategory: Record<string, any[]> = {}
    todosLosItems.forEach((item) => {
      const categoryId = item.id.substring(0, 2)
      if (!itemsByCategory[categoryId]) {
        itemsByCategory[categoryId] = []
      }
      itemsByCategory[categoryId].push(item)
    })

    const categoryNames: Record<string, string> = {
      "01": "Documentación y Administración",
      "02": "Sistema Mecánico del Vehículo",
      "03": "Sistema Eléctrico y Óptico",
      "04": "Elementos de Seguridad",
      "05": "Cabina y Estructura",
      "06": "Operatividad de la Grúa",
    }

    let currentY = (doc as any).lastAutoTable.finalY + 10
    doc.setFont("helvetica", "bold")
    doc.text("Ítems de Inspección:", 20, currentY)
    doc.setFont("helvetica", "normal")
    currentY += 5

    // Ordenar categorías e ítems para consistencia
    Object.entries(itemsByCategory)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([categoryId, categoryItems]) => {
      // Ordenar ítems dentro de cada categoría por ID
      const sortedItems = categoryItems.sort((a, b) => a.id.localeCompare(b.id))
      if (currentY > 250) {
        doc.addPage()
        currentY = 20
      }

      doc.setFont("helvetica", "bold")
      doc.text(categoryNames[categoryId] || `Categoría ${categoryId}`, 20, currentY)
      doc.setFont("helvetica", "normal")
      currentY += 5

      const tableBody = sortedItems.map((item) => {
        let estadoTexto = "N/A"
        if (item.estado === "ok") estadoTexto = "OK"
        else if (item.estado === "regular") estadoTexto = "REGULAR"
        else if (item.estado === "malo") estadoTexto = "MALO"
        else if (item.estado === "na") estadoTexto = "N/A"
        return [item.nombre, estadoTexto, item.observacion || ""]
      })

      autoTable(doc, {
        startY: currentY,
        head: [["Ítem", "Estado", "Observación"]],
        body: tableBody,
        theme: "grid",
        headStyles: { fillColor: [100, 100, 100] },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 25, halign: "center" },
          2: { cellWidth: "auto" },
        },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 8 },
        bodyStyles: { minCellHeight: 10 },
      })

      currentY = (doc as any).lastAutoTable.finalY + 10
    })

    if (currentY > 220) {
      doc.addPage()
      currentY = 20
    }

    doc.setFont("helvetica", "bold")
    doc.text("Resultado de la Inspección:", 20, currentY)
    doc.setFont("helvetica", "normal")
    currentY += 10

    doc.setDrawColor(0)
    doc.setFillColor(data.esapto ? 230 : 255, data.esapto ? 255 : 230, data.esapto ? 230 : 230)
    doc.roundedRect(20, currentY, 170, 15, 3, 3, "FD")
    doc.setFont("helvetica", "bold")
    doc.setTextColor(data.esapto ? 0 : 255, 0, 0)
    doc.text(data.esapto ? "VEHÍCULO APTO PARA OPERAR" : "VEHÍCULO NO APTO PARA OPERAR", 105, currentY + 10, {
      align: "center",
    })
    doc.setTextColor(0, 0, 0)
    doc.setFont("helvetica", "normal")
    currentY += 25

    const firmaX1 = 60
    const firmaX2 = 150

    doc.setFont("helvetica", "bold")
    doc.text("Firma del Operario:", firmaX1, currentY, { align: "center" })
    doc.text("Firma del Supervisor:", firmaX2, currentY, { align: "center" })
    doc.setFont("helvetica", "normal")
    currentY += 5

    // Convertir imágenes de firma a base64 y agregarlas
    try {
      if (data.firmadataurl) {
        console.log("Procesando firma del operario")
        const firmaBase64 = await getBase64FromUrl(data.firmadataurl)
        doc.addImage(firmaBase64, "PNG", firmaX1 - 30, currentY, 60, 30)
      }
    } catch (error) {
      console.error("Error al procesar firma del operario:", error)
    }

    try {
      if (data.firmasupervisordataurl) {
        console.log("Procesando firma del supervisor")
        const firmaSupBase64 = await getBase64FromUrl(data.firmasupervisordataurl)
        doc.addImage(firmaSupBase64, "PNG", firmaX2 - 30, currentY, 60, 30)
      }
    } catch (error) {
      console.error("Error al procesar firma del supervisor:", error)
    }

    currentY += 35

    doc.setLineWidth(0.5)
    doc.line(firmaX1 - 30, currentY, firmaX1 + 30, currentY)
    doc.line(firmaX2 - 30, currentY, firmaX2 + 30, currentY)

    doc.setFontSize(8)
    doc.text(capitalizarNombre(data.nombreoperario), firmaX1, currentY + 5, { align: "center" })
    doc.text("Operario", firmaX1, currentY + 10, { align: "center" })
    doc.text(capitalizarNombre(data.nombreinspector), firmaX2, currentY + 5, { align: "center" })
    doc.text("Supervisor", firmaX2, currentY + 10, { align: "center" })

    currentY += 20
    doc.setFontSize(8)
    doc.text(`Fecha: ${formatDate(data.fecha)} - Hora: ${data.hora}`, 20, currentY)

    // Verificar si hay fotos para mostrar
    if (data.fotos && data.fotos.length > 0) {
      doc.addPage()
      let currentY = 20

      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.text("FOTOS DE LA INSPECCIÓN", 105, currentY, { align: "center" })
      currentY += 10

      // Procesar cada foto
      for (const foto of data.fotos) {
        try {
          if (!foto.url) {
            console.warn("URL de foto vacía, saltando...")
            continue
          }

          console.log("Procesando foto:", foto.url)
          const base64Img = await getBase64FromUrl(foto.url)

          // Crear objeto de imagen para calcular proporciones
          const img = new Image()
          img.src = base64Img
          await new Promise((resolve) => {
            img.onload = resolve
            // Asegurarse de que la promesa se resolverá incluso si la imagen falla
            img.onerror = () => {
              console.error("Error al cargar imagen para dimensiones")
              resolve(null)
            }
            // En caso de que la imagen ya esté cargada
            if (img.complete) resolve(null)
          })

          const maxWidth = 150
          const maxHeight = 80
          // Usar dimensiones predeterminadas si no se pueden obtener las reales
          const imgWidth = img.width ? Math.min(maxWidth, img.width) : maxWidth
          const imgHeight = img.height ? Math.min(maxHeight, img.height) : 80
          // Mantener proporción
          const ratio = Math.min(maxWidth / (img.width || maxWidth), maxHeight / (img.height || maxHeight))
          const finalWidth = (img.width || maxWidth) * ratio
          const finalHeight = (img.height || maxHeight) * ratio
          const x = (210 - finalWidth) / 2  // centrar en la página

          if (currentY + finalHeight + 25 > 280) {
            doc.addPage()
            currentY = 20
          }

          // Opcional: borde suave alrededor
          doc.setDrawColor(200)
          doc.rect(x - 2, currentY - 2, finalWidth + 4, finalHeight + 4)

          doc.addImage(base64Img, "JPEG", x, currentY, finalWidth, finalHeight)
          currentY += finalHeight + 5

          if (foto.descripcion) {
            doc.setFontSize(9)
            doc.setTextColor(80)
            // Capitalizar también la descripción de la foto
            doc.text(capitalizarNombre(foto.descripcion), 105, currentY + 5, { align: "center" })
            currentY += 15
          }

          // Línea divisoria entre imágenes
          doc.setDrawColor(220)
          doc.line(20, currentY, 190, currentY)
          currentY += 10

        } catch (error) {
          console.error("Error cargando foto de inspección:", foto.url, error)
        }
      }
    }

    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: "center" })
      doc.text("Inspección de Grúas Plataforma", 105, 285, { align: "center" })
    }

    doc.save(`Inspeccion_Grua_${data.placavehiculo}_${data.fecha}.pdf`)
    return doc // Opcionalmente devolver el documento para pruebas o uso adicional
  } catch (error) {
    console.error("Error general al generar PDF:", error)
    throw error
  }
}

function formatDate(dateString: string): string {
  try {
    // Si la fecha ya viene en formato DD/MM/YYYY, devolverla directamente
    if (dateString.includes("/")) {
      return dateString
    }

    // Importante: Añadir T00:00:00Z para evitar problemas con zonas horarias
    const date = new Date(dateString + "T00:00:00Z")
    return `${date.getUTCDate().toString().padStart(2, "0")}/${(date.getUTCMonth() + 1)
      .toString()
      .padStart(2, "0")}/${date.getUTCFullYear()}`
  } catch (error) {
    console.error("Error al formatear fecha:", error)
    return dateString // Devolver la fecha original si hay error
  }
}
