import { supabase } from "./supabase"
import type { Operario, Auxiliar, Inspector, PersonalOperativo, RolOperativo, AlertaVencimientoLicencia } from "./types"

// ==================== PERSONAL OPERATIVO (GENERAL) ====================

// Obtener personal operativo por rol
export async function getPersonalPorRol(rol: 'operario' | 'auxiliar' | 'inspector', soloActivos: boolean = false): Promise<PersonalOperativo[]> {
  let query = supabase
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
        numero_documento,
        correo,
        telefono
      )
    `)
    .eq("rol", rol)

  if (soloActivos) {
    query = query.eq("activo", true)
  }

  const { data, error } = await query.order("perfiles(nombre_completo)")

  if (error) throw error

  // Transformar los datos al formato PersonalOperativo
  return (data || []).map((item: any) => ({
    id: item.perfiles.id,
    nombre: item.perfiles.nombre_completo,
    numero_documento: item.perfiles.numero_documento,
    correo: item.perfiles.correo,
    telefono: item.perfiles.telefono,
    rol_operativo: item.rol,
    rol_operativo_id: item.id,
    activo: item.activo,
    fecha_inicio: item.fecha_inicio,
    fecha_fin: item.fecha_fin,
    licencia_conduccion: item.licencia_conduccion,
    categoria_licencia: item.categoria_licencia,
    licencia_vencimiento: item.licencia_vencimiento,
    creado_en: item.creado_en,
  }))
}

// ==================== OPERARIOS ====================

// Obtener todos los operarios
export async function getOperarios(): Promise<Operario[]> {
  const personal = await getPersonalPorRol('operario', false)
  return personal.map(p => ({
    ...p,
    rol_operativo: 'operario' as const,
    cedula: p.numero_documento || p.correo, // Usar numero_documento, o correo como fallback
    es_conductor: !!p.licencia_conduccion,
  }))
}

// Obtener solo operarios activos
export async function getOperariosActivos(): Promise<Operario[]> {
  const personal = await getPersonalPorRol('operario', true)
  return personal.map(p => ({
    ...p,
    rol_operativo: 'operario' as const,
    cedula: p.numero_documento || p.correo,
    es_conductor: !!p.licencia_conduccion,
  }))
}

// Obtener solo conductores activos (operarios con licencia)
export async function getConductoresActivos(): Promise<Operario[]> {
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
        numero_documento,
        correo,
        telefono
      )
    `)
    .eq("rol", "operario")
    .eq("activo", true)
    .not("licencia_conduccion", "is", null)
    .order("perfiles(nombre_completo)")

  if (error) throw error

  return (data || []).map((item: any) => ({
    id: item.perfiles.id,
    nombre: item.perfiles.nombre_completo,
    numero_documento: item.perfiles.numero_documento,
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
    cedula: item.perfiles.numero_documento || item.perfiles.correo,
    es_conductor: true,
  }))
}

