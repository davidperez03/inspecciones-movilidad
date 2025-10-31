// lib/analytics-service.ts
import { supabase } from "./supabase"

export interface DashboardStats {
  total: number
  aptos: number
  noAptos: number
  thisMonth: number
  lastMonth: number
  thisWeek: number
  pendientes: number
}

export interface TrendData {
  name: string
  total: number
  aptos: number
  noAptos: number
  fecha: string
}

export interface CategoryIssues {
  categoria: string
  issues: number
  items: string[]
}

export interface VehicleAlert {
  placa: string
  ultimaInspeccion: string | null
  diasSinInspeccion: number
  esapto: boolean | null
  prioridad: 'alta' | 'media' | 'baja'
}

// Obtener estadísticas generales del dashboard
export async function getDashboardStats(): Promise<DashboardStats> {
  const { data: inspecciones, error } = await supabase
    .from("inspecciones")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error

  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const total = inspecciones.length
  const aptos = inspecciones.filter(i => i.esapto).length
  const noAptos = inspecciones.filter(i => !i.esapto).length

  const inspeccionesThisMonth = inspecciones.filter(i => 
    new Date(i.created_at) >= thisMonth
  ).length

  const inspeccionesLastMonth = inspecciones.filter(i => {
    const created = new Date(i.created_at)
    return created >= lastMonth && created < thisMonth
  }).length

  const inspeccionesThisWeek = inspecciones.filter(i => 
    new Date(i.created_at) >= thisWeek
  ).length

  // Calcular vehículos pendientes (que no han sido inspeccionados en más de 30 días)
  const { data: vehiculos, error: vehiculosError } = await supabase
    .from("vehiculos")
    .select("*")
    .eq("activo", true)

  if (vehiculosError) throw vehiculosError

  let pendientes = 0
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  for (const vehiculo of vehiculos) {
    const { data: ultimaInspeccion } = await supabase
      .from("inspecciones")
      .select("created_at")
      .eq("placavehiculo", vehiculo.placa)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (!ultimaInspeccion || new Date(ultimaInspeccion.created_at) < thirtyDaysAgo) {
      pendientes++
    }
  }

  return {
    total,
    aptos,
    noAptos,
    thisMonth: inspeccionesThisMonth,
    lastMonth: inspeccionesLastMonth,
    thisWeek: inspeccionesThisWeek,
    pendientes
  }
}

// Obtener datos de tendencia por meses
export async function getTrendData(months: number = 6): Promise<TrendData[]> {
  const { data: inspecciones, error } = await supabase
    .from("inspecciones")
    .select("created_at, esapto")
    .gte("created_at", new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: true })

  if (error) throw error

  // Agrupar por mes
  const monthlyData: { [key: string]: { total: number, aptos: number, noAptos: number } } = {}
  
  inspecciones.forEach(inspeccion => {
    const date = new Date(inspeccion.created_at)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const monthName = date.toLocaleDateString('es-ES', { month: 'short' }).charAt(0).toUpperCase() + 
                     date.toLocaleDateString('es-ES', { month: 'short' }).slice(1)

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { total: 0, aptos: 0, noAptos: 0 }
    }

    monthlyData[monthKey].total++
    if (inspeccion.esapto) {
      monthlyData[monthKey].aptos++
    } else {
      monthlyData[monthKey].noAptos++
    }
  })

  return Object.entries(monthlyData).map(([key, data]) => {
    const [year, month] = key.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, 1)
    const name = date.toLocaleDateString('es-ES', { month: 'short' }).charAt(0).toUpperCase() + 
                 date.toLocaleDateString('es-ES', { month: 'short' }).slice(1)
    
    return {
      name,
      total: data.total,
      aptos: data.aptos,
      noAptos: data.noAptos,
      fecha: key
    }
  })
}

// Obtener problemas por categoría
export async function getCategoryIssues(): Promise<CategoryIssues[]> {
  const { data: items, error } = await supabase
    .from("items_inspeccion")
    .select("item_id, nombre, estado")
    .in("estado", ["regular", "malo"])

  if (error) throw error

  const categories = {
    "01": "Documentación y Administración",
    "02": "Sistema Mecánico del Vehículo", 
    "03": "Sistema Eléctrico y Óptico",
    "04": "Elementos de Seguridad y Emergencia",
    "05": "Operatividad de la Grúa Plataforma"
  }

  const categoryData: { [key: string]: { issues: number, items: string[] } } = {}

  items.forEach(item => {
    const categoryId = item.item_id.substring(0, 2)
    const categoryName = categories[categoryId] || "Otros"

    if (!categoryData[categoryName]) {
      categoryData[categoryName] = { issues: 0, items: [] }
    }

    categoryData[categoryName].issues++
    if (!categoryData[categoryName].items.includes(item.nombre)) {
      categoryData[categoryName].items.push(item.nombre)
    }
  })

  return Object.entries(categoryData).map(([categoria, data]) => ({
    categoria,
    issues: data.issues,
    items: data.items
  }))
}

