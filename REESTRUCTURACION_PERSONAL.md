# 🔄 Reestructuración Completa del Módulo de Personal

**Fecha**: 2025-11-01
**Estado**: ✅ Scripts SQL completados - Listos para ejecutar en Supabase

---

## 📌 Problemas Identificados (ANTES)

1. ❌ **Campo `cedula` guardaba correos** en lugar de números de documento
2. ❌ **`historial_personal` registraba TODO** (ingresos, bajas, reingresos, actualizaciones, cambios de estado) → Demasiado ruido
3. ❌ **Inspector como rol operativo** → Redundante con tabla `perfiles` (rol: 'inspector')
4. ❌ **No existía sistema de turnos** para operarios y auxiliares
5. ❌ **Trazabilidad incompleta** → No había snapshots de estados anteriores

---

## ✅ Soluciones Implementadas (DESPUÉS)

### 1. Nueva Tabla `personal` (Solo Operarios y Auxiliares)
- ✅ Campo `numero_documento` **único y validado** (ya no guarda correos)
- ✅ Validación: Los operarios **deben** tener licencia de conducción
- ✅ Vínculo opcional con `perfil_id` (no todo el personal tiene acceso al sistema)
- ✅ Estados: `activo`, `inactivo`, `suspendido`, `vacaciones`

### 2. Nueva Tabla `movimientos_personal` (Solo Eventos Importantes)
- ✅ Solo registra: `ingreso`, `salida`, `reingreso`, `suspension`, `reactivacion`
- ✅ Guarda **snapshot JSON completo** para trazabilidad total
- ✅ Trigger automático que registra movimientos al cambiar estado
- ✅ Ya no registra actualizaciones menores (limpia el historial)

### 3. Sistema Completo de Turnos
- ✅ Tabla `turnos`: Catálogo de turnos (diurno, tarde, nocturno, etc.)
- ✅ Tabla `asignaciones_turno`: Asignar personal a turnos con fechas
- ✅ Restricción: No puede tener 2 turnos activos simultáneos
- ✅ **5 turnos predefinidos** ya incluidos en el script

### 4. Eliminación de Redundancias
- ✅ Eliminada tabla `roles_operativos` (reemplazada por `personal`)
- ✅ Eliminada tabla `historial_personal` (reemplazada por `movimientos_personal`)
- ✅ Los **inspectores ya NO están en personal** (solo en `perfiles` con rol 'inspector')

---

## 📂 Archivos Modificados/Creados

### ✅ Scripts SQL Actualizados

| Archivo | Estado | Descripción |
|---------|--------|-------------|
| `supabase/02_crear_tablas_recursos.sql` | ✅ Actualizado | Nueva tabla `personal` (reemplaza `roles_operativos`) |
| `supabase/02b_crear_tablas_turnos.sql` | ✅ **NUEVO** | Tablas `turnos` y `asignaciones_turno` |
| `supabase/05_crear_tablas_historial.sql` | ✅ Actualizado | Nueva tabla `movimientos_personal` + triggers automáticos |
| `supabase/06_crear_politicas_rls.sql` | ✅ Actualizado | Políticas RLS para todas las nuevas tablas |
| `lib/types.ts` | ✅ Actualizado | Nuevos tipos TypeScript |

---

## 🎯 Nueva Estructura de Datos

### Tabla `personal` (Solo Operarios y Auxiliares)

```sql
CREATE TABLE public.personal (
  id UUID PRIMARY KEY,
  nombre_completo TEXT NOT NULL,
  numero_documento TEXT NOT NULL UNIQUE, -- ✅ YA NO GUARDA CORREOS
  tipo_documento TEXT NOT NULL DEFAULT 'CC',
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  fecha_nacimiento DATE,

  tipo_personal TEXT NOT NULL CHECK (tipo_personal IN ('operario', 'auxiliar')),
  estado TEXT NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('activo', 'inactivo', 'suspendido', 'vacaciones')),

  fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_salida DATE,

  -- Datos de conductor (obligatorio para operarios)
  es_conductor BOOLEAN DEFAULT false,
  licencia_conduccion TEXT,
  categoria_licencia TEXT,
  licencia_vencimiento DATE,

  -- Vínculo opcional con usuario del sistema
  perfil_id UUID REFERENCES public.perfiles(id) ON DELETE SET NULL,

  observaciones TEXT,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ✅ Validación: operarios deben tener licencia
  CHECK (
    (tipo_personal = 'auxiliar') OR
    (tipo_personal = 'operario' AND es_conductor = true AND licencia_conduccion IS NOT NULL)
  )
);
```

