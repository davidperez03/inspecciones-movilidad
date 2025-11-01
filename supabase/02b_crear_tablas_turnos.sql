-- ============================================
-- TABLAS DE GESTIÓN DE TURNOS
-- ============================================
-- Sistema de turnos para operarios y auxiliares
-- ============================================

-- ============================================
-- TABLA: turnos
-- ============================================

CREATE TABLE IF NOT EXISTS public.turnos (
  -- Identificación
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Información del turno
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,

  -- Horarios
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,

  -- Configuración
  duracion_horas DECIMAL(4,2),
  es_nocturno BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,

  -- Días de la semana (array de números: 0=domingo, 1=lunes, ..., 6=sábado)
  dias_semana INTEGER[] DEFAULT '{1,2,3,4,5}', -- Lunes a viernes por defecto

  -- Metadata
  color TEXT, -- Color para visualización en calendario (ej: '#3b82f6')
  orden INTEGER DEFAULT 0, -- Orden de visualización
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por UUID REFERENCES public.perfiles(id),
  actualizado_por UUID REFERENCES public.perfiles(id)
);

COMMENT ON TABLE public.turnos IS
  'Catálogo de turnos de trabajo para operarios y auxiliares';

COMMENT ON COLUMN public.turnos.dias_semana IS
  'Array de días: 0=domingo, 1=lunes, 2=martes, 3=miércoles, 4=jueves, 5=viernes, 6=sábado';

COMMENT ON COLUMN public.turnos.color IS
  'Color hexadecimal para visualización en calendario (ej: #3b82f6, #f59e0b)';

-- Índices
CREATE INDEX idx_turnos_activo ON public.turnos(activo) WHERE activo = true;
CREATE INDEX idx_turnos_nombre ON public.turnos(nombre);
CREATE INDEX idx_turnos_orden ON public.turnos(orden);

-- ============================================
-- TABLA: asignaciones_turno
-- ============================================

CREATE TABLE IF NOT EXISTS public.asignaciones_turno (
  -- Identificación
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referencias
  personal_id UUID NOT NULL REFERENCES public.personal(id) ON DELETE CASCADE,
  turno_id UUID NOT NULL REFERENCES public.turnos(id) ON DELETE CASCADE,

  -- Vigencia
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin DATE, -- NULL = indefinido

  -- Estado
  activo BOOLEAN DEFAULT true,

  -- Metadata
  observaciones TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por UUID REFERENCES public.perfiles(id),
  actualizado_por UUID REFERENCES public.perfiles(id),

  -- Restricción: no puede tener dos turnos activos que se solapen en fechas
  EXCLUDE USING gist (
    personal_id WITH =,
    daterange(fecha_inicio, COALESCE(fecha_fin, '9999-12-31'::date), '[]') WITH &&
  ) WHERE (activo = true)
);

COMMENT ON TABLE public.asignaciones_turno IS
  'Asignación de personal (operarios y auxiliares) a turnos de trabajo';

COMMENT ON COLUMN public.asignaciones_turno.fecha_fin IS
  'Fecha fin de la asignación. NULL = asignación indefinida';

COMMENT ON COLUMN public.asignaciones_turno.activo IS
  'Indica si la asignación está activa. Solo puede tener una asignación activa por persona en fechas que se solapen.';

-- Índices
CREATE INDEX idx_asignaciones_personal ON public.asignaciones_turno(personal_id);
CREATE INDEX idx_asignaciones_turno ON public.asignaciones_turno(turno_id);
CREATE INDEX idx_asignaciones_activas ON public.asignaciones_turno(activo) WHERE activo = true;
CREATE INDEX idx_asignaciones_vigentes ON public.asignaciones_turno(fecha_inicio, fecha_fin)
  WHERE activo = true;

-- ============================================
-- TRIGGERS: actualizar updated_at
-- ============================================

CREATE TRIGGER trigger_turnos_actualizar_updated_at
  BEFORE UPDATE ON public.turnos
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_updated_at();

CREATE TRIGGER trigger_asignaciones_turno_actualizar_updated_at
  BEFORE UPDATE ON public.asignaciones_turno
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_updated_at();

-- ============================================
-- DATOS INICIALES: Turnos predeterminados
-- ============================================

INSERT INTO public.turnos (nombre, descripcion, hora_inicio, hora_fin, duracion_horas, es_nocturno, dias_semana, color, orden)
VALUES
  ('Diurno', 'Turno diurno estándar', '06:00', '14:00', 8, false, '{1,2,3,4,5}', '#3b82f6', 1),
  ('Tarde', 'Turno de tarde', '14:00', '22:00', 8, false, '{1,2,3,4,5}', '#f59e0b', 2),
  ('Nocturno', 'Turno nocturno', '22:00', '06:00', 8, true, '{1,2,3,4,5}', '#6366f1', 3),
  ('Mixto Mañana', 'Turno mixto mañana-tarde', '08:00', '17:00', 9, false, '{1,2,3,4,5}', '#10b981', 4),
  ('Fin de semana', 'Turno fin de semana', '08:00', '17:00', 9, false, '{0,6}', '#ef4444', 5)
ON CONFLICT (nombre) DO NOTHING;

COMMENT ON TABLE public.turnos IS
  'Catálogo de turnos. Datos iniciales insertados: Diurno, Tarde, Nocturno, Mixto Mañana, Fin de semana';
