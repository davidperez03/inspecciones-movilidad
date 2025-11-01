export type User = {
  id: string
  email: string
  nombre: string
  cargo: string
}

// ============================================
// TIPOS PARA PERFILES Y ROLES
// ============================================

export type Perfil = {
  id: string
  correo: string
  nombre_completo: string
  numero_documento: string | null
  telefono: string | null
  rol: 'usuario' | 'inspector' | 'administrador'
  activo: boolean
  url_avatar: string | null
  zona_horaria: string
  preferencias: Record<string, any>
  ultimo_acceso: string | null
  intentos_login_fallidos: number
  bloqueado_hasta: string | null
  creado_en: string
  actualizado_en: string
  creado_por: string | null
  actualizado_por: string | null
}

export type RolOperativo = {
  id: string
  perfil_id: string
  rol: 'operario' | 'auxiliar' | 'inspector'
  licencia_conduccion: string | null
  categoria_licencia: string | null
  licencia_vencimiento: string | null
  activo: boolean
  fecha_inicio: string
  fecha_fin: string | null
  motivo_inactivacion: string | null
  creado_en: string
  actualizado_en: string
  creado_por: string | null
  actualizado_por: string | null
  // Relación con perfil
  perfiles?: Perfil
}

// Tipo combinado para trabajar con operarios/auxiliares/inspectores
export type PersonalOperativo = {
  id: string // ID del perfil
  nombre: string // nombre_completo del perfil
  numero_documento: string | null
  correo: string
  telefono: string | null
  rol_operativo: 'operario' | 'auxiliar' | 'inspector'
  rol_operativo_id: string // ID del rol operativo
  activo: boolean
  fecha_inicio: string
  fecha_fin: string | null
  // Campos específicos de operarios
  licencia_conduccion: string | null
  categoria_licencia: string | null
  licencia_vencimiento: string | null
  creado_en: string
}

// Compatibilidad con código existente
export type Operario = PersonalOperativo & {
  rol_operativo: 'operario'
  cedula: string // numero_documento o correo como fallback
  es_conductor: boolean
}

export type Auxiliar = PersonalOperativo & {
  rol_operativo: 'auxiliar'
  cedula: string // numero_documento o correo como fallback
}

export type Inspector = PersonalOperativo & {
  rol_operativo: 'inspector'
  cedula: string // numero_documento o correo como fallback
}

// ============================================
// TIPOS PARA VEHÍCULOS
// ============================================

export type Vehiculo = {
  id: string
  placa: string
  marca: string | null
  modelo: string | null
  tipo: string
  activo: boolean
  soat_vencimiento: string | null
  tecnomecanica_vencimiento: string | null
  soat_aseguradora: string | null
  numero_poliza_soat: string | null
  observaciones: string | null
  creado_en: string
  actualizado_en: string
  creado_por: string | null
  actualizado_por: string | null
}

// ============================================
// TIPOS PARA INSPECCIONES
// ============================================

export type Inspeccion = {
  id: string
  vehiculo_id: string
  operario_perfil_id: string
  auxiliar_perfil_id: string | null
  inspector_perfil_id: string | null
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
  // Resultados
  es_apto: boolean
  puntaje_total: number | null
  items_verificados: number
  items_buenos: number
  items_regulares: number
  items_malos: number
  items_no_aplica: number
  // Observaciones
  observaciones_generales: string | null
  recomendaciones: string | null
  acciones_correctivas: string | null
  // Firmas
  firma_operario_data_url: string | null
  firma_supervisor_data_url: string | null
  // Estado
  estado: 'borrador' | 'completada' | 'cancelada'
  // Metadata
  creado_en: string
  actualizado_en: string
  creado_por: string
  actualizado_por: string | null
  // Relaciones
  items?: ItemInspeccion[]
  fotos?: FotoInspeccion[]
}

export type ItemInspeccion = {
  id: string
  inspeccion_id: string
  item_id: string
  nombre: string
  categoria: 'documentacion' | 'exterior' | 'interior' | 'mecanico' | 'electrico' | 'seguridad' | 'herramientas'
  estado: 'bueno' | 'regular' | 'malo' | 'no_aplica'
  puntuacion: number | null
  observacion: string | null
  es_critico: boolean
  requiere_atencion: boolean
  prioridad: 'baja' | 'media' | 'alta' | 'critica' | null
  orden: number
  creado_en: string
}

export type FotoInspeccion = {
  id: string
  inspeccion_id: string
  url_foto: string
  nombre_archivo: string | null
  tipo_mime: string | null
  tamaño_bytes: number | null
  descripcion: string | null
  categoria: 'general' | 'daño' | 'documentacion' | 'otro' | null
  item_relacionado_id: string | null
  latitud: number | null
  longitud: number | null
  subido_en: string
  subido_por: string
}

