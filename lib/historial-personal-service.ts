import { supabase } from "./supabase"
import type {
  HistorialPersonal,
  MovimientoPersonal,
  PersonalActivoEnFecha,
  EstadisticasMovimientos,
  Operario,
  Auxiliar
} from "./types"

// ==================== REGISTRAR MOVIMIENTOS ====================

/**
 * Registra un movimiento en el historial
 */
export async function registrarMovimiento(datos: {
  personal_id: string
  tipo_personal: "operario" | "auxiliar"
  nombre: string
  cedula: string
  tipo_movimiento: "ingreso" | "baja" | "reingreso" | "actualizacion"
  fecha_movimiento: string
  motivo?: string
  observaciones?: string
  estado_activo: boolean
  es_conductor?: boolean
  licencia_conduccion?: string
  categoria_licencia?: string
  licencia_vencimiento?: string
}): Promise<HistorialPersonal> {
  const { data, error } = await supabase
    .from("historial_personal")
    .insert([datos])
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Registra un ingreso de operario
 */
export async function registrarIngresoOperario(operario: Operario): Promise<void> {
  await registrarMovimiento({
    personal_id: operario.id,
    tipo_personal: "operario",
    nombre: operario.nombre,
    cedula: operario.cedula,
    tipo_movimiento: "ingreso",
    fecha_movimiento: operario.fecha_ingreso || new Date().toISOString().split("T")[0],
    estado_activo: true,
    es_conductor: operario.es_conductor || false,
    licencia_conduccion: operario.licencia_conduccion || undefined,
    categoria_licencia: operario.categoria_licencia || undefined,
    licencia_vencimiento: operario.licencia_vencimiento || undefined,
  })
}

/**
 * Registra un ingreso de auxiliar
 */
export async function registrarIngresoAuxiliar(auxiliar: Auxiliar): Promise<void> {
  await registrarMovimiento({
    personal_id: auxiliar.id,
    tipo_personal: "auxiliar",
    nombre: auxiliar.nombre,
    cedula: auxiliar.cedula,
    tipo_movimiento: "ingreso",
    fecha_movimiento: auxiliar.fecha_ingreso || new Date().toISOString().split("T")[0],
    estado_activo: true,
  })
}

/**
 * Registra una baja de operario
 */
export async function registrarBajaOperario(operario: Operario, motivo: string): Promise<void> {
  await registrarMovimiento({
    personal_id: operario.id,
    tipo_personal: "operario",
    nombre: operario.nombre,
    cedula: operario.cedula,
    tipo_movimiento: "baja",
    fecha_movimiento: operario.fecha_retiro || new Date().toISOString().split("T")[0],
    motivo,
    estado_activo: false,
    es_conductor: operario.es_conductor || false,
    licencia_conduccion: operario.licencia_conduccion || undefined,
    categoria_licencia: operario.categoria_licencia || undefined,
    licencia_vencimiento: operario.licencia_vencimiento || undefined,
  })
}

/**
 * Registra una baja de auxiliar
 */
export async function registrarBajaAuxiliar(auxiliar: Auxiliar, motivo: string): Promise<void> {
  await registrarMovimiento({
    personal_id: auxiliar.id,
    tipo_personal: "auxiliar",
    nombre: auxiliar.nombre,
    cedula: auxiliar.cedula,
    tipo_movimiento: "baja",
    fecha_movimiento: auxiliar.fecha_retiro || new Date().toISOString().split("T")[0],
    motivo,
    estado_activo: false,
  })
}

/**
 * Registra un reingreso de operario
 */
export async function registrarReingresoOperario(operario: Operario): Promise<void> {
  await registrarMovimiento({
    personal_id: operario.id,
    tipo_personal: "operario",
    nombre: operario.nombre,
    cedula: operario.cedula,
    tipo_movimiento: "reingreso",
    fecha_movimiento: new Date().toISOString().split("T")[0],
    observaciones: "Reingreso después de baja",
    estado_activo: true,
    es_conductor: operario.es_conductor || false,
    licencia_conduccion: operario.licencia_conduccion || undefined,
    categoria_licencia: operario.categoria_licencia || undefined,
    licencia_vencimiento: operario.licencia_vencimiento || undefined,
  })
}

/**
 * Registra un reingreso de auxiliar
 */
export async function registrarReingresoAuxiliar(auxiliar: Auxiliar): Promise<void> {
  await registrarMovimiento({
    personal_id: auxiliar.id,
    tipo_personal: "auxiliar",
    nombre: auxiliar.nombre,
    cedula: auxiliar.cedula,
    tipo_movimiento: "reingreso",
    fecha_movimiento: new Date().toISOString().split("T")[0],
    observaciones: "Reingreso después de baja",
    estado_activo: true,
  })
}

// ==================== CONSULTAS DE HISTORIAL ====================

/**
 * Obtiene todo el historial de un personal específico
 */
export async function getHistorialPersonal(personalId: string): Promise<HistorialPersonal[]> {
  const { data, error } = await supabase
    .from("historial_personal")
    .select("*")
    .eq("personal_id", personalId)
    .order("fecha_movimiento", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

/**
 * Obtiene movimientos por rango de fechas
 */
export async function getMovimientosPorFechas(
  desde: string,
  hasta: string,
  tipoPersonal?: "operario" | "auxiliar"
): Promise<MovimientoPersonal[]> {
  let query = supabase
    .from("historial_personal")
    .select("id, nombre, cedula, tipo_personal, tipo_movimiento, fecha_movimiento, motivo, estado_activo")
    .gte("fecha_movimiento", desde)
    .lte("fecha_movimiento", hasta)
    .order("fecha_movimiento", { ascending: false })

  if (tipoPersonal) {
    query = query.eq("tipo_personal", tipoPersonal)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

/**
 * Obtiene el personal que estaba activo en una fecha específica
 */
export async function getPersonalActivoEnFecha(fecha: string): Promise<PersonalActivoEnFecha[]> {
  const { data, error } = await supabase
    .rpc("get_personal_activo_en_fecha", { fecha_consulta: fecha })

  if (error) throw error
  return data || []
}

/**
 * Obtiene estadísticas de movimientos por mes
 */
export async function getEstadisticasMovimientos(): Promise<EstadisticasMovimientos[]> {
  const { data, error } = await supabase
    .from("estadisticas_movimientos_personal")
    .select("*")
    .order("mes", { ascending: false })
    .limit(12) // Últimos 12 meses

  if (error) throw error
  return data || []
}

/**
 * Obtiene movimientos recientes (últimos 30 días)
 */
export async function getMovimientosRecientes(): Promise<MovimientoPersonal[]> {
  const hace30Dias = new Date()
  hace30Dias.setDate(hace30Dias.getDate() - 30)
  const fecha30Dias = hace30Dias.toISOString().split("T")[0]
  const hoy = new Date().toISOString().split("T")[0]

  return getMovimientosPorFechas(fecha30Dias, hoy)
}

/**
 * Obtiene conteo de personal activo en una fecha
 */
export async function getConteoPersonalActivoEnFecha(fecha: string): Promise<{
  operarios: number
  auxiliares: number
  total: number
}> {
  const personal = await getPersonalActivoEnFecha(fecha)

  const operarios = personal.filter(p => p.tipo_personal === "operario").length
  const auxiliares = personal.filter(p => p.tipo_personal === "auxiliar").length

  return {
    operarios,
    auxiliares,
    total: operarios + auxiliares
  }
}

/**
 * Verifica si un personal tiene movimientos previos
 */
export async function tieneMovimientosPrevios(personalId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("historial_personal")
    .select("id")
    .eq("personal_id", personalId)
    .limit(1)

  if (error) throw error
  return (data?.length || 0) > 0
}

/**
 * Obtiene el último movimiento de un personal
 */
export async function getUltimoMovimiento(personalId: string): Promise<HistorialPersonal | null> {
  const { data, error } = await supabase
    .from("historial_personal")
    .select("*")
    .eq("personal_id", personalId)
    .order("fecha_movimiento", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === "PGRST116") return null // No data found
    throw error
  }
  return data
}
