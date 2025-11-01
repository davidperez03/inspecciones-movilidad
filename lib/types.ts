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

// ============================================
// TIPOS PARA PERSONAL OPERATIVO
// ============================================
// NUEVA ESTRUCTURA: Personal operativo (solo operarios y auxiliares)
// Los inspectores están en la tabla perfiles con rol 'inspector'

export type Personal = {
  id: string
  nombre_completo: string
  numero_documento: string
  tipo_documento: 'CC' | 'CE' | 'PA' | 'TI'
  telefono: string | null
  email: string | null
  direccion: string | null
  fecha_nacimiento: string | null
  tipo_personal: 'operario' | 'auxiliar'
  estado: 'activo' | 'inactivo' | 'suspendido' | 'vacaciones'
  fecha_ingreso: string
  fecha_salida: string | null
  es_conductor: boolean
  licencia_conduccion: string | null
  categoria_licencia: 'A1' | 'A2' | 'B1' | 'B2' | 'B3' | 'C1' | 'C2' | 'C3' | null
  licencia_vencimiento: string | null
  perfil_id: string | null
  observaciones: string | null
  creado_en: string
  actualizado_en: string
  creado_por: string | null
  actualizado_por: string | null
  // Relación con perfil (opcional)
  perfiles?: Perfil
}

// Tipo específico para operarios (con licencia obligatoria)
export type Operario = Personal & {
  tipo_personal: 'operario'
  es_conductor: true
  licencia_conduccion: string
  categoria_licencia: 'A1' | 'A2' | 'B1' | 'B2' | 'B3' | 'C1' | 'C2' | 'C3'
  licencia_vencimiento: string
  // Compatibilidad
  cedula: string // alias de numero_documento
  nombre: string // alias de nombre_completo
}

// Tipo específico para auxiliares
export type Auxiliar = Personal & {
  tipo_personal: 'auxiliar'
  // Compatibilidad
  cedula: string // alias de numero_documento
  nombre: string // alias de nombre_completo
}

// DEPRECATED: Mantener por compatibilidad con código existente
// TODO: Migrar código que use RolOperativo a usar Personal
export type RolOperativo = {
  id: string
  perfil_id: string
  rol: 'operario' | 'auxiliar'
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
  perfiles?: Perfil
}

// DEPRECATED: Usar Personal en su lugar
export type PersonalOperativo = {
  id: string
  nombre: string
  numero_documento: string | null
  correo: string
  telefono: string | null
  rol_operativo: 'operario' | 'auxiliar'
  rol_operativo_id: string
  activo: boolean
  fecha_inicio: string
  fecha_fin: string | null
  licencia_conduccion: string | null
  categoria_licencia: string | null
  licencia_vencimiento: string | null
  creado_en: string
}

// Los inspectores ahora son solo perfiles con rol 'inspector'
export type Inspector = Perfil & {
  rol: 'inspector'
  // Compatibilidad
  cedula: string // alias de numero_documento
  nombre: string // alias de nombre_completo
}

// ============================================
// TIPOS PARA TURNOS
// ============================================

export type Turno = {
  id: string
  nombre: string
  descripcion: string | null
  hora_inicio: string
  hora_fin: string
  duracion_horas: number | null
  es_nocturno: boolean
  activo: boolean
  dias_semana: number[] // 0=domingo, 1=lunes, ..., 6=sábado
  color: string | null
  orden: number
  creado_en: string
  actualizado_en: string
  creado_por: string | null
  actualizado_por: string | null
}

export type AsignacionTurno = {
  id: string
  personal_id: string
  turno_id: string
  fecha_inicio: string
  fecha_fin: string | null
  activo: boolean
  observaciones: string | null
  creado_en: string
  actualizado_en: string
  creado_por: string | null
  actualizado_por: string | null
  // Relaciones
  personal?: Personal
  turnos?: Turno
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
// TIPOS PARA HISTORIAL Y MOVIMIENTOS
// ============================================

export type MovimientoPersonal = {
  id: string
  personal_id: string
  tipo_movimiento: 'ingreso' | 'salida' | 'reingreso' | 'suspension' | 'reactivacion'
  fecha_movimiento: string
  fecha_efectiva: string | null
  motivo: string
  observaciones: string | null
  snapshot_data: Record<string, any> | null
  creado_en: string
  creado_por: string | null
  // Relación con personal
  personal?: Personal
}

export type PersonalActivoEnFecha = {
  personal_id: string
  tipo_personal: 'operario' | 'auxiliar'
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
  total_salidas: number
  total_reingresos: number
  total_suspensiones: number
  total_reactivaciones: number
  movimientos_operarios: number
  movimientos_auxiliares: number
}

// DEPRECATED: Mantener por compatibilidad
export type HistorialPersonal = {
  id: string
  personal_id: string
  tipo_personal: 'operario' | 'auxiliar'
  nombre: string
  cedula: string
  tipo_movimiento: 'ingreso' | 'salida' | 'reingreso' | 'suspension' | 'reactivacion'
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
