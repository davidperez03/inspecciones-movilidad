-- ============================================
-- TABLAS DE HISTORIAL Y AUDITORÍA
-- ============================================
-- Registro de cambios y movimientos
-- ============================================

-- ============================================
-- TABLA: movimientos_personal
-- ============================================
-- Historial de movimientos IMPORTANTES de personal
-- Solo registra: ingresos, salidas, reingresos, suspensiones, reactivaciones

CREATE TABLE IF NOT EXISTS public.movimientos_personal (
  -- Identificación
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referencia a personal
  personal_id UUID NOT NULL REFERENCES public.personal(id) ON DELETE CASCADE,

  -- Tipo de movimiento (solo eventos importantes)
  tipo_movimiento TEXT NOT NULL
    CHECK (tipo_movimiento IN ('ingreso', 'salida', 'reingreso', 'suspension', 'reactivacion')),

  -- Fechas
  fecha_movimiento DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_efectiva DATE, -- Fecha en que se hace efectivo el movimiento (puede ser diferente)

  -- Detalles del movimiento
  motivo TEXT NOT NULL,
  observaciones TEXT,

  -- Datos snapshot del personal en ese momento
  snapshot_data JSONB,

  -- Metadata
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por UUID REFERENCES public.perfiles(id)
);

COMMENT ON TABLE public.movimientos_personal IS
  'Historial de movimientos importantes de personal: ingresos, salidas, reingresos, suspensiones y reactivaciones';

COMMENT ON COLUMN public.movimientos_personal.tipo_movimiento IS
  'Solo eventos importantes: ingreso (primera vez), salida (baja), reingreso (regreso después de salida), suspension (temporal), reactivacion (fin de suspensión)';

COMMENT ON COLUMN public.movimientos_personal.snapshot_data IS
  'Snapshot JSON con el estado completo del personal en el momento del movimiento para trazabilidad';

COMMENT ON COLUMN public.movimientos_personal.fecha_efectiva IS
  'Fecha en que el movimiento es efectivo (puede diferir de fecha_movimiento si se registra anticipadamente)';

-- Índices
CREATE INDEX idx_movimientos_personal ON public.movimientos_personal(personal_id, fecha_movimiento DESC);
CREATE INDEX idx_movimientos_tipo ON public.movimientos_personal(tipo_movimiento);
CREATE INDEX idx_movimientos_fecha ON public.movimientos_personal(fecha_movimiento DESC);
CREATE INDEX idx_movimientos_creado_por ON public.movimientos_personal(creado_por);

-- Índice GIN para búsquedas en snapshot_data
CREATE INDEX idx_movimientos_snapshot ON public.movimientos_personal USING gin(snapshot_data);

-- ============================================
-- TABLA: historial_acciones (Auditoría general)
-- ============================================

CREATE TABLE IF NOT EXISTS public.historial_acciones (
  -- Identificación
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Usuario
  usuario_id UUID REFERENCES public.perfiles(id),
  usuario_correo TEXT,
  usuario_nombre TEXT,

  -- Acción
  tabla TEXT NOT NULL,
  accion TEXT NOT NULL
    CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE')),
  registro_id UUID,

  -- Datos
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  cambios JSONB,

  -- Contexto
  ip_address INET,
  user_agent TEXT,
  endpoint TEXT,

  -- Metadata
  realizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  realizado_por UUID REFERENCES public.perfiles(id)
);

COMMENT ON TABLE public.historial_acciones IS
  'Auditoría completa de todas las acciones del sistema';

COMMENT ON COLUMN public.historial_acciones.cambios IS
  'JSONB con los campos que cambiaron: {campo: {anterior: valor, nuevo: valor}}';

-- Índices
CREATE INDEX idx_historial_usuario ON public.historial_acciones(usuario_id);
CREATE INDEX idx_historial_tabla ON public.historial_acciones(tabla);
CREATE INDEX idx_historial_fecha ON public.historial_acciones(realizado_en DESC);
CREATE INDEX idx_historial_accion ON public.historial_acciones(accion);
CREATE INDEX idx_historial_registro ON public.historial_acciones(tabla, registro_id);

-- Índice GIN para búsquedas en JSONB
CREATE INDEX idx_historial_cambios ON public.historial_acciones USING gin(cambios);

-- ============================================
-- FUNCIÓN: registrar auditoría general
-- ============================================

CREATE OR REPLACE FUNCTION public.registrar_auditoria()
RETURNS TRIGGER AS $$
DECLARE
  usuario_actual UUID;
  cambios_detectados JSONB := '{}'::jsonb;
  campo TEXT;
