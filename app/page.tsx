import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ClipboardCheck, Activity, BarChart3, ArrowRight } from "lucide-react"

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-12">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Sistema de Inspección de Grúas Plataforma
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            Registro y gestión de inspecciones alineadas con la normativa colombiana
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Nueva Inspección */}
          <Card className="border-2 hover:border-gray-400 hover:shadow-lg transition-all group">
            <CardHeader className="text-center">
              <div className="mx-auto bg-gray-100 p-4 rounded-lg mb-4 group-hover:bg-gray-200 transition-colors">
                <ClipboardCheck className="h-10 w-10 text-gray-700" />
              </div>
              <CardTitle className="text-xl">Nueva Inspección</CardTitle>
              <CardDescription className="min-h-[48px]">
                Realizar inspección preoperacional de vehículo
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <Button asChild className="w-full" size="lg">
                <Link href="/inspecciones/nueva">
                  Iniciar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Dashboard */}
          <Card className="border-2 hover:border-gray-400 hover:shadow-lg transition-all group">
            <CardHeader className="text-center">
              <div className="mx-auto bg-gray-100 p-4 rounded-lg mb-4 group-hover:bg-gray-200 transition-colors">
                <BarChart3 className="h-10 w-10 text-gray-700" />
              </div>
              <CardTitle className="text-xl">Dashboard</CardTitle>
              <CardDescription className="min-h-[48px]">
                Ver estadísticas y análisis de inspecciones
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <Button asChild variant="outline" className="w-full" size="lg">
                <Link href="/dashboard">
                  Ver Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Bitácora */}
          <Card className="border-2 hover:border-gray-400 hover:shadow-lg transition-all group">
            <CardHeader className="text-center">
              <div className="mx-auto bg-gray-100 p-4 rounded-lg mb-4 group-hover:bg-gray-200 transition-colors">
                <Activity className="h-10 w-10 text-gray-700" />
              </div>
              <CardTitle className="text-xl">Bitácora</CardTitle>
              <CardDescription className="min-h-[48px]">
                Gestión de operación y eventos de grúas
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <Button asChild variant="outline" className="w-full" size="lg">
                <Link href="/bitacora">
                  Ver Bitácora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
