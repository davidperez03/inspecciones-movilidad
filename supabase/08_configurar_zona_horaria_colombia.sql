-- ============================================
-- CONFIGURACIÓN: Zona Horaria de Colombia
-- ============================================
-- Configura el servidor para trabajar en hora de Colombia
-- Todas las fechas se guardarán y compararán en hora de Colombia
-- ============================================

-- 1. Establecer zona horaria del servidor
-- IMPORTANTE: Ejecutar también en Supabase Dashboard > Settings > Database > Timezone
-- O ejecutar: ALTER DATABASE postgres SET timezone TO 'America/Bogota';
SET timezone = 'America/Bogota';

-- 2. Actualizar todas las funciones para usar hora de Colombia
-- ============================================

-- Función: actualizar updated_at
CREATE OR REPLACE FUNCTION public.actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();  -- NOW() usa el timezone del servidor
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.actualizar_updated_at() IS
  'Actualiza automáticamente la columna actualizado_en con la hora actual del servidor (Colombia)';

-- Función: registrar último acceso
CREATE OR REPLACE FUNCTION public.registrar_ultimo_acceso(usuario_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.perfiles
  SET
    ultimo_acceso = NOW(),  -- NOW() en hora de Colombia
    intentos_login_fallidos = 0
  WHERE id = usuario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.registrar_ultimo_acceso(UUID) IS
  'Registra el último acceso del usuario y resetea intentos fallidos. Usa hora de Colombia.';

-- Función: incrementar intentos fallidos
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
    SET bloqueado_hasta = NOW() + INTERVAL '30 minutes'  -- NOW() + 30 min en hora de Colombia
    WHERE correo = usuario_correo;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.incrementar_intentos_fallidos(TEXT) IS
  'Incrementa intentos fallidos de login. Bloquea por 30 minutos después de 5 intentos. Usa hora de Colombia.';

-- Función: crear perfil automáticamente
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
    NOW(),  -- NOW() en hora de Colombia
    NOW()   -- NOW() en hora de Colombia
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.crear_perfil_automaticamente() IS
  'Crea automáticamente un perfil cuando se registra un usuario en auth.users. Usa hora de Colombia.';

-- Función auxiliar: Obtener hora actual de Colombia
CREATE OR REPLACE FUNCTION public.fecha_colombia()
RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN NOW();  -- NOW() retorna la hora del servidor (Colombia)
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.fecha_colombia() IS
  'Retorna la fecha y hora actual en la zona horaria de Colombia (America/Bogota, GMT-5). Equivalente a NOW().';

-- 3. Verificar configuración
DO $$
DECLARE
  tz TEXT;
BEGIN
  SHOW timezone INTO tz;
  RAISE NOTICE '====================================';
  RAISE NOTICE 'ZONA HORARIA CONFIGURADA';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Timezone actual: %', tz;
  RAISE NOTICE 'Hora actual del servidor: %', NOW();
  RAISE NOTICE '';
  RAISE NOTICE 'Todas las funciones actualizadas:';
  RAISE NOTICE '  - actualizar_updated_at()';
  RAISE NOTICE '  - registrar_ultimo_acceso()';
  RAISE NOTICE '  - incrementar_intentos_fallidos()';
  RAISE NOTICE '  - crear_perfil_automaticamente()';
  RAISE NOTICE '  - fecha_colombia()';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANTE: Si el timezone no es America/Bogota,';
  RAISE NOTICE 'ejecuta: ALTER DATABASE postgres SET timezone TO ''America/Bogota'';';
  RAISE NOTICE '====================================';
END $$;