BEGIN
  -- Obtener usuario actual (desde session o trigger)
  usuario_actual := COALESCE(
    current_setting('app.current_user_id', true)::uuid,
    auth.uid()
  );

  -- Para UPDATE, detectar cambios
  IF (TG_OP = 'UPDATE') THEN
    FOR campo IN
      SELECT key
      FROM jsonb_each(to_jsonb(NEW))
      WHERE to_jsonb(NEW)->>key IS DISTINCT FROM to_jsonb(OLD)->>key
    LOOP
      cambios_detectados := cambios_detectados ||
        jsonb_build_object(
          campo,
          jsonb_build_object(
            'anterior', to_jsonb(OLD)->>campo,
            'nuevo', to_jsonb(NEW)->>campo
          )
        );
    END LOOP;
  END IF;

  -- Insertar registro de auditoría
  INSERT INTO public.historial_acciones (
    usuario_id,
    tabla,
    accion,
    registro_id,
    datos_anteriores,
    datos_nuevos,
    cambios,
    realizado_por
  ) VALUES (
    usuario_actual,
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    CASE WHEN TG_OP = 'UPDATE' THEN cambios_detectados ELSE NULL END,
    usuario_actual
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.registrar_auditoria() IS
  'Función genérica para registrar todas las acciones de INSERT/UPDATE/DELETE en historial_acciones';

-- ============================================
-- FUNCIÓN: registrar movimiento de personal automático
-- ============================================

CREATE OR REPLACE FUNCTION public.registrar_movimiento_personal_auto()
RETURNS TRIGGER AS $$
DECLARE
  tipo_mov TEXT;
  motivo_mov TEXT;
BEGIN
  -- Determinar tipo de movimiento según el cambio
  IF (TG_OP = 'INSERT') THEN
    tipo_mov := 'ingreso';
    motivo_mov := 'Registro inicial de personal en el sistema';
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Cambio de estado a inactivo (salida/baja)
    IF (OLD.estado = 'activo' AND NEW.estado = 'inactivo') THEN
      tipo_mov := 'salida';
      motivo_mov := COALESCE(NEW.observaciones, 'Salida de la empresa');
    -- Reactivación desde inactivo (reingreso)
    ELSIF (OLD.estado = 'inactivo' AND NEW.estado = 'activo') THEN
      tipo_mov := 'reingreso';
      motivo_mov := 'Reingreso a la empresa';
    -- Suspensión
    ELSIF (OLD.estado != 'suspendido' AND NEW.estado = 'suspendido') THEN
      tipo_mov := 'suspension';
      motivo_mov := COALESCE(NEW.observaciones, 'Suspensión temporal de labores');
    -- Reactivación desde suspensión
    ELSIF (OLD.estado = 'suspendido' AND NEW.estado = 'activo') THEN
      tipo_mov := 'reactivacion';
      motivo_mov := 'Reactivación después de suspensión';
    ELSE
      -- No registrar otros cambios (actualizaciones normales)
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  -- Insertar movimiento en el historial
  INSERT INTO public.movimientos_personal (
    personal_id,
    tipo_movimiento,
    fecha_movimiento,
    fecha_efectiva,
    motivo,
    observaciones,
    snapshot_data,
    creado_por
  ) VALUES (
    NEW.id,
    tipo_mov,
    CURRENT_DATE,
    COALESCE(NEW.fecha_salida, NEW.fecha_ingreso, CURRENT_DATE),
    motivo_mov,
    NEW.observaciones,
    to_jsonb(NEW), -- Guardar snapshot completo del registro
    COALESCE(
      current_setting('app.current_user_id', true)::uuid,
      auth.uid(),
      NEW.actualizado_por
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.registrar_movimiento_personal_auto() IS
  'Registra automáticamente movimientos importantes de personal cuando cambia el estado (ingreso, salida, reingreso, suspensión, reactivación)';

-- ============================================
-- TRIGGERS DE AUDITORÍA EN TABLAS PRINCIPALES
-- ============================================

-- Auditoría en perfiles
CREATE TRIGGER trigger_auditoria_perfiles
  AFTER INSERT OR UPDATE OR DELETE ON public.perfiles
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_auditoria();

-- Auditoría en vehículos
CREATE TRIGGER trigger_auditoria_vehiculos
  AFTER INSERT OR UPDATE OR DELETE ON public.vehiculos
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_auditoria();

-- Auditoría en personal
CREATE TRIGGER trigger_auditoria_personal
  AFTER INSERT OR UPDATE OR DELETE ON public.personal
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_auditoria();

-- Auditoría en turnos
CREATE TRIGGER trigger_auditoria_turnos
  AFTER INSERT OR UPDATE OR DELETE ON public.turnos
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_auditoria();

-- Auditoría en asignaciones_turno
CREATE TRIGGER trigger_auditoria_asignaciones_turno
  AFTER INSERT OR UPDATE OR DELETE ON public.asignaciones_turno
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_auditoria();

-- Auditoría en movimientos_personal
CREATE TRIGGER trigger_auditoria_movimientos_personal
  AFTER INSERT OR UPDATE OR DELETE ON public.movimientos_personal
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_auditoria();

-- Auditoría en inspecciones
CREATE TRIGGER trigger_auditoria_inspecciones
  AFTER INSERT OR UPDATE OR DELETE ON public.inspecciones
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_auditoria();

-- Auditoría en eventos
CREATE TRIGGER trigger_auditoria_eventos
  AFTER INSERT OR UPDATE OR DELETE ON public.bitacora_eventos
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_auditoria();

-- Auditoría en cierres
CREATE TRIGGER trigger_auditoria_cierres
  AFTER INSERT OR UPDATE OR DELETE ON public.bitacora_cierres
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_auditoria();

-- ============================================
-- TRIGGER: registrar movimientos automáticos de personal
-- ============================================

-- Trigger para registrar movimientos automáticamente cuando cambia el estado
CREATE TRIGGER trigger_personal_registrar_movimiento
  AFTER INSERT OR UPDATE OF estado ON public.personal
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_movimiento_personal_auto();

COMMENT ON TRIGGER trigger_personal_registrar_movimiento ON public.personal IS
  'Registra automáticamente en movimientos_personal cuando se crea personal o cambia su estado';
