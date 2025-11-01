-- ============================================
-- TRIGGER: Crear perfil automáticamente
-- ============================================
-- Cuando se crea un usuario en auth.users,
-- automáticamente se crea su perfil en perfiles
-- ============================================

-- IMPORTANTE: Hacer numero_documento opcional para evitar errores
ALTER TABLE public.perfiles
ALTER COLUMN numero_documento DROP NOT NULL;

-- Eliminar constraint UNIQUE antiguo y crear uno parcial
ALTER TABLE public.perfiles
DROP CONSTRAINT IF EXISTS perfiles_numero_documento_key;

-- Índice UNIQUE parcial: permite múltiples NULL pero evita duplicados
DROP INDEX IF EXISTS idx_perfiles_numero_documento_unique;
CREATE UNIQUE INDEX idx_perfiles_numero_documento_unique
  ON public.perfiles(numero_documento)
  WHERE numero_documento IS NOT NULL;

-- ============================================
-- FUNCIÓN: Crear perfil automáticamente
-- ============================================

CREATE OR REPLACE FUNCTION public.crear_perfil_automaticamente()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (
    id,
    correo,
    nombre_completo,
    numero_documento,
    telefono,
    rol,
    activo,
    zona_horaria,
    preferencias,
    creado_en,
    actualizado_en
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'nombre_completo',
      NEW.raw_user_meta_data->>'nombre',
      NEW.email
    ),
    NEW.raw_user_meta_data->>'numero_documento',
    NEW.raw_user_meta_data->>'telefono',
    'usuario',
    true,
    'America/Bogota',
    '{}'::jsonb,
    NOW(),
    NOW()
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error al crear perfil para usuario %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.crear_perfil_automaticamente();

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON FUNCTION public.crear_perfil_automaticamente() IS
  'Crea automáticamente un perfil en la tabla perfiles cuando se registra un nuevo usuario.';