// Obtener alertas de vehículos
export async function getVehicleAlerts(): Promise<VehicleAlert[]> {
  const { data: vehiculos, error } = await supabase
    .from("vehiculos")
    .select("placa")
    .eq("activo", true)

  if (error) throw error

  const alerts: VehicleAlert[] = []
  const now = new Date()

  for (const vehiculo of vehiculos) {
    const { data: ultimaInspeccion } = await supabase
      .from("inspecciones")
      .select("created_at, esapto")
      .eq("placavehiculo", vehiculo.placa)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    let diasSinInspeccion = 0
    let prioridad: 'alta' | 'media' | 'baja' = 'baja'

    if (ultimaInspeccion) {
      const fechaUltima = new Date(ultimaInspeccion.created_at)
      diasSinInspeccion = Math.floor((now.getTime() - fechaUltima.getTime()) / (1000 * 60 * 60 * 24))
    } else {
      diasSinInspeccion = 999 // Sin inspecciones
    }

    // Determinar prioridad
    if (diasSinInspeccion > 60 || !ultimaInspeccion) {
      prioridad = 'alta'
    } else if (diasSinInspeccion > 30) {
      prioridad = 'media'
    } else if (ultimaInspeccion && !ultimaInspeccion.esapto) {
      prioridad = 'alta'
    }

    // Solo incluir vehículos que requieren atención
    if (diasSinInspeccion > 30 || (ultimaInspeccion && !ultimaInspeccion.esapto)) {
      alerts.push({
        placa: vehiculo.placa,
        ultimaInspeccion: ultimaInspeccion?.created_at || null,
        diasSinInspeccion,
        esapto: ultimaInspeccion?.esapto || null,
        prioridad
      })
    }
  }

  // Ordenar por prioridad y días sin inspección
  return alerts.sort((a, b) => {
    const prioridadOrder = { alta: 3, media: 2, baja: 1 }
    if (prioridadOrder[a.prioridad] !== prioridadOrder[b.prioridad]) {
      return prioridadOrder[b.prioridad] - prioridadOrder[a.prioridad]
    }
    return b.diasSinInspeccion - a.diasSinInspeccion
  })
}

// Obtener resumen de inspectores
export async function getInspectorSummary(dateFrom?: string, dateTo?: string) {
  let query = supabase
    .from("inspecciones")
    .select("nombreinspector, esapto, created_at")

  if (dateFrom) {
    query = query.gte("created_at", dateFrom)
  }
  if (dateTo) {
    query = query.lte("created_at", dateTo)
  }

  const { data: inspecciones, error } = await query

  if (error) throw error

  const inspectorStats: { [key: string]: { total: number, aptos: number, noAptos: number } } = {}

  inspecciones.forEach(inspeccion => {
    const inspector = inspeccion.nombreinspector
    if (!inspectorStats[inspector]) {
      inspectorStats[inspector] = { total: 0, aptos: 0, noAptos: 0 }
    }

    inspectorStats[inspector].total++
    if (inspeccion.esapto) {
      inspectorStats[inspector].aptos++
    } else {
      inspectorStats[inspector].noAptos++
    }
  })

  return Object.entries(inspectorStats).map(([nombre, stats]) => ({
    nombre,
    ...stats,
    porcentajeApto: stats.total > 0 ? Math.round((stats.aptos / stats.total) * 100) : 0
  }))
}

// Estadísticas de Bitácoras
export interface BitacoraStats {
  totalEventos: number
  eventosEstaSemana: number
  eventosEsteMes: number
  horasOperacionTotal: number
  eventosPorTipo: {
    operacion: number
    mantenimiento: number
    falla: number
    inactivo: number
  }
  eventosAbiertos: number
}

export async function getBitacoraStats(): Promise<BitacoraStats> {
  const { data: eventos, error } = await supabase
    .from("bitacora_eventos")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error

  const now = new Date()
  const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const totalEventos = eventos.length
  const eventosEstaSemana = eventos.filter(e => new Date(e.created_at) >= thisWeek).length
  const eventosEsteMes = eventos.filter(e => new Date(e.created_at) >= thisMonth).length
  const eventosAbiertos = eventos.filter(e => !e.hora_fin).length

  const horasOperacionTotal = eventos.reduce((sum, evento) => {
    return sum + (evento.horas_operacion || 0)
  }, 0)

  const eventosPorTipo = {
    operacion: eventos.filter(e => e.tipo_evento === 'operacion').length,
    mantenimiento: eventos.filter(e => e.tipo_evento === 'mantenimiento').length,
    falla: eventos.filter(e => e.tipo_evento === 'falla').length,
    inactivo: eventos.filter(e => e.tipo_evento === 'inactivo').length,
  }

  return {
    totalEventos,
    eventosEstaSemana,
    eventosEsteMes,
    horasOperacionTotal,
    eventosPorTipo,
    eventosAbiertos
  }
}

export interface EventoReciente {
  id: string
  fecha: string
  tipo_evento: string
  vehiculo_placa: string
  descripcion: string
  created_at: string
}

export async function getEventosRecientes(limit: number = 5): Promise<EventoReciente[]> {
  const { data, error } = await supabase
    .from("bitacora_eventos")
    .select(`
      id,
      fecha,
      tipo_evento,
      descripcion,
      created_at,
      vehiculos(placa)
    `)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data || []).map((evento: any) => ({
    id: evento.id,
    fecha: evento.fecha,
    tipo_evento: evento.tipo_evento,
    vehiculo_placa: evento.vehiculos?.placa || 'N/A',
    descripcion: evento.descripcion,
    created_at: evento.created_at
  }))
}
