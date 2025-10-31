import { supabase } from "./supabase"
import type { BitacoraEvento } from "./types"

export async function getBitacoraEventos(
  vehiculoId?: string,
  fechaInicio?: string,
  fechaFin?: string,
  tipoEvento?: string,
  operarioId?: string,
  turno?: string,
  busquedaTexto?: string,
  soloAbiertos?: boolean,
): Promise<BitacoraEvento[]> {
  let query = supabase
    .from("bitacora_eventos")
    .select(`
      *,
      vehiculos(placa, marca, modelo),
      operario_perfil:operario_perfil_id(nombre_completo),
      auxiliar_perfil:auxiliar_perfil_id(nombre_completo)
    `)
    .order("fecha", { ascending: false })
    .order("hora_inicio", { ascending: false })

  if (vehiculoId) {
    query = query.eq("vehiculo_id", vehiculoId)
  }

  if (fechaInicio) {
    query = query.gte("fecha", fechaInicio)
  }

  if (fechaFin) {
    query = query.lte("fecha", fechaFin)
  }

  if (tipoEvento) {
    query = query.eq("tipo_evento", tipoEvento)
  }

  if (operarioId) {
    query = query.eq("operario_perfil_id", operarioId)
  }

  if (turno) {
    query = query.eq("turno", turno)
  }

  if (soloAbiertos) {
    query = query.eq("estado", "activo")
  }

  const { data, error } = await query

  if (error) throw error

  // Filtrar por búsqueda de texto en el cliente (descripción)
  let resultados = data || []
  if (busquedaTexto) {
    const textoLower = busquedaTexto.toLowerCase()
    resultados = resultados.filter(evento =>
      evento.descripcion.toLowerCase().includes(textoLower) ||
      evento.vehiculos?.placa.toLowerCase().includes(textoLower) ||
      evento.operario_perfil?.nombre_completo.toLowerCase().includes(textoLower)
    )
  }

  return resultados
}

export async function createBitacoraEvento(evento: {
  vehiculo_id: string
  fecha: string
  hora_inicio: string
  hora_fin: string | null
  tipo_evento: 'operacion' | 'mantenimiento' | 'falla' | 'inactivo' | 'traslado'
  turno: 'diurno' | 'nocturno' | 'completo' | null
  descripcion: string
  operario_perfil_id: string | null
  auxiliar_perfil_id: string | null
  observaciones?: string | null
  creado_por: string
}): Promise<BitacoraEvento> {
  // Calcular horas de operación si hay hora_inicio y hora_fin
  let horasOperacion = null
  if (evento.hora_inicio && evento.hora_fin) {
    const [horaInicio, minInicio] = evento.hora_inicio.split(":").map(Number)
    const [horaFin, minFin] = evento.hora_fin.split(":").map(Number)

    const inicioMinutos = horaInicio * 60 + minInicio
    const finMinutos = horaFin * 60 + minFin

    // Si el fin es menor que el inicio, asumimos que cruza la medianoche
    const totalMinutos = finMinutos < inicioMinutos ? 24 * 60 - inicioMinutos + finMinutos : finMinutos - inicioMinutos

    horasOperacion = Number.parseFloat((totalMinutos / 60).toFixed(2))
  }

  const { data, error } = await supabase
    .from("bitacora_eventos")
    .insert([
      {
        ...evento,
        horas_operacion: horasOperacion,
        estado: evento.hora_fin ? 'cerrado' : 'activo',
      },
    ])
    .select(`
      *,
      vehiculos(placa, marca, modelo),
      operario_perfil:operario_perfil_id(nombre_completo),
      auxiliar_perfil:auxiliar_perfil_id(nombre_completo)
    `)
    .single()

  if (error) throw error
  return data
}

export async function updateBitacoraEvento(
  id: string,
  evento: {
    vehiculo_id?: string
    fecha?: string
    hora_inicio?: string
    hora_fin?: string | null
    tipo_evento?: 'operacion' | 'mantenimiento' | 'falla' | 'inactivo' | 'traslado'
    turno?: 'diurno' | 'nocturno' | 'completo' | null
    descripcion?: string
    operario_perfil_id?: string | null
    auxiliar_perfil_id?: string | null
    observaciones?: string | null
  },
): Promise<BitacoraEvento> {
  // Obtener el evento actual para tener hora_inicio si no se provee
  const { data: eventoActual, error: errorActual } = await supabase
    .from("bitacora_eventos")
    .select("hora_inicio, hora_fin")
    .eq("id", id)
    .single()

  if (errorActual) throw errorActual

  const horaInicio = evento.hora_inicio || eventoActual.hora_inicio
  const horaFin = evento.hora_fin !== undefined ? evento.hora_fin : eventoActual.hora_fin

  // Calcular horas de operación si hay hora_inicio y hora_fin
  let horasOperacion = null
  if (horaInicio && horaFin) {
    const [hI, mI] = horaInicio.split(":").map(Number)
    const [hF, mF] = horaFin.split(":").map(Number)

    const inicioMinutos = hI * 60 + mI
    const finMinutos = hF * 60 + mF

    const totalMinutos = finMinutos < inicioMinutos ? 24 * 60 - inicioMinutos + finMinutos : finMinutos - inicioMinutos

    horasOperacion = Number.parseFloat((totalMinutos / 60).toFixed(2))
  }

  const updateData: any = { ...evento }
  if (horasOperacion !== null) {
    updateData.horas_operacion = horasOperacion
  }
  if (horaFin) {
    updateData.estado = 'cerrado'
  }

  const { data, error } = await supabase
    .from("bitacora_eventos")
    .update(updateData)
    .eq("id", id)
    .select(`
      *,
      vehiculos(placa, marca, modelo),
      operario_perfil:operario_perfil_id(nombre_completo),
      auxiliar_perfil:auxiliar_perfil_id(nombre_completo)
    `)
    .single()

  if (error) throw error
  return data
}

export async function deleteBitacoraEvento(id: string): Promise<void> {
  const { error } = await supabase.from("bitacora_eventos").delete().eq("id", id)

  if (error) throw error
}

export async function cerrarEvento(id: string, horaFin: string): Promise<BitacoraEvento> {
  return updateBitacoraEvento(id, { hora_fin: horaFin })
}

export async function cancelarEvento(id: string): Promise<void> {
  const { error } = await supabase
    .from("bitacora_eventos")
    .update({ estado: 'cancelado' })
    .eq("id", id)

  if (error) throw error
}
