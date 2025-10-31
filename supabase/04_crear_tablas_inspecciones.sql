-- ============================================
-- TABLAS DE INSPECCIONES
-- ============================================
-- Gestión de inspecciones pre-operacionales
-- ============================================

-- ============================================
-- TABLA: inspecciones
-- ============================================

CREATE TABLE IF NOT EXISTS public.inspecciones (
  -- Identificación
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Referencias (ACTUALIZADAS: ahora usan perfiles en lugar de tablas separadas)
  vehiculo_id UUID NOT NULL REFERENCES public.vehiculos(id),
  operario_perfil_id UUID NOT NULL REFERENCES public.perfiles(id),
  auxiliar_perfil_id UUID REFERENCES public.perfiles(id),
  inspector_perfil_id UUID REFERENCES public.perfiles(id),

  -- Fecha y hora
  fecha DATE NOT NULL,
  hora TIME NOT NULL,

  -- Datos del operario (snapshot)
  nombre_operario TEXT NOT NULL,
  cedula_operario TEXT NOT NULL,

  -- Datos del auxiliar (snapshot)
  tiene_auxiliar BOOLEAN DEFAULT false,
  nombre_auxiliar TEXT,
  cedula_auxiliar TEXT,

  -- Datos del vehículo (snapshot)
  placa_vehiculo TEXT NOT NULL,
  marca_vehiculo TEXT,
  modelo_vehiculo TEXT,
  kilometraje NUMERIC(10,2),

  -- Datos del inspector (snapshot)
  nombre_inspector TEXT NOT NULL,
  cargo_inspector TEXT NOT NULL,
  documento_inspector TEXT NOT NULL,

  -- Resultado de la inspección
  es_apto BOOLEAN DEFAULT true,
  puntaje_total NUMERIC(5,2),
  items_verificados INTEGER DEFAULT 0,
  items_buenos INTEGER DEFAULT 0,
  items_regulares INTEGER DEFAULT 0,
  items_malos INTEGER DEFAULT 0,
  items_no_aplica INTEGER DEFAULT 0,

  -- Observaciones
  observaciones_generales TEXT,
  recomendaciones TEXT,
  acciones_correctivas TEXT,

  -- Firmas digitales
  firma_operario_data_url TEXT,
  firma_supervisor_data_url TEXT,

  -- Estado
  estado TEXT DEFAULT 'completada'
    CHECK (estado IN ('borrador', 'completada', 'cancelada')),

  -- Metadata
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por UUID NOT NULL REFERENCES public.perfiles(id),
  actualizado_por UUID REFERENCES public.perfiles(id)
);

COMMENT ON TABLE public.inspecciones IS
  'Inspecciones pre-operacionales de vehículos';

COMMENT ON COLUMN public.inspecciones.es_apto IS
  'Determina si el vehículo está apto para operar después de la inspección';

COMMENT ON COLUMN public.inspecciones.puntaje_total IS
  'Puntaje calculado basado en los items verificados';

-- Índices
CREATE INDEX idx_inspecciones_vehiculo_fecha ON public.inspecciones(vehiculo_id, fecha DESC);
CREATE INDEX idx_inspecciones_fecha ON public.inspecciones(fecha DESC);
CREATE INDEX idx_inspecciones_operario ON public.inspecciones(operario_perfil_id);
CREATE INDEX idx_inspecciones_inspector ON public.inspecciones(inspector_perfil_id);
CREATE INDEX idx_inspecciones_es_apto ON public.inspecciones(es_apto);
CREATE INDEX idx_inspecciones_estado ON public.inspecciones(estado);

-- ============================================
-- TABLA: items_inspeccion
-- ============================================