// Obtener un operario por ID de perfil
export async function getOperarioById(id: string): Promise<Operario | null> {
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
        numero_documento,
        correo,
        telefono
      )
    `)
    .eq("perfil_id", id)
    .eq("rol", "operario")
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return {
    id: data.perfiles.id,
    nombre: data.perfiles.nombre_completo,
    numero_documento: data.perfiles.numero_documento,
    correo: data.perfiles.correo,
    telefono: data.perfiles.telefono,
    rol_operativo: 'operario',
    rol_operativo_id: data.id,
    activo: data.activo,
    fecha_inicio: data.fecha_inicio,
    fecha_fin: data.fecha_fin,
    licencia_conduccion: data.licencia_conduccion,
    categoria_licencia: data.categoria_licencia,
    licencia_vencimiento: data.licencia_vencimiento,
    creado_en: data.creado_en,
    cedula: data.perfiles.numero_documento || data.perfiles.correo,
    es_conductor: !!data.licencia_conduccion,
  }
}

// Crear un nuevo operario (requiere primero crear el perfil)
export async function createOperario(operario: {
  nombre: string
  correo: string
  telefono?: string
  licencia_conduccion?: string
  categoria_licencia?: string
  licencia_vencimiento?: string
}): Promise<Operario> {
  // Nota: En producción, esto debería integrarse con el sistema de auth
  // Por ahora, asumimos que el perfil ya existe o lo creamos manualmente

  const { data: userData, error: userError } = await supabase.auth.signUp({
    email: operario.correo,
    password: Math.random().toString(36).slice(-8), // Password temporal
  })

  if (userError) throw userError
  if (!userData.user) throw new Error("No se pudo crear el usuario")

  // Crear el perfil
  const { data: perfilData, error: perfilError } = await supabase
    .from("perfiles")
    .insert({
      id: userData.user.id,
      correo: operario.correo,
      nombre_completo: operario.nombre,
      telefono: operario.telefono || null,
      rol: 'usuario',
    })
    .select()
    .single()

  if (perfilError) throw perfilError

  // Crear el rol operativo
  const { data: rolData, error: rolError } = await supabase
    .from("roles_operativos")
    .insert({
      perfil_id: perfilData.id,
      rol: 'operario',
      licencia_conduccion: operario.licencia_conduccion || null,
      categoria_licencia: operario.categoria_licencia || null,
      licencia_vencimiento: operario.licencia_vencimiento || null,
      activo: true,
      fecha_inicio: new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (rolError) throw rolError

  return {
    id: perfilData.id,
    nombre: perfilData.nombre_completo,
    correo: perfilData.correo,
    telefono: perfilData.telefono,
    rol_operativo: 'operario',
    rol_operativo_id: rolData.id,
    activo: rolData.activo,
    fecha_inicio: rolData.fecha_inicio,
    fecha_fin: rolData.fecha_fin,
    licencia_conduccion: rolData.licencia_conduccion,
    categoria_licencia: rolData.categoria_licencia,
    licencia_vencimiento: rolData.licencia_vencimiento,
    creado_en: rolData.creado_en,
    cedula: perfilData.correo,
    es_conductor: !!rolData.licencia_conduccion,
  }
}

// Actualizar un operario
export async function updateOperario(id: string, operario: Partial<{
  nombre: string
  telefono: string
  licencia_conduccion: string
  categoria_licencia: string
  licencia_vencimiento: string
}>): Promise<Operario> {
  // Actualizar perfil si hay datos de perfil
  if (operario.nombre || operario.telefono) {
    const perfilUpdate: any = {}
    if (operario.nombre) perfilUpdate.nombre_completo = operario.nombre
    if (operario.telefono) perfilUpdate.telefono = operario.telefono

    const { error: perfilError } = await supabase
      .from("perfiles")
      .update(perfilUpdate)
      .eq("id", id)

    if (perfilError) throw perfilError
  }

  // Actualizar rol operativo si hay datos de licencia
  if (operario.licencia_conduccion !== undefined ||
      operario.categoria_licencia !== undefined ||
      operario.licencia_vencimiento !== undefined) {
    const rolUpdate: any = {}
    if (operario.licencia_conduccion !== undefined) rolUpdate.licencia_conduccion = operario.licencia_conduccion
    if (operario.categoria_licencia !== undefined) rolUpdate.categoria_licencia = operario.categoria_licencia
    if (operario.licencia_vencimiento !== undefined) rolUpdate.licencia_vencimiento = operario.licencia_vencimiento

    const { error: rolError } = await supabase
      .from("roles_operativos")
      .update(rolUpdate)
      .eq("perfil_id", id)
      .eq("rol", "operario")

    if (rolError) throw rolError
  }

  const operarioActualizado = await getOperarioById(id)
  if (!operarioActualizado) throw new Error("No se pudo obtener el operario actualizado")

  return operarioActualizado
}

// Dar de baja a un operario
export async function darDeBajaOperario(id: string, motivo: string): Promise<void> {
  const { error } = await supabase
    .from("roles_operativos")
    .update({
      activo: false,
      fecha_fin: new Date().toISOString().split('T')[0],
      motivo_inactivacion: motivo,
    })
    .eq("perfil_id", id)
    .eq("rol", "operario")

  if (error) throw error
}

// Reactivar un operario
export async function reactivarOperario(id: string): Promise<void> {
  const { error } = await supabase
    .from("roles_operativos")
    .update({
      activo: true,
      fecha_fin: null,
      motivo_inactivacion: null,
    })
    .eq("perfil_id", id)
    .eq("rol", "operario")

  if (error) throw error
}

// ==================== AUXILIARES ====================

// Obtener todos los auxiliares
export async function getAuxiliares(): Promise<Auxiliar[]> {
  const personal = await getPersonalPorRol('auxiliar', false)
  return personal.map(p => ({
    ...p,
    rol_operativo: 'auxiliar' as const,
    cedula: p.correo,
  }))
}

// Obtener solo auxiliares activos
export async function getAuxiliaresActivos(): Promise<Auxiliar[]> {
  const personal = await getPersonalPorRol('auxiliar', true)
  return personal.map(p => ({
    ...p,
    rol_operativo: 'auxiliar' as const,
    cedula: p.correo,
  }))
}

// Obtener un auxiliar por ID
export async function getAuxiliarById(id: string): Promise<Auxiliar | null> {
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
    .eq("perfil_id", id)
    .eq("rol", "auxiliar")
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return {
    id: data.perfiles.id,
    nombre: data.perfiles.nombre_completo,
    correo: data.perfiles.correo,
    telefono: data.perfiles.telefono,
    rol_operativo: 'auxiliar',
    rol_operativo_id: data.id,
    activo: data.activo,
    fecha_inicio: data.fecha_inicio,
    fecha_fin: data.fecha_fin,
    licencia_conduccion: null,
    categoria_licencia: null,
    licencia_vencimiento: null,
    creado_en: data.creado_en,
    cedula: data.perfiles.correo,
  }
}

// Crear un nuevo auxiliar
export async function createAuxiliar(auxiliar: {
  nombre: string
  correo: string
  telefono?: string
}): Promise<Auxiliar> {
  const { data: userData, error: userError } = await supabase.auth.signUp({
    email: auxiliar.correo,
    password: Math.random().toString(36).slice(-8),
  })

  if (userError) throw userError
  if (!userData.user) throw new Error("No se pudo crear el usuario")

  const { data: perfilData, error: perfilError } = await supabase
    .from("perfiles")
    .insert({
      id: userData.user.id,
      correo: auxiliar.correo,
      nombre_completo: auxiliar.nombre,
      telefono: auxiliar.telefono || null,
      rol: 'usuario',
    })
    .select()
    .single()

  if (perfilError) throw perfilError

  const { data: rolData, error: rolError } = await supabase
    .from("roles_operativos")
    .insert({
      perfil_id: perfilData.id,
      rol: 'auxiliar',
      activo: true,
      fecha_inicio: new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (rolError) throw rolError

  return {
    id: perfilData.id,
    nombre: perfilData.nombre_completo,
    correo: perfilData.correo,
    telefono: perfilData.telefono,
    rol_operativo: 'auxiliar',
    rol_operativo_id: rolData.id,
    activo: rolData.activo,
    fecha_inicio: rolData.fecha_inicio,
    fecha_fin: rolData.fecha_fin,
    licencia_conduccion: null,
    categoria_licencia: null,
    licencia_vencimiento: null,
    creado_en: rolData.creado_en,
    cedula: perfilData.correo,
  }
}

// Actualizar un auxiliar
export async function updateAuxiliar(id: string, auxiliar: Partial<{
  nombre: string
  telefono: string
}>): Promise<Auxiliar> {
  if (auxiliar.nombre || auxiliar.telefono) {
    const perfilUpdate: any = {}
    if (auxiliar.nombre) perfilUpdate.nombre_completo = auxiliar.nombre
    if (auxiliar.telefono) perfilUpdate.telefono = auxiliar.telefono

    const { error: perfilError } = await supabase
      .from("perfiles")
      .update(perfilUpdate)
      .eq("id", id)

    if (perfilError) throw perfilError
  }

  const auxiliarActualizado = await getAuxiliarById(id)
  if (!auxiliarActualizado) throw new Error("No se pudo obtener el auxiliar actualizado")

  return auxiliarActualizado
}

// Dar de baja a un auxiliar
export async function darDeBajaAuxiliar(id: string, motivo: string): Promise<void> {
  const { error } = await supabase
    .from("roles_operativos")
    .update({
      activo: false,
      fecha_fin: new Date().toISOString().split('T')[0],
      motivo_inactivacion: motivo,
    })
    .eq("perfil_id", id)
    .eq("rol", "auxiliar")

  if (error) throw error
}

// Reactivar un auxiliar
export async function reactivarAuxiliar(id: string): Promise<void> {
  const { error } = await supabase
    .from("roles_operativos")
    .update({
      activo: true,
      fecha_fin: null,
      motivo_inactivacion: null,
    })
    .eq("perfil_id", id)
    .eq("rol", "auxiliar")

  if (error) throw error
}

// ==================== INSPECTORES ====================

// Obtener todos los inspectores activos
export async function getInspectoresActivos(): Promise<Inspector[]> {
  const personal = await getPersonalPorRol('inspector', true)
  return personal.map(p => ({
    ...p,
    rol_operativo: 'inspector' as const,
    cedula: p.correo,
  }))
}

// ==================== ALERTAS DE LICENCIAS ====================

// Obtener alertas de vencimientos de licencias
export async function getAlertasVencimientosLicencias(): Promise<AlertaVencimientoLicencia[]> {
  const { data, error } = await supabase
    .from("roles_operativos")
    .select(`
      id,
      perfil_id,
      licencia_conduccion,
      categoria_licencia,
      licencia_vencimiento,
      perfiles:perfil_id (
        nombre_completo,
        correo
      )
    `)
    .eq("rol", "operario")
    .eq("activo", true)
    .not("licencia_vencimiento", "is", null)
    .order("licencia_vencimiento")

  if (error) throw error

  return (data || []).map((item: any) => {
    const diasRestantes = getDiasRestantesLicencia(item.licencia_vencimiento)
    return {
      id: item.perfil_id,
      nombre: item.perfiles.nombre_completo,
      cedula: item.perfiles.correo,
      licencia_conduccion: item.licencia_conduccion,
      categoria_licencia: item.categoria_licencia,
      licencia_vencimiento: item.licencia_vencimiento,
      licencia_estado: getEstadoLicencia(item.licencia_vencimiento),
      dias_restantes: diasRestantes,
    }
  })
}

// Verificar si una licencia está vencida
export function tieneLicenciaVencida(operario: Operario): boolean {
  if (!operario.es_conductor || !operario.licencia_vencimiento) return false

  const hoy = new Date()
  const vencimiento = new Date(operario.licencia_vencimiento)

  return vencimiento < hoy
}

// Verificar si una licencia está próxima a vencer (30 días)
export function tieneLicenciaProximaAVencer(operario: Operario): boolean {
  if (!operario.es_conductor || !operario.licencia_vencimiento) return false

  const hoy = new Date()
  const treintaDias = new Date()
  treintaDias.setDate(treintaDias.getDate() + 30)
  const vencimiento = new Date(operario.licencia_vencimiento)

  return vencimiento >= hoy && vencimiento <= treintaDias
}

// Obtener días restantes hasta vencimiento de licencia
export function getDiasRestantesLicencia(fecha: string | null): number | null {
  if (!fecha) return null

  const hoy = new Date()
  const vencimiento = new Date(fecha)
  const diferencia = vencimiento.getTime() - hoy.getTime()
  const dias = Math.ceil(diferencia / (1000 * 60 * 60 * 24))

  return dias
}

// Obtener estado de una licencia
export function getEstadoLicencia(fecha: string | null): "VENCIDA" | "PRÓXIMA A VENCER" | "VIGENTE" | "NO REGISTRADA" {
  if (!fecha) return "NO REGISTRADA"

  const dias = getDiasRestantesLicencia(fecha)
  if (dias === null) return "NO REGISTRADA"

  if (dias < 0) return "VENCIDA"
  if (dias <= 30) return "PRÓXIMA A VENCER"
  return "VIGENTE"
}

// Obtener operarios retirados
export async function getOperariosRetirados(): Promise<Operario[]> {
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
    .eq("activo", false)
    .not("fecha_fin", "is", null)
    .order("fecha_fin", { ascending: false })

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
    cedula: item.perfiles.correo,
    es_conductor: !!item.licencia_conduccion,
  }))
}

// Obtener auxiliares retirados
export async function getAuxiliaresRetirados(): Promise<Auxiliar[]> {
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
    .eq("activo", false)
    .not("fecha_fin", "is", null)
    .order("fecha_fin", { ascending: false })

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
