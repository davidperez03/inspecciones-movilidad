import { supabase } from "./supabase"

export type Perfil = {
  id: string
  correo: string
  nombre_completo: string
  numero_documento: string | null
  telefono: string | null
  rol: 'usuario' | 'inspector' | 'administrador'
  activo: boolean
  creado_en: string
  // Roles operativos asignados
  roles_operativos?: {
    id: string
    rol: 'operario' | 'auxiliar' | 'inspector'
    activo: boolean
    licencia_conduccion: string | null
    categoria_licencia: string | null
    licencia_vencimiento: string | null
  }[]
}

// Obtener todos los perfiles con sus roles operativos
export async function getPerfiles(): Promise<Perfil[]> {
  const { data, error } = await supabase
    .from("perfiles")
    .select(`
      id,
      correo,
      nombre_completo,
      numero_documento,
      telefono,
      rol,
      activo,
      creado_en,
      roles_operativos!perfil_id(
        id,
        rol,
        activo,
        licencia_conduccion,
        categoria_licencia,
        licencia_vencimiento
      )
    `)
    .order("nombre_completo")

  if (error) throw error
  return data || []
}

// Asignar un rol operativo a un perfil
export async function asignarRolOperativo(
  perfilId: string,
  rol: 'operario' | 'auxiliar' | 'inspector',
  datosLicencia?: {
    licencia_conduccion?: string
    categoria_licencia?: string
    licencia_vencimiento?: string
  }
) {
  // Obtener datos del perfil
  const { data: perfil, error: perfilError } = await supabase
    .from("perfiles")
    .select("nombre_completo, correo, numero_documento")
    .eq("id", perfilId)
    .single()

  if (perfilError) throw perfilError

  // Crear rol operativo
  const { data: rolData, error: rolError } = await supabase
    .from("roles_operativos")
    .insert({
      perfil_id: perfilId,
      rol: rol,
      activo: true,
      fecha_inicio: new Date().toISOString().split('T')[0],
      licencia_conduccion: datosLicencia?.licencia_conduccion || null,
      categoria_licencia: datosLicencia?.categoria_licencia || null,
      licencia_vencimiento: datosLicencia?.licencia_vencimiento || null,
    })
    .select()
    .single()

  if (rolError) throw rolError

  // Registrar en historial_personal
  const { error: historialError } = await supabase
    .from("historial_personal")
    .insert({
      personal_id: perfilId,
      tipo_personal: rol,
      nombre: perfil.nombre_completo,
      cedula: perfil.numero_documento || 'Sin documento',
      tipo_movimiento: 'ingreso',
      fecha_movimiento: new Date().toISOString().split('T')[0],
      observaciones: `Asignado rol operativo de ${rol}`,
      estado_activo: true,
      es_conductor: rol === 'operario' && !!datosLicencia?.licencia_conduccion,
      licencia_conduccion: datosLicencia?.licencia_conduccion || null,
      categoria_licencia: datosLicencia?.categoria_licencia || null,
      licencia_vencimiento: datosLicencia?.licencia_vencimiento || null,
    })

  if (historialError) throw historialError

  return rolData
}

// Quitar un rol operativo
export async function quitarRolOperativo(rolOperativoId: string) {
  // Obtener datos del rol operativo antes de eliminarlo
  const { data: rolData, error: rolError } = await supabase
    .from("roles_operativos")
    .select(`
      perfil_id,
      rol,
      perfiles:perfil_id (
        nombre_completo,
        numero_documento
      )
    `)
    .eq("id", rolOperativoId)
    .single()

  if (rolError) throw rolError

  // Registrar en historial antes de eliminar
  const { error: historialError } = await supabase
    .from("historial_personal")
    .insert({
      personal_id: rolData.perfil_id,
      tipo_personal: rolData.rol,
      nombre: (rolData.perfiles as any).nombre_completo,
      cedula: (rolData.perfiles as any).numero_documento || 'Sin documento',
      tipo_movimiento: 'baja',
      fecha_movimiento: new Date().toISOString().split('T')[0],
      observaciones: `Rol operativo de ${rolData.rol} removido`,
      estado_activo: false,
      es_conductor: false,
    })

  if (historialError) throw historialError

  // Eliminar rol operativo
  const { error: deleteError } = await supabase
    .from("roles_operativos")
    .delete()
    .eq("id", rolOperativoId)

  if (deleteError) throw deleteError
}

// Actualizar estado de un rol operativo
export async function toggleRolOperativo(rolOperativoId: string, activo: boolean) {
  const { error } = await supabase
    .from("roles_operativos")
    .update({ activo })
    .eq("id", rolOperativoId)

  if (error) throw error
}
