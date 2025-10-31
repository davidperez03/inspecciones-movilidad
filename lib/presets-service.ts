import type { Operario, Auxiliar, Vehiculo } from "./types"
import {
  getOperariosActivos,
  getAuxiliaresActivos,
  createOperario as createOperarioFull,
  createAuxiliar as createAuxiliarFull
} from "./recurso-humano-service"
import { getVehiculosActivos, createVehiculo as createVehiculoFull } from "./vehiculos-service"
import { supabase } from "./supabase"

// ==================== OPERARIOS ====================

export async function getOperarios(): Promise<Operario[]> {
  return await getOperariosActivos()
}

export async function createOperario(operario: {
  nombre: string
  cedula: string
}): Promise<Operario> {
  // Usar cedula como correo temporal (se puede mejorar después)
  const correoTemporal = `${operario.cedula}@temp.local`

  return await createOperarioFull({
    nombre: operario.nombre,
    correo: correoTemporal,
  })
}

export async function searchOperarios(query: string): Promise<Operario[]> {
  const { data, error } = await supabase
    .from("roles_operativos")
    .select(`
      id,
      perfil_id,
      rol,
      licencia_conduccion,
      categoria_licencia,
      licencia_vencimiento,
      activo,
      fecha_inicio,
      fecha_fin,
      creado_en,
      perfiles:perfil_id (
        id,
        nombre_completo,
        correo,
        telefono
      )
    `)
    .eq("rol", "operario")
    .eq("activo", true)
    .or(`perfiles.nombre_completo.ilike.%${query}%,perfiles.correo.ilike.%${query}%`)
    .order("perfiles(nombre_completo)")
    .limit(5)

  if (error) throw error

  return (data || []).map((item: any) => ({
    id: item.perfiles.id,
    nombre: item.perfiles.nombre_completo,
    correo: item.perfiles.correo,
    telefono: item.perfiles.telefono,
    rol_operativo: 'operario' as const,
    rol_operativo_id: item.id,
    activo: item.activo,
    fecha_inicio: item.fecha_inicio,
    fecha_fin: item.fecha_fin,
    licencia_conduccion: item.licencia_conduccion,
    categoria_licencia: item.categoria_licencia,
    licencia_vencimiento: item.licencia_vencimiento,
    creado_en: item.creado_en,
    cedula: item.perfiles.correo, // Usar correo como cedula
    es_conductor: !!item.licencia_conduccion,
  }))
}

// ==================== AUXILIARES ====================

export async function getAuxiliares(): Promise<Auxiliar[]> {
  return await getAuxiliaresActivos()
}

export async function createAuxiliar(auxiliar: {
  nombre: string
  cedula: string
}): Promise<Auxiliar> {
  const correoTemporal = `${auxiliar.cedula}@temp.local`

  return await createAuxiliarFull({
    nombre: auxiliar.nombre,
    correo: correoTemporal,
  })
}

export async function searchAuxiliares(query: string): Promise<Auxiliar[]> {
  const { data, error } = await supabase
    .from("roles_operativos")
    .select(`
      id,
      perfil_id,
      rol,
      activo,
      fecha_inicio,
      fecha_fin,
      creado_en,
      perfiles:perfil_id (
        id,
        nombre_completo,
        correo,
        telefono
      )
    `)
    .eq("rol", "auxiliar")
    .eq("activo", true)
    .or(`perfiles.nombre_completo.ilike.%${query}%,perfiles.correo.ilike.%${query}%`)
    .order("perfiles(nombre_completo)")
    .limit(5)

  if (error) throw error

  return (data || []).map((item: any) => ({
    id: item.perfiles.id,
    nombre: item.perfiles.nombre_completo,
    correo: item.perfiles.correo,
    telefono: item.perfiles.telefono,
    rol_operativo: 'auxiliar' as const,
    rol_operativo_id: item.id,
    activo: item.activo,
    fecha_inicio: item.fecha_inicio,
    fecha_fin: item.fecha_fin,
    licencia_conduccion: null,
    categoria_licencia: null,
    licencia_vencimiento: null,
    creado_en: item.creado_en,
    cedula: item.perfiles.correo,
  }))
}

// ==================== VEHÍCULOS ====================

export async function getVehiculos(): Promise<Vehiculo[]> {
  return await getVehiculosActivos()
}

export async function createVehiculo(vehiculo: {
  placa: string
  marca?: string
  modelo?: string
  tipo?: string
}): Promise<Vehiculo> {
  return await createVehiculoFull({
    placa: vehiculo.placa,
    marca: vehiculo.marca || null,
    modelo: vehiculo.modelo || null,
    tipo: vehiculo.tipo || 'GRÚA DE PLATAFORMA',
    activo: true,
  })
}

export async function searchVehiculos(query: string): Promise<Vehiculo[]> {
  const { data, error } = await supabase
    .from("vehiculos")
    .select("*")
    .or(`placa.ilike.%${query}%,modelo.ilike.%${query}%,marca.ilike.%${query}%`)
    .eq("activo", true)
    .order("placa")
    .limit(5)

  if (error) throw error
  return data || []
}
