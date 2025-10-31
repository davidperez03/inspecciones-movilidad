-- ============================================
-- TABLA: perfiles (Usuarios del sistema)
-- ============================================
-- Descripción: Gestión de perfiles de usuario con roles y auditoría
-- Roles disponibles: administrador, inspector, usuario
-- ============================================

CREATE TABLE IF NOT EXISTS public.perfiles (
  -- Identificación
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  correo TEXT NOT NULL UNIQUE,

  -- Información personal
  nombre_completo TEXT NOT NULL,
  telefono TEXT,

  -- Configuración de cuenta
  rol TEXT NOT NULL DEFAULT 'usuario'
    CHECK (rol IN ('usuario', 'inspector', 'administrador')),
  activo BOOLEAN NOT NULL DEFAULT true,
  url_avatar TEXT,

  -- Preferencias
  zona_horaria TEXT DEFAULT 'America/Bogota',
  preferencias JSONB DEFAULT '{}'::jsonb,

  -- Auditoría y seguimiento
  ultimo_acceso TIMESTAMPTZ,
  intentos_login_fallidos INTEGER DEFAULT 0,
  bloqueado_hasta TIMESTAMPTZ,

  -- Metadata
  creado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, NOW()),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, NOW()),
  creado_por UUID REFERENCES public.perfiles(id),
  actualizado_por UUID REFERENCES public.perfiles(id)
);

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE public.perfiles IS
  'Perfiles de usuarios del sistema de inspecciones';

COMMENT ON COLUMN public.perfiles.id IS
  'UUID del usuario, referencia a auth.users';

COMMENT ON COLUMN public.perfiles.rol IS
  'Rol del usuario: administrador (acceso total), inspector (crear inspecciones y eventos), usuario (solo lectura)';

COMMENT ON COLUMN public.perfiles.activo IS
  'Indica si el usuario puede acceder al sistema';

COMMENT ON COLUMN public.perfiles.preferencias IS
  'Configuraciones personalizadas del usuario (idioma, tema, notificaciones, etc.)';

COMMENT ON COLUMN public.perfiles.bloqueado_hasta IS
  'Fecha hasta la cual el usuario está bloqueado por intentos fallidos';

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_perfiles_correo
  ON public.perfiles(correo);

CREATE INDEX IF NOT EXISTS idx_perfiles_rol
  ON public.perfiles(rol);

CREATE INDEX IF NOT EXISTS idx_perfiles_activo
  ON public.perfiles(activo) WHERE activo = true;

CREATE INDEX IF NOT EXISTS idx_perfiles_ultimo_acceso
  ON public.perfiles(ultimo_acceso DESC);

CREATE INDEX IF NOT EXISTS idx_perfiles_creado_en
  ON public.perfiles(creado_en DESC);

-- ============================================
-- TRIGGER: actualizar updated_at
-- ============================================

CREATE OR REPLACE FUNCTION public.actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = timezone('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_perfiles_actualizar_updated_at
  BEFORE UPDATE ON public.perfiles
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_updated_at();

-- ============================================
-- FUNCIÓN: registrar último acceso
-- ============================================

CREATE OR REPLACE FUNCTION public.registrar_ultimo_acceso(usuario_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.perfiles
  SET
    ultimo_acceso = NOW(),
    intentos_login_fallidos = 0
  WHERE id = usuario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN: incrementar intentos fallidos
-- ============================================

CREATE OR REPLACE FUNCTION public.incrementar_intentos_fallidos(usuario_correo TEXT)
RETURNS void AS $$
DECLARE
  intentos INTEGER;
BEGIN
  UPDATE public.perfiles
  SET intentos_login_fallidos = intentos_login_fallidos + 1
  WHERE correo = usuario_correo
  RETURNING intentos_login_fallidos INTO intentos;

  -- Bloquear por 30 minutos después de 5 intentos
  IF intentos >= 5 THEN
    UPDATE public.perfiles
    SET bloqueado_hasta = NOW() + INTERVAL '30 minutes'
    WHERE correo = usuario_correo;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
