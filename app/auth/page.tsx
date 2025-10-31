import { AuthForm } from "@/components/auth-form"

export default function AuthPage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Acceso al Sistema</h1>
          <p className="text-lg text-muted-foreground">
            Inicia sesión o regístrate para acceder al sistema de inspecciones
          </p>
        </div>

        <AuthForm />
      </div>
    </div>
  )
}
