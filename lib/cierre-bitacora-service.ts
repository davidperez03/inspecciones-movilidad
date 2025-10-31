import { supabase } from "@/lib/supabase"
import type { BitacoraEvento, BitacoraCierre } from "@/lib/types"

/**
 * Calcula el resumen de horas para un cierre de bitácora
 * Suma las horas registradas en los eventos seleccionados
 */
export function calcularResumenCierre(eventos: BitacoraEvento[]): {
  horas_operacion: number
  horas_novedades: number
  horas_efectivas: number
  eventos_ids: string[]
  fecha_inicio: string
  fecha_fin: string
  hora_inicio: string
  hora_fin: string
} {
  if (eventos.length === 0) {
    throw new Error("No hay eventos para cerrar")
  }

  let horasOperacion = 0
  let horasNovedades = 0
  const eventosIds: string[] = []

  // Ordenar eventos por fecha y hora
  const eventosOrdenados = [...eventos].sort((a, b) => {
    const fechaA = `${a.fecha} ${a.hora_inicio}`
    const fechaB = `${b.fecha} ${b.hora_inicio}`
    return fechaA.localeCompare(fechaB)
  })

  // Obtener fecha/hora inicio y fin del período
  const primerEvento = eventosOrdenados[0]
  const ultimoEvento = eventosOrdenados[eventosOrdenados.length - 1]

  for (const evento of eventos) {
    if (!evento.horas_operacion) continue

    eventosIds.push(evento.id)

    // Clasificar horas según tipo de evento
    if (evento.tipo_evento === "mantenimiento" || evento.tipo_evento === "falla") {
      horasNovedades += evento.horas_operacion
    } else if (evento.tipo_evento === "operacion") {
      horasOperacion += evento.horas_operacion
    }
  }

  // Horas efectivas = horas de operación - horas de novedades (fallas y mantenimientos)
  const horasEfectivas = horasOperacion - horasNovedades

  return {
    horas_operacion: Number.parseFloat(horasOperacion.toFixed(2)),
    horas_novedades: Number.parseFloat(horasNovedades.toFixed(2)),
    horas_efectivas: Number.parseFloat(horasEfectivas.toFixed(2)),
    eventos_ids: eventosIds,
    fecha_inicio: primerEvento.fecha,
    fecha_fin: ultimoEvento.fecha,
    hora_inicio: primerEvento.hora_inicio,
    hora_fin: ultimoEvento.hora_fin || primerEvento.hora_inicio,
  }
}

/**
 * Obtiene eventos de un vehículo por IDs específicos
 */
export async function getEventosPorIds(eventosIds: string[]): Promise<BitacoraEvento[]> {
  const { data, error } = await supabase
    .from("bitacora_eventos")
    .select(`
      *,
      vehiculos(placa, marca, modelo),
      operario_perfil:operario_perfil_id(nombre_completo),
      auxiliar_perfil:auxiliar_perfil_id(nombre_completo)
    `)
    .in("id", eventosIds)
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true })

  if (error) {
    console.error("Error al obtener eventos:", error)
    throw error
  }

  return data as BitacoraEvento[]
}

/**
 * Crea un cierre de bitácora
 * El cierre agrupa eventos seleccionados (pueden ser de múltiples fechas/turnos)
 */
