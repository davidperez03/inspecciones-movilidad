// Configuración para Bitácora de Grúas de Plataforma

export interface TurnoConfig {
  id: string
  nombre: string
  // Eliminados horaInicio y horaFin - los turnos son solo etiquetas
  // Las horas se calculan desde los eventos reales registrados
}

export interface TipoEventoConfig {
  id: string
  nombre: string
  categoria: "operacion" | "mantenimiento" | "falla" | "inactivo"
  color: string
  requiereOperario: boolean
  esFalla: boolean // Para identificar rápidamente las fallas
}

// Turnos estándar para grúas - solo etiquetas, no rangos horarios
export const TURNOS: TurnoConfig[] = [
  {
    id: "diurno",
    nombre: "Diurno",
  },
  {
    id: "nocturno",
    nombre: "Nocturno",
  },
]

// Tipos de eventos específicos para grúas de plataforma
export const TIPOS_EVENTOS: TipoEventoConfig[] = [
  // OPERACIÓN
  {
    id: "operacion",
    nombre: "Operación Normal",
    categoria: "operacion",
    color: "bg-green-100 text-green-800 border-green-200",
    requiereOperario: true,
    esFalla: false,
  },

  // MANTENIMIENTO
  {
    id: "mantenimiento_preventivo",
    nombre: "Mantenimiento Preventivo",
    categoria: "mantenimiento",
    color: "bg-sky-100 text-sky-800 border-sky-200",
    requiereOperario: false,
    esFalla: false,
  },
  {
    id: "mantenimiento_correctivo",
    nombre: "Mantenimiento Correctivo",
    categoria: "mantenimiento",
    color: "bg-cyan-100 text-cyan-800 border-cyan-200",
    requiereOperario: false,
    esFalla: false,
  },

  // FALLAS - Las más importantes para grúas
  {
    id: "falla_mecanica",
    nombre: "Falla Mecánica",
    categoria: "falla",
    color: "bg-red-100 text-red-800 border-red-300",
    requiereOperario: false,
    esFalla: true,
  },
  {
    id: "falla_hidraulica",
    nombre: "Falla Hidráulica",
    categoria: "falla",
    color: "bg-red-100 text-red-800 border-red-300",
    requiereOperario: false,
    esFalla: true,
  },
  {
    id: "falla_electrica",
    nombre: "Falla Eléctrica",
    categoria: "falla",
    color: "bg-red-100 text-red-800 border-red-300",
    requiereOperario: false,
    esFalla: true,
  },
  {
    id: "falla_plataforma",
    nombre: "Falla en Plataforma",
    categoria: "falla",
    color: "bg-red-100 text-red-800 border-red-300",
    requiereOperario: false,
    esFalla: true,
  },
  {
    id: "neumaticos",
    nombre: "Problema Neumáticos",
    categoria: "falla",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    requiereOperario: false,
    esFalla: true,
  },
  {
    id: "accidente",
    nombre: "Accidente",
    categoria: "falla",
    color: "bg-red-200 text-red-900 border-red-400",
    requiereOperario: true,
    esFalla: true,
  },

  // INACTIVO
  {
    id: "parqueado",
    nombre: "Parqueado",
    categoria: "inactivo",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    requiereOperario: false,
    esFalla: false,
  },
  {
    id: "fuera_servicio",
    nombre: "Fuera de Servicio",
    categoria: "inactivo",
    color: "bg-gray-200 text-gray-800 border-gray-300",
    requiereOperario: false,
    esFalla: false,
  },
]

/**
 * Detecta el turno según la hora
 * Mantiene la lógica de detección para compatibilidad:
 * - 06:00 a 17:59 = diurno
 * - 18:00 a 05:59 = nocturno
 */
export function detectarTurno(hora: string): string {
  const [horas] = hora.split(":").map(Number)
  return horas >= 6 && horas < 18 ? "diurno" : "nocturno"
}

/**
 * Obtiene configuración de tipo de evento
 */
export function getTipoEvento(id: string): TipoEventoConfig | undefined {
  return TIPOS_EVENTOS.find(t => t.id === id)
}

/**
 * Obtiene todas las fallas
 */
