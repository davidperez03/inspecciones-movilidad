import { supabase } from "./supabase"
import type { Inspeccion, ItemInspeccion, FotoInspeccion } from "./types"
import { subirFirmaBase64 } from "./storage"

export async function saveInspeccion(
  inspeccionData: {
    // IDs de relaciones
    vehiculo_id: string
    operario_perfil_id: string
    auxiliar_perfil_id: string | null
    inspector_perfil_id: string | null
    // Datos básicos
    fecha: string
    hora: string
    // Snapshots de datos
    nombre_operario: string
    cedula_operario: string
    tiene_auxiliar: boolean
    nombre_auxiliar: string | null
    cedula_auxiliar: string | null
    placa_vehiculo: string
    marca_vehiculo: string | null
    modelo_vehiculo: string | null
    kilometraje: number | null
    nombre_inspector: string
    cargo_inspector: string
    documento_inspector: string
    // Observaciones
    observaciones_generales: string | null
    recomendaciones: string | null
    acciones_correctivas: string | null
    // Firmas (base64)
    firma_operario_data_url: string
    firma_supervisor_data_url: string
  },
  items: {
    item_id: string
    nombre: string
    categoria: 'documentacion' | 'exterior' | 'interior' | 'mecanico' | 'electrico' | 'seguridad' | 'herramientas'
    estado: 'bueno' | 'regular' | 'malo' | 'no_aplica'
    observacion: string | null
    es_critico: boolean
    orden: number
  }[],
  fotos: {
    url: string
    descripcion: string | null
    categoria?: 'general' | 'daño' | 'documentacion' | 'otro'
  }[],
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Usuario no autenticado")
  }

  // Subir firmas
  const firmaURL = await subirFirmaBase64(
    inspeccionData.firma_operario_data_url,
    `firma-operario-${user.id}-${Date.now()}.png`
  )
  const firmaSupervisorURL = await subirFirmaBase64(
    inspeccionData.firma_supervisor_data_url,
    `firma-supervisor-${user.id}-${Date.now()}.png`,
  )

  const formattedData = {
    vehiculo_id: inspeccionData.vehiculo_id,
    operario_perfil_id: inspeccionData.operario_perfil_id,
    auxiliar_perfil_id: inspeccionData.auxiliar_perfil_id,
    inspector_perfil_id: inspeccionData.inspector_perfil_id,
    fecha: inspeccionData.fecha,
    hora: inspeccionData.hora,
    // Snapshots
    nombre_operario: inspeccionData.nombre_operario,
    cedula_operario: inspeccionData.cedula_operario,
    tiene_auxiliar: inspeccionData.tiene_auxiliar,
    nombre_auxiliar: inspeccionData.nombre_auxiliar,
    cedula_auxiliar: inspeccionData.cedula_auxiliar,
    placa_vehiculo: inspeccionData.placa_vehiculo,
    marca_vehiculo: inspeccionData.marca_vehiculo,
    modelo_vehiculo: inspeccionData.modelo_vehiculo,
    kilometraje: inspeccionData.kilometraje,
    nombre_inspector: inspeccionData.nombre_inspector,
    cargo_inspector: inspeccionData.cargo_inspector,
    documento_inspector: inspeccionData.documento_inspector,
    // Observaciones
    observaciones_generales: inspeccionData.observaciones_generales,
    recomendaciones: inspeccionData.recomendaciones,
    acciones_correctivas: inspeccionData.acciones_correctivas,
    // Firmas
    firma_operario_data_url: firmaURL,
    firma_supervisor_data_url: firmaSupervisorURL,
    // Estado
    estado: 'completada' as const,
    // Metadata
    creado_por: user.id,
  }

  const { data: inspeccion, error: inspeccionError } = await supabase
    .from("inspecciones")
    .insert([formattedData])
    .select()
    .single()

  if (inspeccionError) {
    console.error("Error al insertar inspección:", inspeccionError.message, inspeccionError.details)
    throw inspeccionError
  }

  // Insertar items
  const itemsToInsert = items.map((item) => ({
    inspeccion_id: inspeccion.id,
    item_id: item.item_id,
    nombre: item.nombre,
    categoria: item.categoria,
    estado: item.estado,
    observacion: item.observacion || null,
    es_critico: item.es_critico,
    orden: item.orden,
  }))

  const { error: itemsError } = await supabase
    .from("items_inspeccion")
    .insert(itemsToInsert)

  if (itemsError) throw itemsError

  // Insertar fotos
  if (fotos.length > 0) {
    const fotosToInsert = fotos.map((foto) => ({
      inspeccion_id: inspeccion.id,
      url_foto: foto.url,
      descripcion: foto.descripcion || null,
      categoria: foto.categoria || 'general',
      subido_por: user.id,
    }))
    const { error: fotosError } = await supabase
      .from("fotos_inspeccion")
      .insert(fotosToInsert)
    if (fotosError) throw fotosError
  }

  return inspeccion
}