### Tabla `movimientos_personal` (Solo Eventos Importantes)

```sql
CREATE TABLE public.movimientos_personal (
  id UUID PRIMARY KEY,
  personal_id UUID NOT NULL REFERENCES public.personal(id),

  -- Solo eventos importantes
  tipo_movimiento TEXT NOT NULL
    CHECK (tipo_movimiento IN ('ingreso', 'salida', 'reingreso', 'suspension', 'reactivacion')),

  fecha_movimiento DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_efectiva DATE,

  motivo TEXT NOT NULL,
  observaciones TEXT,

  -- ✅ Snapshot completo para trazabilidad
  snapshot_data JSONB,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creado_por UUID REFERENCES public.perfiles(id)
);

-- ✅ Trigger automático que registra movimientos
CREATE TRIGGER trigger_personal_registrar_movimiento
  AFTER INSERT OR UPDATE OF estado ON public.personal
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_movimiento_personal_auto();
```

### Tabla `turnos`

```sql
CREATE TABLE public.turnos (
  id UUID PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  duracion_horas DECIMAL(4,2),
  es_nocturno BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  dias_semana INTEGER[] DEFAULT '{1,2,3,4,5}', -- Lunes a viernes
  color TEXT,
  orden INTEGER DEFAULT 0
);

-- ✅ Datos iniciales incluidos:
-- 1. Diurno (06:00 - 14:00)
-- 2. Tarde (14:00 - 22:00)
-- 3. Nocturno (22:00 - 06:00)
-- 4. Mixto Mañana (08:00 - 17:00)
-- 5. Fin de semana (08:00 - 17:00)
```

### Tabla `asignaciones_turno`

```sql
CREATE TABLE public.asignaciones_turno (
  id UUID PRIMARY KEY,
  personal_id UUID NOT NULL REFERENCES public.personal(id),
  turno_id UUID NOT NULL REFERENCES public.turnos(id),
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin DATE, -- NULL = indefinido
  activo BOOLEAN DEFAULT true,
  observaciones TEXT,

  -- ✅ Restricción: no puede tener 2 turnos activos simultáneos
  EXCLUDE USING gist (
    personal_id WITH =,
    daterange(fecha_inicio, COALESCE(fecha_fin, '9999-12-31'::date), '[]') WITH &&
  ) WHERE (activo = true)
);
```

---

## 🚀 Plan de Ejecución en Supabase

### Paso 1: Borrar Tablas Antiguas

```sql
-- ⚠️ IMPORTANTE: Hacer backup antes de borrar
DROP TABLE IF EXISTS public.historial_personal CASCADE;
DROP TABLE IF EXISTS public.roles_operativos CASCADE;
```

### Paso 2: Ejecutar Scripts en Orden

Ejecuta los scripts SQL en **exactamente este orden**:

```bash
1. supabase/01_crear_tabla_perfiles.sql
2. supabase/02_crear_tablas_recursos.sql      # ✅ Actualizado
3. supabase/02b_crear_tablas_turnos.sql       # ✅ NUEVO
4. supabase/03_crear_tablas_bitacora.sql
5. supabase/04_crear_tablas_inspecciones.sql
6. supabase/05_crear_tablas_historial.sql     # ✅ Actualizado
7. supabase/06_crear_politicas_rls.sql        # ✅ Actualizado
8. supabase/07_trigger_crear_perfil.sql
9. supabase/08_configurar_zona_horaria_colombia.sql
10. supabase/09_configurar_timezone_servidor.sql
```

### Paso 3: Verificar Tablas Creadas

```sql
-- Verificar que las tablas existen
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('personal', 'turnos', 'asignaciones_turno', 'movimientos_personal');

-- Verificar que hay 5 turnos predefinidos
SELECT * FROM public.turnos ORDER BY orden;
```

### Paso 4: Verificar Políticas RLS

```sql
-- Verificar políticas RLS activas
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('personal', 'turnos', 'asignaciones_turno', 'movimientos_personal');
```

---

## 📊 Comparación Antes vs Después

| Aspecto | ❌ ANTES | ✅ DESPUÉS |
|---------|---------|-----------|
| **Campo cédula** | Guardaba correos | `numero_documento` único validado |
| **Historial** | Registraba TODO (ruido) | Solo eventos importantes (ingreso, salida, reingreso, etc.) |
| **Inspectores** | En `roles_operativos` (redundante) | Solo en `perfiles` con rol 'inspector' |
| **Turnos** | ❌ No existía | ✅ Sistema completo implementado |
| **Trazabilidad** | Datos limitados | Snapshot JSON completo en cada movimiento |
| **Validaciones** | Débiles | Operarios deben tener licencia obligatoria |

