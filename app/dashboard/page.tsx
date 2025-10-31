"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, TrendingUp, AlertTriangle, CheckCircle, Clock, FileText, Users, Calendar, Activity } from "lucide-react"
import {
  getDashboardStats,
  getTrendData,
  getCategoryIssues,
  getVehicleAlerts,
  getBitacoraStats,
  getEventosRecientes,
  type DashboardStats,
  type TrendData,
  type CategoryIssues,
  type VehicleAlert,
  type BitacoraStats,
  type EventoReciente
} from "@/lib/analytics-service"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { AlertasVencimientos } from "@/components/alertas-vencimientos"

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    aptos: 0,
    noAptos: 0,
    thisMonth: 0,
    lastMonth: 0,
    thisWeek: 0,
    pendientes: 0
  })
  const [bitacoraStats, setBitacoraStats] = useState<BitacoraStats>({
    totalEventos: 0,
    eventosEstaSemana: 0,
    eventosEsteMes: 0,
    horasOperacionTotal: 0,
    eventosPorTipo: {
      operacion: 0,
      mantenimiento: 0,
      falla: 0,
      inactivo: 0
    },
    eventosAbiertos: 0
  })
  const [eventosRecientes, setEventosRecientes] = useState<EventoReciente[]>([])
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [categoryIssues, setCategoryIssues] = useState<CategoryIssues[]>([])
  const [vehicleAlerts, setVehicleAlerts] = useState<VehicleAlert[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function checkAuthAndLoad() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      
      if (!user) {
        router.push("/auth")
        return
      }

      setUser(user)

      try {
        // Cargar todas las estadísticas en paralelo
        const [statsData, trendDataResult, categoryIssuesResult, vehicleAlertsResult, bitacoraStatsData, eventosRecientesData] = await Promise.all([
          getDashboardStats(),
          getTrendData(6),
          getCategoryIssues(),
          getVehicleAlerts(),
          getBitacoraStats(),
          getEventosRecientes(5)
        ])

        setStats(statsData)
        setTrendData(trendDataResult)
        setCategoryIssues(categoryIssuesResult)
        setVehicleAlerts(vehicleAlertsResult.slice(0, 5)) // Solo los primeros 5 alerts
        setBitacoraStats(bitacoraStatsData)
        setEventosRecientes(eventosRecientesData)
      } catch (error) {
        console.error("Error cargando datos del dashboard:", error)
      } finally {
        setLoading(false)
      }
    }

    checkAuthAndLoad()
  }, [router])

  const getPriorityColor = (prioridad: string) => {
    switch (prioridad) {
      case 'alta': return 'bg-red-100 text-red-800 border-red-200'
      case 'media': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'baja': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const changePercentage = stats.lastMonth > 0 ? 
    ((stats.thisMonth - stats.lastMonth) / stats.lastMonth * 100).toFixed(1) : 
    stats.thisMonth > 0 ? "100" : "0"

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="flex justify-center items-center h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Vista general del sistema de inspecciones</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/bitacora">
              <Activity className="h-4 w-4 mr-2" />
              Bitácora
            </Link>
          </Button>
          <Button asChild>
            <Link href="/inspecciones/nueva">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Inspección
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inspecciones</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              +{changePercentage}% desde el mes pasado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vehículos Aptos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.aptos}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? ((stats.aptos / stats.total) * 100).toFixed(1) : 0}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vehículos No Aptos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.noAptos}</div>
            <p className="text-xs text-muted-foreground">
              Requieren atención inmediata
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inspecciones Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendientes}</div>
            <p className="text-xs text-muted-foreground">
              Vehículos sin inspección reciente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bitácora KPI Cards */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Bitácoras</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Eventos</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bitacoraStats.totalEventos}</div>
              <p className="text-xs text-muted-foreground">
                {bitacoraStats.eventosEsteMes} este mes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Horas Operación</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {bitacoraStats.horasOperacionTotal.toFixed(1)}h
              </div>
              <p className="text-xs text-muted-foreground">
                Total registrado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fallas Reportadas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {bitacoraStats.eventosPorTipo.falla}
              </div>
              <p className="text-xs text-muted-foreground">
                Requieren atención
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Eventos Abiertos</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {bitacoraStats.eventosAbiertos}
              </div>
              <p className="text-xs text-muted-foreground">
                Sin hora de cierre
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Inspecciones</CardTitle>
            <CardDescription>Evolución mensual de inspecciones realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} name="Total" />
                  <Line type="monotone" dataKey="aptos" stroke="#22c55e" strokeWidth={2} name="Aptos" />
                  <Line type="monotone" dataKey="noAptos" stroke="#ef4444" strokeWidth={2} name="No Aptos" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No hay datos suficientes para mostrar la tendencia
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Issues */}
        <Card>
          <CardHeader>
            <CardTitle>Problemas por Categoría</CardTitle>
            <CardDescription>Principales fallas encontradas en inspecciones</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryIssues.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryIssues}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="categoria" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="issues" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No se encontraron problemas recientes
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Events from Bitácora */}
      {eventosRecientes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Eventos Recientes</CardTitle>
            <CardDescription>Últimos eventos registrados en bitácoras</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {eventosRecientes.map((evento) => (
                <div key={evento.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Badge variant={
                      evento.tipo_evento === 'falla' ? 'destructive' :
                      evento.tipo_evento === 'mantenimiento' ? 'default' :
                      evento.tipo_evento === 'operacion' ? 'secondary' : 'outline'
                    }>
                      {evento.tipo_evento}
                    </Badge>
                    <div>
                      <p className="font-medium">{evento.vehiculo_placa}</p>
                      <p className="text-sm text-muted-foreground">
                        {evento.descripcion || 'Sin descripción'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(evento.fecha).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" asChild>
                    <Link href="/bitacora">
                      Ver
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vehicle Alerts */}
      {vehicleAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alertas de Vehículos</CardTitle>
            <CardDescription>Vehículos que requieren atención prioritaria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {vehicleAlerts.map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      alert.prioridad === 'alta' ? 'bg-red-500' :
                      alert.prioridad === 'media' ? 'bg-orange-500' : 'bg-yellow-500'
                    }`}></div>
                    <div>
                      <p className="font-medium">{alert.placa}</p>
                      <p className="text-sm text-muted-foreground">
                        {alert.ultimaInspeccion ?
                          `Última inspección: ${alert.diasSinInspeccion} días atrás` :
                          'Sin inspecciones registradas'
                        }
                        {alert.esapto === false && ' - No Apto'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getPriorityColor(alert.prioridad)}>
                      {alert.prioridad === 'alta' ? 'Urgente' : 
                       alert.prioridad === 'media' ? 'Importante' : 'Pendiente'}
                    </Badge>
                    <Button size="sm" variant="outline" asChild>
                      <Link href="/inspecciones/nueva">
                        Inspeccionar
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas de Vencimientos */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Alertas de Vencimientos</h2>
        <AlertasVencimientos />
      </div>
    </div>
  )
}