export async function createCierreBitacora(cierre: {
  vehiculo_id: string
  eventos_ids: string[]
  operario_perfil_id: string | null
  observaciones: string | null
  turno: "diurno" | "nocturno" | "mixto" | null
  user_id: string
}): Promise<BitacoraCierre> {
  if (cierre.eventos_ids.length === 0) {
    throw new Error("Debe seleccionar al menos un evento para cerrar la bitácora")
  }

  // 1. Obtener eventos seleccionados
  const eventos = await getEventosPorIds(cierre.eventos_ids)

  if (eventos.length === 0) {
    throw new Error("No se encontraron los eventos seleccionados")
  }

  // 2. Validar que todos sean del mismo vehículo
  const vehiculosDiferentes = eventos.some(e => e.vehiculo_id !== cierre.vehiculo_id)
  if (vehiculosDiferentes) {
    throw new Error("Todos los eventos deben ser del mismo vehículo")
  }

  // 3. Validar que ningún evento ya esté en otro cierre
  const { data: eventosEnOtrosCierres } = await supabase
    .from("bitacora_cierres")
    .select("eventos_ids")
    .overlaps("eventos_ids", cierre.eventos_ids)

  if (eventosEnOtrosCierres && eventosEnOtrosCierres.length > 0) {
    throw new Error("Algunos eventos ya están incluidos en otro cierre")
  }

  // 4. Calcular resumen
  const resumen = calcularResumenCierre(eventos)

  // 5. Cerrar automáticamente todos los eventos de operación que estén abiertos
  const eventosAbiertos = eventos.filter(e => !e.hora_fin && e.tipo_evento === "operacion")

  if (eventosAbiertos.length > 0) {
    const horaFinCierre = resumen.hora_fin

    for (const evento of eventosAbiertos) {
      await supabase
        .from("bitacora_eventos")
        .update({ hora_fin: horaFinCierre })
        .eq("id", evento.id)
    }
  }

  // 6. Crear el cierre
  const { data, error } = await supabase
    .from("bitacora_cierres")
    .insert({
      vehiculo_id: cierre.vehiculo_id,
      fecha_inicio: resumen.fecha_inicio,
      fecha_fin: resumen.fecha_fin,
      hora_inicio: resumen.hora_inicio,
      hora_fin: resumen.hora_fin,
      turno: cierre.turno,
      horas_operacion: resumen.horas_operacion,
      horas_novedades: resumen.horas_novedades,
      horas_efectivas: resumen.horas_efectivas,
      eventos_ids: resumen.eventos_ids,
      operario_perfil_id: cierre.operario_perfil_id,
      cerrado_por: cierre.user_id,
      observaciones: cierre.observaciones,
    })
    .select(`
      *,
      vehiculos(placa, marca, modelo),
      operario_perfil:operario_perfil_id(nombre_completo)
    `)
    .single()

  if (error) {
    console.error("Error al crear cierre de bitácora:", error)
    throw error
  }

  return data as BitacoraCierre
}

/**
 * Obtiene los cierres de bitácora con filtros opcionales
 */
export async function getCierresBitacora(filtros?: {
  vehiculo_id?: string
  fecha_desde?: string
  fecha_hasta?: string
  turno?: "diurno" | "nocturno" | "mixto"
}): Promise<BitacoraCierre[]> {
  let query = supabase
    .from("bitacora_cierres")
    .select(`
      *,
      vehiculos(placa, marca, modelo),
      operario_perfil:operario_perfil_id(nombre_completo)
    `)
    .order("fecha_inicio", { ascending: false })
    .order("hora_inicio", { ascending: false })

  if (filtros?.vehiculo_id) {
    query = query.eq("vehiculo_id", filtros.vehiculo_id)
  }

  if (filtros?.fecha_desde) {
    query = query.gte("fecha_inicio", filtros.fecha_desde)
  }

  if (filtros?.fecha_hasta) {
    query = query.lte("fecha_fin", filtros.fecha_hasta)
  }

  if (filtros?.turno) {
    query = query.eq("turno", filtros.turno)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error al obtener cierres de bitácora:", error)
    throw error
  }

  return data as BitacoraCierre[]
}

/**
 * Obtiene un cierre de bitácora por ID
 */
export async function getCierreBitacoraById(id: string): Promise<BitacoraCierre | null> {
  const { data, error } = await supabase
    .from("bitacora_cierres")
    .select(`
      *,
      vehiculos(placa, marca, modelo),
      operario_perfil:operario_perfil_id(nombre_completo)
    `)
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error al obtener cierre de bitácora:", error)
    return null
  }

  return data as BitacoraCierre
}

/**
 * Actualiza un cierre de bitácora existente
 */
export async function updateCierreBitacora(
  id: string,
  cambios: {
    operario_perfil_id?: string | null
    observaciones?: string | null
  }
): Promise<BitacoraCierre> {
  const { data, error } = await supabase
    .from("bitacora_cierres")
    .update(cambios)
    .eq("id", id)
    .select(`
      *,
      vehiculos(placa, marca, modelo),
      operario_perfil:operario_perfil_id(nombre_completo)
    `)
    .single()

  if (error) {
    console.error("Error al actualizar cierre de bitácora:", error)
    throw error
  }

  return data as BitacoraCierre
}

/**
 * Elimina un cierre de bitácora
 */
export async function deleteCierreBitacora(id: string): Promise<void> {
  const { error } = await supabase
    .from("bitacora_cierres")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error al eliminar cierre de bitácora:", error)
    throw error
  }
}

/**
 * Verifica si un evento ya está incluido en algún cierre
 */
export async function eventoEstaCerrado(eventoId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("bitacora_cierres")
    .select("id")
    .contains("eventos_ids", [eventoId])
    .limit(1)

  return !!data && data.length > 0 && !error
}