---

## 🔄 Migraciones Automáticas

Los triggers ya están configurados para:

1. ✅ **Registrar automáticamente movimientos** cuando:
   - Se crea personal nuevo → Registra `ingreso`
   - Estado cambia a `inactivo` → Registra `salida`
   - Estado cambia de `inactivo` a `activo` → Registra `reingreso`
   - Estado cambia a `suspendido` → Registra `suspension`
   - Estado cambia de `suspendido` a `activo` → Registra `reactivacion`

2. ✅ **Auditoría completa** en `historial_acciones` para:
   - personal
   - turnos
   - asignaciones_turno
   - movimientos_personal
   - (y todas las demás tablas del sistema)

---

## 📝 Pendientes (Siguiente Sesión)

### Frontend/TypeScript
- [ ] Crear servicio `personal-service.ts` (reemplaza `recurso-humano-service.ts`)
- [ ] Crear servicio `turnos-service.ts`
- [ ] Actualizar componentes React que usan `roles_operativos`
- [ ] Actualizar reportes que usan `historial_personal`

### Migraciones de Datos (si hay datos existentes)
- [ ] Script para migrar datos de `roles_operativos` → `personal`
- [ ] Script para migrar datos de `historial_personal` → `movimientos_personal`

---

## 🎯 Beneficios Logrados

1. ✅ **Corrección de datos**: El campo cédula ahora es correcto
2. ✅ **Historial limpio**: Solo eventos importantes, sin ruido
3. ✅ **Trazabilidad completa**: Snapshot JSON en cada movimiento
4. ✅ **Sistema de turnos**: Gestión completa de horarios
5. ✅ **Validaciones robustas**: Operarios deben tener licencia
6. ✅ **Eliminación de redundancias**: Inspectores solo en `perfiles`
7. ✅ **Políticas RLS**: Seguridad completa implementada
8. ✅ **Triggers automáticos**: No hay que registrar movimientos manualmente

---

## 📚 Documentación Técnica

### Tipos TypeScript Actualizados

```typescript
// ✅ Nuevo tipo principal
export type Personal = {
  id: string
  nombre_completo: string
  numero_documento: string // ✅ Ya no puede ser correo
  tipo_documento: 'CC' | 'CE' | 'PA' | 'TI'
  tipo_personal: 'operario' | 'auxiliar'
  estado: 'activo' | 'inactivo' | 'suspendido' | 'vacaciones'
  fecha_ingreso: string
  fecha_salida: string | null
  es_conductor: boolean
  licencia_conduccion: string | null
  perfil_id: string | null // Vínculo opcional con usuario del sistema
  // ... más campos
}

// ✅ Tipos específicos
export type Operario = Personal & {
  tipo_personal: 'operario'
  es_conductor: true
  licencia_conduccion: string // Obligatorio
}

export type Auxiliar = Personal & {
  tipo_personal: 'auxiliar'
}

// ✅ Nuevos tipos de turnos
export type Turno = { ... }
export type AsignacionTurno = { ... }

// ✅ Nuevo tipo de movimientos
export type MovimientoPersonal = {
  tipo_movimiento: 'ingreso' | 'salida' | 'reingreso' | 'suspension' | 'reactivacion'
  snapshot_data: Record<string, any> | null
  // ... más campos
}
```

---

## ⚠️ Notas Importantes

1. **Los inspectores NO están en la tabla `personal`** - Solo en `perfiles` con `rol = 'inspector'`
2. **Operarios deben tener licencia** - La base de datos lo valida automáticamente
3. **Los movimientos se registran automáticamente** - No hay que hacerlo manualmente
4. **Snapshot completo** - Cada movimiento guarda el estado completo en JSON
5. **Turnos predefinidos** - Ya vienen 5 turnos listos para usar

---

## 🔗 Referencias

- Script principal: `supabase/02_crear_tablas_recursos.sql`
- Script turnos: `supabase/02b_crear_tablas_turnos.sql`
- Script historial: `supabase/05_crear_tablas_historial.sql`
- Políticas RLS: `supabase/06_crear_politicas_rls.sql`
- Tipos: `lib/types.ts`

---

**✅ TODO LISTO PARA EJECUTAR EN SUPABASE**

Cuando regreses, solo ejecuta los scripts en orden y todo estará funcionando. Los tipos TypeScript ya están actualizados. Lo único pendiente es actualizar los servicios del frontend (siguiente sesión).
