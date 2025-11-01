-- ============================================
-- TABLAS DE RECURSOS
-- ============================================
-- Gestión de recursos de la empresa:
-- - Vehículos de la flota
-- - Personal operativo (SOLO operarios y auxiliares)
-- ============================================
-- NOTA: Los inspectores NO están aquí, ya están en la tabla perfiles
-- con rol 'inspector' del sistema
-- ============================================

-- ============================================
-- TABLA: vehiculos
-- ============================================

CREATE TABLE IF NOT EXISTS public.vehiculos (
  -- Identificación
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa TEXT NOT NULL UNIQUE,

  -- Información del vehículo
  marca TEXT,
  modelo TEXT,
  tipo TEXT DEFAULT 'GRÚA DE PLATAFORMA' CHECK (tipo = 'GRÚA DE PLATAFORMA'),

  -- Estado
  activo BOOLEAN NOT NULL DEFAULT true,

  -- Documentación
  soat_vencimiento DATE,
  tecnomecanica_vencimiento DATE,
  soat_aseguradora TEXT,
  numero_poliza_soat TEXT,

  -- Metadata
  observaciones TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por UUID REFERENCES public.perfiles(id),
  actualizado_por UUID REFERENCES public.perfiles(id)
);

COMMENT ON TABLE public.vehiculos IS 'Flota de vehículos de la empresa';

CREATE INDEX idx_vehiculos_activos ON public.vehiculos(activo) WHERE activo = true;
CREATE INDEX idx_vehiculos_placa ON public.vehiculos(placa);
CREATE INDEX idx_vehiculos_soat_vencimiento ON public.vehiculos(soat_vencimiento);
CREATE INDEX idx_vehiculos_tecnomecanica_vencimiento ON public.vehiculos(tecnomecanica_vencimiento);

-- ============================================
-- TABLA: personal
-- ============================================
-- SOLO para operarios y auxiliares (personal operativo de campo)
-- Los inspectores están en la tabla perfiles con rol 'inspector'

CREATE TABLE IF NOT EXISTS public.personal (
  -- Identificación
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Datos personales
  nombre_completo TEXT NOT NULL,
  numero_documento TEXT NOT NULL UNIQUE,
  tipo_documento TEXT NOT NULL DEFAULT 'CC'
    CHECK (tipo_documento IN ('CC', 'CE', 'PA', 'TI')),
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  fecha_nacimiento DATE,

  -- Tipo de personal (SOLO operarios y auxiliares)
  tipo_personal TEXT NOT NULL
    CHECK (tipo_personal IN ('operario', 'auxiliar')),

  -- Estado laboral
  estado TEXT NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'inactivo', 'suspendido', 'vacaciones')),

  -- Fechas de vinculación
  fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_salida DATE,

  -- Datos de conductor (obligatorio para operarios, opcional para auxiliares)
  es_conductor BOOLEAN DEFAULT false,
  licencia_conduccion TEXT,
  categoria_licencia TEXT
    CHECK (categoria_licencia IN ('A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3')),
  licencia_vencimiento DATE,

  -- Vínculo con usuario del sistema (opcional)
  -- Un operario/auxiliar puede tener acceso al sistema o no
  perfil_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,

  -- Metadata
  observaciones TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por UUID REFERENCES public.perfiles(id),
  actualizado_por UUID REFERENCES public.perfiles(id),

  -- Validación: si es operario, debe tener datos de conductor
  CHECK (
    (tipo_personal = 'auxiliar') OR
    (tipo_personal = 'operario' AND es_conductor = true AND licencia_conduccion IS NOT NULL)
  )
);

COMMENT ON TABLE public.personal IS
  'Personal operativo: SOLO operarios (conductores) y auxiliares (ayudantes). Los inspectores están en la tabla perfiles.';

COMMENT ON COLUMN public.personal.numero_documento IS
  'Número de cédula o documento de identidad - ÚNICO';

COMMENT ON COLUMN public.personal.tipo_personal IS
  'Tipo: operario (conductor con licencia obligatoria) o auxiliar (ayudante, licencia opcional)';

COMMENT ON COLUMN public.personal.estado IS
  'Estado laboral actual: activo, inactivo, suspendido, vacaciones';

COMMENT ON COLUMN public.personal.perfil_id IS
  'Referencia opcional al perfil de usuario del sistema. No todo el personal operativo tiene acceso al sistema.';

COMMENT ON COLUMN public.personal.es_conductor IS
  'Indica si tiene licencia de conducción. Obligatorio TRUE para operarios, opcional para auxiliares.';

-- Índices
CREATE UNIQUE INDEX idx_personal_numero_documento ON public.personal(numero_documento);
CREATE INDEX idx_personal_tipo ON public.personal(tipo_personal);
CREATE INDEX idx_personal_estado ON public.personal(estado);
CREATE INDEX idx_personal_activo ON public.personal(estado) WHERE estado = 'activo';
CREATE INDEX idx_personal_perfil ON public.personal(perfil_id) WHERE perfil_id IS NOT NULL;
CREATE INDEX idx_personal_licencia_vencimiento ON public.personal(licencia_vencimiento)
  WHERE es_conductor = true AND licencia_vencimiento IS NOT NULL;
CREATE INDEX idx_personal_fecha_ingreso ON public.personal(fecha_ingreso DESC);
CREATE INDEX idx_personal_nombre ON public.personal(nombre_completo);

-- ============================================
-- TRIGGERS: actualizar updated_at
-- ============================================

CREATE TRIGGER trigger_vehiculos_actualizar_updated_at
  BEFORE UPDATE ON public.vehiculos
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_updated_at();

CREATE TRIGGER trigger_personal_actualizar_updated_at
  BEFORE UPDATE ON public.personal
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_updated_at();
