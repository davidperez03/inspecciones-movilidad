-- ============================================
-- TRIGGER: Crear perfil automáticamente
-- ============================================
-- Cuando se crea un usuario en auth.users,
-- automáticamente se crea su perfil en perfiles
-- ============================================

CREATE OR REPLACE FUNCTION public.crear_perfil_automaticamente()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (
    id,
    correo,
    nombre_completo,
    rol,
    activo,
    creado_en,
    actualizado_en
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', NEW.email),
    'usuario',
    true,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.crear_perfil_automaticamente();

COMMENT ON FUNCTION public.crear_perfil_automaticamente() IS
  'Crea automáticamente un perfil en la tabla perfiles cuando se registra un nuevo usuario';
