"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nombre, setNombre] = useState("")
  const [cargo, setCargo] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast({
        title: "Inicio de sesión exitoso",
        description: "Has iniciado sesión correctamente",
      })

      router.push("/dashboard")
    } catch (error: any) {
      toast({
        title: "Error al iniciar sesión",
        description: error.message || "Ha ocurrido un error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Registrar usuario
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre,
            cargo,
          },
        },
      })

      if (authError) throw authError

      toast({
        title: "Registro exitoso",
        description: "Se ha enviado un correo de confirmación a tu email",
      })

      // Redirigir al dashboard o a una página de verificación
      router.push("/auth/verify")
    } catch (error: any) {
      toast({
        title: "Error al registrarse",
        description: error.message || "Ha ocurrido un error",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <Tabs defaultValue="login">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
          <TabsTrigger value="register">Registrarse</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <form onSubmit={handleSignIn}>
            <CardHeader>
              <CardTitle>Iniciar Sesión</CardTitle>
              <CardDescription>Ingresa tus credenciales para acceder al sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
              </Button>
            </CardFooter>
          </form>
        </TabsContent>

        <TabsContent value="register">
          <form onSubmit={handleSignUp}>
            <CardHeader>
              <CardTitle>Crear Cuenta</CardTitle>
              <CardDescription>Regístrate para acceder al sistema de inspecciones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reg-email">Correo Electrónico</Label>
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">Contraseña</Label>
                <Input
                  id="reg-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre Completo</Label>
                <Input
                  id="nombre"
                  type="text"
                  placeholder="Tu nombre completo"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cargo">Cargo</Label>
                <Input
                  id="cargo"
                  type="text"
                  placeholder="Tu cargo en la empresa"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Registrando..." : "Registrarse"}
              </Button>
            </CardFooter>
          </form>
        </TabsContent>
      </Tabs>
    </Card>
  )
}