CREATE TABLE IF NOT EXISTS public.items_inspeccion (
  -- Identificación
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspeccion_id UUID NOT NULL REFERENCES public.inspecciones(id) ON DELETE CASCADE,

  -- Item
  item_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL
    CHECK (categoria IN ('documentacion', 'exterior', 'interior', 'mecanico', 'electrico', 'seguridad', 'herramientas')),

  -- Evaluación
  estado TEXT NOT NULL
    CHECK (estado IN ('bueno', 'regular', 'malo', 'no_aplica')),
  puntuacion NUMERIC(3,1),
  observacion TEXT,

  -- Criticidad
  es_critico BOOLEAN DEFAULT false,
  requiere_atencion BOOLEAN DEFAULT false,
  prioridad TEXT CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')),

  -- Metadata
  orden INTEGER DEFAULT 0,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.items_inspeccion IS
  'Items individuales verificados en cada inspección';

COMMENT ON COLUMN public.items_inspeccion.es_critico IS
  'Indica si el item es crítico para la operación del vehículo';

COMMENT ON COLUMN public.items_inspeccion.requiere_atencion IS
  'Indica si el item requiere atención inmediata';

-- Índices
CREATE INDEX idx_items_inspeccion_id ON public.items_inspeccion(inspeccion_id);
CREATE INDEX idx_items_categoria ON public.items_inspeccion(categoria);
CREATE INDEX idx_items_estado ON public.items_inspeccion(estado);
CREATE INDEX idx_items_requiere_atencion ON public.items_inspeccion(requiere_atencion) WHERE requiere_atencion = true;

-- ============================================
-- TABLA: fotos_inspeccion
-- ============================================

CREATE TABLE IF NOT EXISTS public.fotos_inspeccion (
  -- Identificación
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspeccion_id UUID NOT NULL REFERENCES public.inspecciones(id) ON DELETE CASCADE,

  -- Archivo
  url_foto TEXT NOT NULL,
  nombre_archivo TEXT,
  tipo_mime TEXT,
  tamaño_bytes BIGINT,

  -- Metadata
  descripcion TEXT,
  categoria TEXT CHECK (categoria IN ('general', 'daño', 'documentacion', 'otro')),
  item_relacionado_id UUID REFERENCES public.items_inspeccion(id),

  -- Ubicación
  latitud NUMERIC(10,8),
  longitud NUMERIC(11,8),

  -- Auditoría
  subido_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subido_por UUID NOT NULL REFERENCES public.perfiles(id)
);

COMMENT ON TABLE public.fotos_inspeccion IS
  'Evidencias fotográficas de las inspecciones';

-- Índices
CREATE INDEX idx_fotos_inspeccion_id ON public.fotos_inspeccion(inspeccion_id);
CREATE INDEX idx_fotos_categoria ON public.fotos_inspeccion(categoria);
CREATE INDEX idx_fotos_item_relacionado ON public.fotos_inspeccion(item_relacionado_id);

-- ============================================
-- FUNCIÓN: calcular estadísticas de inspección
-- ============================================

CREATE OR REPLACE FUNCTION public.calcular_estadisticas_inspeccion()
RETURNS TRIGGER AS $$
DECLARE
  rec RECORD;
BEGIN
  -- Obtener contadores de items
  SELECT
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE estado = 'bueno') as buenos,
    COUNT(*) FILTER (WHERE estado = 'regular') as regulares,
    COUNT(*) FILTER (WHERE estado = 'malo') as malos,
    COUNT(*) FILTER (WHERE estado = 'no_aplica') as no_aplica
  INTO rec
  FROM public.items_inspeccion
  WHERE inspeccion_id = NEW.id;

  -- Actualizar contadores
  NEW.items_verificados = rec.total;
  NEW.items_buenos = rec.buenos;
  NEW.items_regulares = rec.regulares;
  NEW.items_malos = rec.malos;
  NEW.items_no_aplica = rec.no_aplica;

  -- Calcular puntaje (bueno=100, regular=50, malo=0, no_aplica se excluye)
  IF (rec.total - rec.no_aplica) > 0 THEN
    NEW.puntaje_total = ((rec.buenos * 100.0) + (rec.regulares * 50.0)) / (rec.total - rec.no_aplica);
  ELSE
    NEW.puntaje_total = 100;
  END IF;

  -- Determinar si es apto (si hay items malos críticos, no es apto)
  IF EXISTS (
    SELECT 1
    FROM public.items_inspeccion
    WHERE inspeccion_id = NEW.id
      AND estado = 'malo'
      AND es_critico = true
  ) THEN
    NEW.es_apto = false;
  ELSIF NEW.puntaje_total < 70 THEN
    NEW.es_apto = false;
  ELSE
    NEW.es_apto = true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIÓN: actualizar estadísticas al modificar items
-- ============================================

CREATE OR REPLACE FUNCTION public.actualizar_estadisticas_inspeccion_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar la inspección recalculando estadísticas
  UPDATE public.inspecciones
  SET actualizado_en = NOW()
  WHERE id = COALESCE(NEW.inspeccion_id, OLD.inspeccion_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger en items para actualizar inspección
CREATE TRIGGER trigger_items_actualizar_inspeccion
  AFTER INSERT OR UPDATE OR DELETE ON public.items_inspeccion
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_estadisticas_inspeccion_trigger();

-- ============================================
-- TRIGGERS: actualizar updated_at
-- ============================================

CREATE TRIGGER trigger_inspecciones_actualizar_updated_at
  BEFORE UPDATE ON public.inspecciones
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_updated_at();

-- Trigger para calcular estadísticas antes de actualizar
CREATE TRIGGER trigger_inspecciones_calcular_estadisticas
  BEFORE UPDATE ON public.inspecciones
  FOR EACH ROW
  EXECUTE FUNCTION public.calcular_estadisticas_inspeccion();
