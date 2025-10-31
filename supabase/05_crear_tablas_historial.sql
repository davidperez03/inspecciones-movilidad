-- ============================================
-- TABLAS DE HISTORIAL Y AUDITORÍA
-- ============================================
-- Registro de cambios y movimientos
-- ============================================

-- ============================================
-- TABLA: historial_personal
-- ============================================

CREATE TABLE IF NOT EXISTS public.historial_personal (
  -- Identificación
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referencias
  personal_id UUID NOT NULL,
  tipo_personal TEXT NOT NULL
    CHECK (tipo_personal IN ('operario', 'auxiliar', 'inspector')),

  -- Datos del personal (snapshot)
  nombre TEXT NOT NULL,
  cedula TEXT NOT NULL,

  -- Movimiento
  tipo_movimiento TEXT NOT NULL
    CHECK (tipo_movimiento IN ('ingreso', 'baja', 'reingreso', 'actualizacion', 'cambio_estado')),
  fecha_movimiento DATE NOT NULL,
  motivo TEXT,
  observaciones TEXT,

  -- Estado en el momento
  estado_activo BOOLEAN NOT NULL,

  -- Datos de conductor (si aplica)
  es_conductor BOOLEAN DEFAULT false,
  licencia_conduccion TEXT,
  categoria_licencia TEXT,
  licencia_vencimiento DATE,

  -- Metadata
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por UUID REFERENCES public.perfiles(id)
);

COMMENT ON TABLE public.historial_personal IS
  'Historial completo de movimientos de operarios, auxiliares e inspectores';

COMMENT ON COLUMN public.historial_personal.tipo_movimiento IS
  'Tipo de movimiento: ingreso, baja, reingreso, actualizacion, cambio_estado';

-- Índices
CREATE INDEX idx_historial_personal_fecha ON public.historial_personal(personal_id, fecha_movimiento DESC);
CREATE INDEX idx_historial_tipo_personal ON public.historial_personal(tipo_personal);
CREATE INDEX idx_historial_tipo_movimiento ON public.historial_personal(tipo_movimiento);
CREATE INDEX idx_historial_fecha_movimiento ON public.historial_personal(fecha_movimiento DESC);

-- ============================================
-- TABLA: historial_acciones (Auditoría)
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
-- FUNCIÓN: registrar auditoría
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

-- ============================================
-- FUNCIÓN: registrar movimiento de personal
-- ============================================

CREATE OR REPLACE FUNCTION public.registrar_movimiento_personal()
RETURNS TRIGGER AS $$
DECLARE
  tipo_mov TEXT;
  usuario_actual UUID;
  perfil_data RECORD;
BEGIN
  usuario_actual := COALESCE(
    current_setting('app.current_user_id', true)::uuid,
    auth.uid()
  );

  -- Obtener datos del perfil relacionado
  SELECT
    id,
    nombre_completo,
    correo
  INTO perfil_data
  FROM public.perfiles
  WHERE id = NEW.perfil_id;

  -- Determinar tipo de movimiento
  IF (TG_OP = 'INSERT') THEN
    tipo_mov := 'ingreso';
  ELSIF (TG_OP = 'UPDATE') THEN
    IF (OLD.activo = true AND NEW.activo = false) THEN
      tipo_mov := 'baja';
    ELSIF (OLD.activo = false AND NEW.activo = true) THEN
      tipo_mov := 'reingreso';
    ELSE
      tipo_mov := 'actualizacion';
    END IF;
  END IF;

  -- Insertar en historial
  INSERT INTO public.historial_personal (
    personal_id,
    tipo_personal,
    nombre,
    cedula,
    tipo_movimiento,
    fecha_movimiento,
    motivo,
    estado_activo,
    es_conductor,
    licencia_conduccion,
    categoria_licencia,
    licencia_vencimiento,
    creado_por
  ) VALUES (
    NEW.perfil_id,
    NEW.rol, -- operario, auxiliar, inspector
    perfil_data.nombre_completo,
    COALESCE(perfil_data.correo, 'N/A'), -- usamos correo como identificador
    tipo_mov,
    CURRENT_DATE,
    CASE
      WHEN NEW.activo = false THEN NEW.motivo_inactivacion
      ELSE NULL
    END,
    NEW.activo,
    CASE WHEN NEW.rol = 'operario' THEN true ELSE false END, -- solo operarios son conductores
    NEW.licencia_conduccion,
    NEW.categoria_licencia,
    NEW.licencia_vencimiento,
    usuario_actual
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS DE AUDITORÍA
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

-- Auditoría en roles operativos
CREATE TRIGGER trigger_auditoria_roles_operativos
  AFTER INSERT OR UPDATE OR DELETE ON public.roles_operativos
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
-- TRIGGERS DE HISTORIAL DE PERSONAL
-- ============================================
-- NOTA: Los triggers de historial de personal se crean en roles_operativos
-- cuando se modifica el estado activo de un rol operativo

-- Historial de roles operativos
CREATE TRIGGER trigger_historial_roles_operativos
  AFTER INSERT OR UPDATE ON public.roles_operativos
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_movimiento_personal();
