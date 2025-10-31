export default function VerifyPage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex flex-col items-center justify-center min-h-[80vh]">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Verifica tu correo electrónico</h1>
          <p className="text-lg text-muted-foreground">
            Hemos enviado un enlace de verificación a tu correo electrónico.
            <br />
            Por favor, revisa tu bandeja de entrada y haz clic en el enlace para verificar tu cuenta.
          </p>
        </div>
      </div>
    </div>
  )
}