export function getFallas(): TipoEventoConfig[] {
  return TIPOS_EVENTOS.filter(t => t.esFalla)
}

/**
 * Agrupa eventos por categoría
 */
export function agruparPorCategoria() {
  return {
    operacion: TIPOS_EVENTOS.filter(t => t.categoria === "operacion"),
    mantenimiento: TIPOS_EVENTOS.filter(t => t.categoria === "mantenimiento"),
    falla: TIPOS_EVENTOS.filter(t => t.categoria === "falla"),
    inactivo: TIPOS_EVENTOS.filter(t => t.categoria === "inactivo"),
  }
}

/**
 * Periodos predefinidos para reportes
 */
export const PERIODOS_REPORTE = [
  { id: "hoy", nombre: "Hoy" },
  { id: "ayer", nombre: "Ayer" },
  { id: "semana", nombre: "Esta Semana" },
  { id: "mes", nombre: "Este Mes" },
  { id: "mes_anterior", nombre: "Mes Anterior" },
  { id: "personalizado", nombre: "Rango Personalizado" },
]

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD (hora local, no UTC)
 * Usa métodos de zona horaria local para evitar problemas de conversión UTC
 */
export function getFechaHoyLocal(): string {
  const hoy = new Date()
  // Usamos toLocaleDateString con formato ISO para evitar conversión UTC
  const año = hoy.getFullYear()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${año}-${mes}-${dia}`
}

/**
 * Obtiene la hora actual en formato HH:mm (hora local)
 */
export function getHoraActualLocal(): string {
  const ahora = new Date()
  const horas = String(ahora.getHours()).padStart(2, '0')
  const minutos = String(ahora.getMinutes()).padStart(2, '0')
  return `${horas}:${minutos}`
}

/**
 * Formatea una fecha a YYYY-MM-DD en hora local (sin conversión UTC)
 */
function formatearFechaLocal(fecha: Date): string {
  const año = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${año}-${mes}-${dia}`
}

/**
 * Convierte un string de fecha YYYY-MM-DD a un objeto Date en hora local
 * IMPORTANTE: Evita la interpretación UTC que causa el problema de "un día menos"
 */
export function parseFechaLocal(fechaString: string): Date {
  // Evitar new Date(string) porque interpreta como UTC
  // En su lugar, extraemos año, mes, día y creamos la fecha en hora local
  const [año, mes, dia] = fechaString.split('-').map(Number)
  return new Date(año, mes - 1, dia)
}

/**
 * Calcula fechas según el período seleccionado
 * IMPORTANTE: Usa hora local para evitar problemas de zona horaria
 */
export function getFechasPorPeriodo(periodo: string): { desde: string; hasta: string } {
  const hoy = new Date()
  const año = hoy.getFullYear()
  const mes = hoy.getMonth()
  const dia = hoy.getDate()

  switch (periodo) {
    case "hoy":
      return {
        desde: formatearFechaLocal(new Date(año, mes, dia)),
        hasta: formatearFechaLocal(new Date(año, mes, dia)),
      }

    case "ayer":
      return {
        desde: formatearFechaLocal(new Date(año, mes, dia - 1)),
        hasta: formatearFechaLocal(new Date(año, mes, dia - 1)),
      }

    case "semana":
      const diaSemana = hoy.getDay()
      const lunes = new Date(año, mes, dia - (diaSemana === 0 ? 6 : diaSemana - 1))
      return {
        desde: formatearFechaLocal(lunes),
        hasta: formatearFechaLocal(new Date(año, mes, dia)),
      }

    case "mes":
      return {
        desde: formatearFechaLocal(new Date(año, mes, 1)),
        hasta: formatearFechaLocal(new Date(año, mes, dia)),
      }

    case "mes_anterior":
      const primerDiaMesAnterior = new Date(año, mes - 1, 1)
      const ultimoDiaMesAnterior = new Date(año, mes, 0)
      return {
        desde: formatearFechaLocal(primerDiaMesAnterior),
        hasta: formatearFechaLocal(ultimoDiaMesAnterior),
      }

    default:
      return {
        desde: "",
        hasta: "",
      }
  }
}
