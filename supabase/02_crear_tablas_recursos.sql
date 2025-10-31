-- ============================================
-- TABLAS DE RECURSOS
-- ============================================
-- Gestión de recursos de la empresa:
-- - Vehículos de la flota
-- - Roles operativos (operario, auxiliar, inspector) vinculados a perfiles
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
-- TABLA: roles_operativos
-- ============================================
-- Los usuarios del sistema (perfiles) pueden tener roles operativos
-- Un usuario puede ser operario, auxiliar, inspector o combinaciones

CREATE TABLE IF NOT EXISTS public.roles_operativos (
  -- Identificación
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,

  -- Tipo de rol operativo
  rol TEXT NOT NULL CHECK (rol IN ('operario', 'auxiliar', 'inspector')),

  -- Datos específicos para operarios (solo si rol = 'operario')
  licencia_conduccion TEXT,
  categoria_licencia TEXT CHECK (categoria_licencia IN ('A1', 'A2', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3')),
  licencia_vencimiento DATE,

  -- Estado
  activo BOOLEAN DEFAULT true,
  fecha_inicio DATE DEFAULT CURRENT_DATE,
  fecha_fin DATE,
  motivo_inactivacion TEXT,

  -- Metadata
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por UUID REFERENCES public.perfiles(id),
  actualizado_por UUID REFERENCES public.perfiles(id),

  -- Un usuario no puede tener el mismo rol duplicado
  UNIQUE(perfil_id, rol)
);

COMMENT ON TABLE public.roles_operativos IS
  'Roles operativos asignados a usuarios. Un usuario puede ser operario (conductor), auxiliar (ayudante), inspector o combinaciones.';

COMMENT ON COLUMN public.roles_operativos.rol IS
  'Tipo de rol: operario (conductor con licencia), auxiliar (ayudante sin licencia), inspector (realiza inspecciones)';

COMMENT ON COLUMN public.roles_operativos.licencia_conduccion IS
  'Número de licencia de conducción (solo para operarios)';

-- Índices
CREATE INDEX idx_roles_operativos_perfil ON public.roles_operativos(perfil_id);
CREATE INDEX idx_roles_operativos_rol ON public.roles_operativos(rol);
CREATE INDEX idx_roles_operativos_activo ON public.roles_operativos(activo) WHERE activo = true;
CREATE INDEX idx_roles_operativos_licencia_vencimiento ON public.roles_operativos(licencia_vencimiento) WHERE rol = 'operario';

-- ============================================
-- TRIGGERS: actualizar updated_at
-- ============================================

CREATE TRIGGER trigger_vehiculos_actualizar_updated_at
  BEFORE UPDATE ON public.vehiculos
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_updated_at();

CREATE TRIGGER trigger_roles_operativos_actualizar_updated_at
  BEFORE UPDATE ON public.roles_operativos
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_updated_at();
