import { supabase } from "./supabase"
import type { Vehiculo, AlertaVencimientoVehiculo } from "./types"

// Obtener todos los vehículos
export async function getVehiculos(): Promise<Vehiculo[]> {
  const { data, error } = await supabase
    .from("vehiculos")
    .select("*")
    .order("placa")

  if (error) throw error
  return data || []
}

// Obtener solo vehículos activos
export async function getVehiculosActivos(): Promise<Vehiculo[]> {
  const { data, error } = await supabase
    .from("vehiculos")
    .select("*")
    .eq("activo", true)
    .order("placa")

  if (error) throw error
  return data || []
}

// Obtener un vehículo por ID
export async function getVehiculoById(id: string): Promise<Vehiculo | null> {
  const { data, error } = await supabase
    .from("vehiculos")
    .select("*")
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

// Crear un nuevo vehículo
export async function createVehiculo(vehiculo: Omit<Vehiculo, "id" | "creado_en" | "actualizado_en">): Promise<Vehiculo> {
  const { data, error } = await supabase
    .from("vehiculos")
    .insert([vehiculo])
    .select()
    .single()

  if (error) throw error
  return data
}

// Actualizar un vehículo
export async function updateVehiculo(id: string, vehiculo: Partial<Vehiculo>): Promise<Vehiculo> {
  const { data, error } = await supabase
    .from("vehiculos")
    .update(vehiculo)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Desactivar un vehículo (soft delete)
export async function desactivarVehiculo(id: string): Promise<void> {
  const { error } = await supabase
    .from("vehiculos")
    .update({ activo: false })
    .eq("id", id)

  if (error) throw error
}

// Reactivar un vehículo
export async function reactivarVehiculo(id: string): Promise<void> {
  const { error } = await supabase
    .from("vehiculos")
    .update({ activo: true })
    .eq("id", id)

  if (error) throw error
}

// Obtener alertas de vencimientos de documentos
export async function getAlertasVencimientosVehiculos(): Promise<AlertaVencimientoVehiculo[]> {
  const { data, error } = await supabase
    .from("alertas_vencimientos_vehiculos")
    .select("*")
    .order("dias_soat", { ascending: true, nullsFirst: false })

  if (error) throw error
  return data || []
}

// Verificar si un vehículo tiene documentos vencidos
export function tieneDocumentosVencidos(vehiculo: Vehiculo): boolean {
  const hoy = new Date()

  if (vehiculo.soat_vencimiento) {
    const soatVencimiento = new Date(vehiculo.soat_vencimiento)
    if (soatVencimiento < hoy) return true
  }

  if (vehiculo.tecnomecanica_vencimiento) {
    const tecnomecanicaVencimiento = new Date(vehiculo.tecnomecanica_vencimiento)
    if (tecnomecanicaVencimiento < hoy) return true
  }

  return false
}

// Verificar si un vehículo tiene documentos próximos a vencer (30 días)
export function tieneDocumentosProximosAVencer(vehiculo: Vehiculo): boolean {
  const hoy = new Date()
  const treintaDias = new Date()
  treintaDias.setDate(treintaDias.getDate() + 30)

  if (vehiculo.soat_vencimiento) {
    const soatVencimiento = new Date(vehiculo.soat_vencimiento)
    if (soatVencimiento >= hoy && soatVencimiento <= treintaDias) return true
  }

  if (vehiculo.tecnomecanica_vencimiento) {
    const tecnomecanicaVencimiento = new Date(vehiculo.tecnomecanica_vencimiento)
    if (tecnomecanicaVencimiento >= hoy && tecnomecanicaVencimiento <= treintaDias) return true
  }

  return false
}

// Obtener días restantes hasta vencimiento
export function getDiasRestantes(fecha: string | null): number | null {
  if (!fecha) return null

  const hoy = new Date()
  const vencimiento = new Date(fecha)
  const diferencia = vencimiento.getTime() - hoy.getTime()
  const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24))

  return dias
}

// Obtener estado de un documento
export function getEstadoDocumento(fecha: string | null): "VENCIDO" | "PRÓXIMO A VENCER" | "VIGENTE" | "NO REGISTRADO" {
  if (!fecha) return "NO REGISTRADO"

  const dias = getDiasRestantes(fecha)
  if (dias === null) return "NO REGISTRADO"

  if (dias < 0) return "VENCIDO"
  if (dias <= 30) return "PRÓXIMO A VENCER"
  return "VIGENTE"
}