export async function getInspecciones(): Promise<Inspeccion[]> {
  const { data, error } = await supabase
    .from("inspecciones")
    .select("*")
    .order("creado_en", { ascending: false })

  if (error) throw error

  return data || []
}

export async function getInspeccion(id: string): Promise<Inspeccion & { items: ItemInspeccion[], fotos: FotoInspeccion[] }> {
  const { data: row, error: inspeccionError } = await supabase
    .from("inspecciones")
    .select("*")
    .eq("id", id)
    .single()

  if (inspeccionError) throw inspeccionError

  const { data: items, error: itemsError } = await supabase
    .from("items_inspeccion")
    .select("*")
    .eq("inspeccion_id", id)
    .order("orden")

  if (itemsError) throw itemsError

  const { data: fotos, error: fotosError } = await supabase
    .from("fotos_inspeccion")
    .select("*")
    .eq("inspeccion_id", id)

  if (fotosError) throw fotosError

  return {
    ...row,
    items: items || [],
    fotos: fotos || [],
  }
}

export async function deleteInspeccion(id: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error("Usuario no autenticado")
  }

  // La base de datos tiene CASCADE configurado, así que solo eliminamos la inspección
  // Los items y fotos se eliminarán automáticamente
  const { error: inspeccionError } = await supabase
    .from("inspecciones")
    .delete()
    .eq("id", id)

  if (inspeccionError) throw inspeccionError
}

// Funciones adicionales útiles

export async function getInspeccionesPorVehiculo(vehiculoId: string): Promise<Inspeccion[]> {
  const { data, error } = await supabase
    .from("inspecciones")
    .select("*")
    .eq("vehiculo_id", vehiculoId)
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getInspeccionesPorOperario(operarioPerfilId: string): Promise<Inspeccion[]> {
  const { data, error } = await supabase
    .from("inspecciones")
    .select("*")
    .eq("operario_perfil_id", operarioPerfilId)
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getInspeccionesPorFecha(fechaInicio: string, fechaFin: string): Promise<Inspeccion[]> {
  const { data, error } = await supabase
    .from("inspecciones")
    .select("*")
    .gte("fecha", fechaInicio)
    .lte("fecha", fechaFin)
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getInspeccionesNoAptas(): Promise<Inspeccion[]> {
  const { data, error } = await supabase
    .from("inspecciones")
    .select("*")
    .eq("es_apto", false)
    .order("fecha", { ascending: false })

  if (error) throw error
  return data || []
}

// Estadísticas

export async function getEstadisticasInspecciones(fechaInicio?: string, fechaFin?: string) {
  let query = supabase
    .from("inspecciones")
    .select("es_apto, puntaje_total")

  if (fechaInicio) {
    query = query.gte("fecha", fechaInicio)
  }
  if (fechaFin) {
    query = query.lte("fecha", fechaFin)
  }

  const { data, error } = await query

  if (error) throw error

  const total = data?.length || 0
  const aptos = data?.filter(i => i.es_apto).length || 0
  const noAptos = total - aptos
  const puntajePromedio = data?.reduce((acc, i) => acc + (i.puntaje_total || 0), 0) / total || 0

  return {
    total,
    aptos,
    noAptos,
    porcentaje_aptos: total > 0 ? (aptos / total) * 100 : 0,
    puntaje_promedio: puntajePromedio,
  }
}
