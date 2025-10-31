"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter, usePathname } from "next/navigation"

type AuthContextType = {
  user: any
  perfil: any
  loading: boolean
  signOut: () => Promise<void>
  esAdministrador: () => boolean
  esInspector: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [perfil, setPerfil] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user || null)

      // Cargar perfil del usuario
      if (user) {
        const { data: perfilData } = await supabase
          .from("perfiles")
          .select("*")
          .eq("id", user.id)
          .single()
        setPerfil(perfilData)
      } else {
        setPerfil(null)
      }

      setLoading(false)

      // Redirigir según la autenticación
      if (!user && !pathname.startsWith("/auth")) {
        router.push("/auth")
      } else if (user && pathname.startsWith("/auth")) {
        router.push("/dashboard")
      }
    }

    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null)

      if (event === "SIGNED_IN" && pathname.startsWith("/auth")) {
        router.push("/dashboard")
      } else if (event === "SIGNED_OUT" && !pathname.startsWith("/auth")) {
        router.push("/auth")
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, pathname])

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push("/auth")
  }

  const esAdministrador = () => {
    return perfil?.rol === 'administrador' && perfil?.activo === true
  }

  const esInspector = () => {
    return (perfil?.rol === 'inspector' || perfil?.rol === 'administrador') && perfil?.activo === true
  }

  return (
    <AuthContext.Provider value={{ user, perfil, loading, signOut, esAdministrador, esInspector }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
