-- ============================================
-- CONFIGURAR TIMEZONE DEL SERVIDOR A COLOMBIA
-- ============================================
-- Este script configura el timezone de la base de datos
-- IMPORTANTE: En Supabase, esto debe hacerse desde el Dashboard
-- ============================================

-- Opción 1: Configurar timezone de la base de datos (requiere permisos de superusuario)
-- Si falla, ir a Supabase Dashboard > Settings > Database
ALTER DATABASE postgres SET timezone TO 'America/Bogota';

-- Opción 2: Configurar timezone de la sesión actual (temporal)
SET timezone = 'America/Bogota';

-- Verificar configuración
DO $$
DECLARE
  tz_session TEXT;
  tz_database TEXT;
BEGIN
  -- Obtener timezone de la sesión
  SHOW timezone INTO tz_session;

  RAISE NOTICE '====================================';
  RAISE NOTICE 'CONFIGURACIÓN DE TIMEZONE';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Timezone de la sesión: %', tz_session;
  RAISE NOTICE 'Hora actual: %', NOW();
  RAISE NOTICE '';

  IF tz_session = 'America/Bogota' THEN
    RAISE NOTICE 'OK: Timezone configurado correctamente para Colombia';
  ELSE
    RAISE NOTICE 'ADVERTENCIA: Timezone no es America/Bogota';
    RAISE NOTICE '';
    RAISE NOTICE 'SOLUCIÓN:';
    RAISE NOTICE '1. Ve a Supabase Dashboard';
    RAISE NOTICE '2. Settings > Database > Timezone';
    RAISE NOTICE '3. Cambia a: America/Bogota';
    RAISE NOTICE '';
    RAISE NOTICE 'O ejecuta como superusuario:';
    RAISE NOTICE 'ALTER DATABASE postgres SET timezone TO ''America/Bogota'';';
  END IF;

  RAISE NOTICE '====================================';
END $$;

-- Comparación: UTC vs Colombia
SELECT
  'UTC' as zona,
  NOW() AT TIME ZONE 'UTC' as hora
UNION ALL
SELECT
  'Colombia (America/Bogota)' as zona,
  NOW() AT TIME ZONE 'America/Bogota' as hora
UNION ALL
SELECT
  'Servidor (NOW())' as zona,
  NOW() as hora;
