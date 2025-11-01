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
  const { data, error } = await supabase
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

  if (error) throw error
  return data
}

// Quitar un rol operativo
export async function quitarRolOperativo(rolOperativoId: string) {
  const { error } = await supabase
    .from("roles_operativos")
    .delete()
    .eq("id", rolOperativoId)

  if (error) throw error
}

// Actualizar estado de un rol operativo
export async function toggleRolOperativo(rolOperativoId: string, activo: boolean) {
  const { error } = await supabase
    .from("roles_operativos")
    .update({ activo })
    .eq("id", rolOperativoId)

  if (error) throw error
}