// Compatibilidad con código existente
export type Foto = {
  id: string
  inspeccion_id: string
  url: string
  descripcion: string | null
}

export type AlertaVencimientoVehiculo = {
  id: string
  placa: string
  marca: string
  modelo: string
  soat_vencimiento: string | null
  tecnomecanica_vencimiento: string | null
  soat_aseguradora: string | null
  soat_estado: "VENCIDO" | "PRÓXIMO A VENCER" | "VIGENTE"
  tecnomecanica_estado: "VENCIDO" | "PRÓXIMO A VENCER" | "VIGENTE"
  dias_soat: number | null
  dias_tecnomecanica: number | null
}

export type AlertaVencimientoLicencia = {
  id: string
  nombre: string
  cedula: string
  licencia_conduccion: string
  categoria_licencia: string
  licencia_vencimiento: string
  licencia_estado: "VENCIDA" | "PRÓXIMA A VENCER" | "VIGENTE"
  dias_restantes: number | null
}

// ============================================
// TIPOS PARA BITÁCORA
// ============================================

export type BitacoraEvento = {
  id: string
  vehiculo_id: string
  operario_perfil_id: string | null
  auxiliar_perfil_id: string | null
  fecha: string
  hora_inicio: string
  hora_fin: string | null
  tipo_evento: 'operacion' | 'mantenimiento' | 'falla' | 'inactivo' | 'traslado'
  descripcion: string
  turno: 'diurno' | 'nocturno' | 'completo' | null
  horas_operacion: number | null
  estado: 'activo' | 'cerrado' | 'cancelado'
  observaciones: string | null
  adjuntos: string[] | null
  creado_en: string
  actualizado_en: string
  creado_por: string
  actualizado_por: string | null
  // Relaciones
  vehiculos?: {
    placa: string
    marca: string | null
    modelo: string | null
  }
  operario_perfil?: {
    nombre_completo: string
  }
  auxiliar_perfil?: {
    nombre_completo: string
  }
}

export type BitacoraCierre = {
  id: string
  vehiculo_id: string
  operario_perfil_id: string | null
  fecha_inicio: string
  fecha_fin: string
  hora_inicio: string
  hora_fin: string
  turno: 'diurno' | 'nocturno' | 'mixto' | null
  horas_operacion: number
  horas_novedades: number
  horas_efectivas: number
  porcentaje_efectividad: number | null
  eventos_ids: string[]
  cantidad_eventos: number
  observaciones: string | null
  cerrado_por: string
  cerrado_en: string
  creado_en: string
  actualizado_en: string
  // Relaciones
  vehiculos?: {
    placa: string
    marca: string | null
    modelo: string | null
  }
  operario_perfil?: {
    nombre_completo: string
  }
}

// ============================================
// TIPOS PARA HISTORIAL
// ============================================

export type HistorialPersonal = {
  id: string
  personal_id: string
  tipo_personal: 'operario' | 'auxiliar' | 'inspector'
  nombre: string
  cedula: string
  tipo_movimiento: 'ingreso' | 'baja' | 'reingreso' | 'actualizacion' | 'cambio_estado'
  fecha_movimiento: string
  motivo: string | null
  observaciones: string | null
  estado_activo: boolean
  es_conductor: boolean
  licencia_conduccion: string | null
  categoria_licencia: string | null
  licencia_vencimiento: string | null
  creado_en: string
  creado_por: string | null
}

export type MovimientoPersonal = {
  id: string
  nombre: string
  cedula: string
  tipo_personal: 'operario' | 'auxiliar' | 'inspector'
  tipo_movimiento: 'ingreso' | 'baja' | 'reingreso' | 'actualizacion' | 'cambio_estado'
  fecha_movimiento: string
  motivo: string | null
  estado_activo: boolean
}

export type PersonalActivoEnFecha = {
  personal_id: string
  tipo_personal: 'operario' | 'auxiliar' | 'inspector'
  nombre: string
  cedula: string
  fecha_ingreso: string
  es_conductor: boolean
  licencia_conduccion: string | null
  categoria_licencia: string | null
  licencia_vencimiento: string | null
}

export type EstadisticasMovimientos = {
  mes: string
  total_ingresos: number
  total_bajas: number
  total_reingresos: number
  movimientos_operarios: number
  movimientos_auxiliares: number
  movimientos_inspectores: number
}

export type HistorialAccion = {
  id: string
  usuario_id: string | null
  usuario_correo: string | null
  usuario_nombre: string | null
  tabla: string
  accion: 'INSERT' | 'UPDATE' | 'DELETE'
  registro_id: string | null
  datos_anteriores: Record<string, any> | null
  datos_nuevos: Record<string, any> | null
  cambios: Record<string, any> | null
  ip_address: string | null
  user_agent: string | null
  endpoint: string | null
  realizado_en: string
  realizado_por: string | null
}
