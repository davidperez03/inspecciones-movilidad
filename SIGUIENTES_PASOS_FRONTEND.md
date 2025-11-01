# 🎯 Siguientes Pasos: Adaptar Frontend al Nuevo Módulo de Personal

**Fecha**: 2025-11-01
**Prerequisito**: ✅ Scripts SQL ejecutados en Supabase (ver `REESTRUCTURACION_PERSONAL.md`)

---

## 📋 Checklist de Tareas Pendientes

### 1️⃣ Servicios TypeScript (Alta Prioridad)

#### ✅ Archivos a Crear

- [ ] **`lib/personal-service.ts`** - Servicio principal para gestión de personal (operarios y auxiliares)
  - Crear personal
  - Listar personal activo/inactivo
  - Actualizar datos de personal
  - Cambiar estado (activar, inactivar, suspender)
  - Buscar por cédula/nombre
  - Validar licencias vencidas

- [ ] **`lib/turnos-service.ts`** - Servicio para gestión de turnos
  - Listar turnos activos
  - Crear/editar/eliminar turnos
  - Asignar turnos a personal
  - Consultar asignaciones vigentes
  - Obtener personal por turno

- [ ] **`lib/movimientos-personal-service.ts`** - Servicio para historial de movimientos
  - Consultar movimientos de un personal
  - Registrar movimientos manuales (opcional, ya hay trigger)
  - Estadísticas de movimientos
  - Reportes de ingresos/salidas por período

#### ❌ Archivos a Deprecar/Eliminar

- [ ] **`lib/recurso-humano-service.ts`** → Reemplazar por `personal-service.ts`
- [ ] **`lib/historial-personal-service.ts`** → Reemplazar por `movimientos-personal-service.ts`

---

### 2️⃣ Componentes React (Alta Prioridad)

#### Archivos que Probablemente Necesiten Actualización

Buscar referencias a:
- `roles_operativos` → Cambiar a `personal`
- `historial_personal` → Cambiar a `movimientos_personal`
- `RolOperativo` (tipo) → Cambiar a `Personal`
- `cedula` que use correos → Cambiar a `numero_documento`

#### Comandos para Encontrar Referencias:

```bash
# Buscar referencias a roles_operativos
grep -r "roles_operativos" --include="*.tsx" --include="*.ts" .

# Buscar referencias a historial_personal
grep -r "historial_personal" --include="*.tsx" --include="*.ts" .

# Buscar referencias a RolOperativo
grep -r "RolOperativo" --include="*.tsx" --include="*.ts" .

# Buscar referencias a cedula_operario
grep -r "cedula_operario" --include="*.tsx" --include="*.ts" .
```

#### Componentes Probables a Actualizar:

- [ ] Componentes de gestión de personal
- [ ] Formularios de creación/edición de operarios
- [ ] Formularios de creación/edición de auxiliares
- [ ] Selectores de personal en inspecciones
- [ ] Selectores de personal en bitácora
- [ ] Tablas de listado de personal
- [ ] Componentes de alertas de licencias vencidas

---

### 3️⃣ Reportes y Analítica (Media Prioridad)

#### Archivos a Actualizar:

- [ ] **`lib/reportes/recurso-humano-reports.ts`**
  - Cambiar referencias de `historial_personal` a `movimientos_personal`
  - Actualizar queries para usar tabla `personal`
  - Actualizar estadísticas (ya no hay 'inspector' en personal)
  - Agregar reportes de turnos

#### Nuevos Reportes a Crear:

- [ ] Reporte de asignaciones de turnos
- [ ] Reporte de cobertura por turno
- [ ] Reporte de movimientos por período
- [ ] Reporte de licencias próximas a vencer (solo personal, no perfiles)

---

### 4️⃣ Formularios y Validaciones (Media Prioridad)

#### Formularios a Actualizar/Crear:

- [ ] **Formulario de Creación de Personal**
  - Campo `numero_documento` (validar formato de cédula)
  - Campo `tipo_personal` (solo 'operario' o 'auxiliar')
  - Campos de licencia (obligatorios si tipo_personal = 'operario')
  - Campo `perfil_id` (opcional, para vincular con usuario)
  - Validación: no permitir cédulas duplicadas

- [ ] **Formulario de Edición de Personal**
  - Permitir cambiar estado (activo, inactivo, suspendido, vacaciones)
  - Registrar motivo al cambiar a inactivo o suspendido
  - Validar que operarios siempre tengan licencia

- [ ] **Formulario de Asignación de Turnos**
  - Seleccionar personal
  - Seleccionar turno
  - Fecha inicio / fecha fin (opcional)
  - Validar que no se solapen turnos

- [ ] **Formulario de Gestión de Turnos**
  - Crear/editar turnos personalizados
  - Configurar días de la semana
  - Configurar horarios
  - Asignar color para visualización

---

### 5️⃣ Migraciones de Datos (Si hay datos existentes)

Si tienes datos en las tablas antiguas que quieres conservar:

- [ ] **Script de Migración de `roles_operativos` a `personal`**
  ```sql
  -- Migrar operarios y auxiliares
  INSERT INTO public.personal (
    nombre_completo,
    numero_documento,
    tipo_personal,
    estado,
    fecha_ingreso,
    licencia_conduccion,
    categoria_licencia,
    licencia_vencimiento,
    perfil_id,
    es_conductor
  )
  SELECT
    p.nombre_completo,
    COALESCE(p.numero_documento, 'TEMP-' || ro.id), -- Temporal si no tiene
    ro.rol,
    CASE WHEN ro.activo THEN 'activo' ELSE 'inactivo' END,
    ro.fecha_inicio,
    ro.licencia_conduccion,
    ro.categoria_licencia,
    ro.licencia_vencimiento,
    ro.perfil_id,
    CASE WHEN ro.rol = 'operario' THEN true ELSE false END
  FROM public.roles_operativos ro
  INNER JOIN public.perfiles p ON ro.perfil_id = p.id
  WHERE ro.rol IN ('operario', 'auxiliar'); -- NO migrar inspectores
  ```

- [ ] **Actualizar cédulas temporales**
  - Revisar registros con `numero_documento LIKE 'TEMP-%'`
  - Solicitar cédulas reales al equipo
  - Actualizar manualmente

- [ ] **Script de Migración de `historial_personal` a `movimientos_personal`**
  ```sql
  -- Migrar solo movimientos importantes
  INSERT INTO public.movimientos_personal (
    personal_id,
    tipo_movimiento,
    fecha_movimiento,
    motivo,
    observaciones,
    snapshot_data
  )
  SELECT
    p.id,
    hp.tipo_movimiento,
    hp.fecha_movimiento,
    hp.motivo,
    hp.observaciones,
    jsonb_build_object(
      'nombre', hp.nombre,
      'cedula', hp.cedula,
      'tipo_personal', hp.tipo_personal,
      'licencia_conduccion', hp.licencia_conduccion
    )
  FROM public.historial_personal hp
  INNER JOIN public.personal p ON p.numero_documento = hp.cedula
  WHERE hp.tipo_movimiento IN ('ingreso', 'baja', 'reingreso');
  ```

---

### 6️⃣ Actualización de Referencias en Bitácora e Inspecciones (Baja Prioridad)

Las tablas de bitácora e inspecciones **ya usan `perfil_id` directamente**, pero podrían necesitar ajustes para:

- [ ] **Componentes de selección de operario/auxiliar en inspecciones**
  - Cambiar queries de `roles_operativos` a `personal`
  - Mostrar solo personal activo
  - Validar que operarios tengan licencia vigente

- [ ] **Componentes de selección de operario/auxiliar en bitácora**
  - Cambiar queries de `roles_operativos` a `personal`
  - Mostrar turno asignado del operario
  - Filtrar por turno

---

### 7️⃣ Nuevas Funcionalidades (Opcional - Baja Prioridad)

#### Módulo de Turnos (UI)

- [ ] **Página de Gestión de Turnos**
  - Listar turnos
  - Crear/editar/eliminar turnos
  - Ver asignaciones por turno

- [ ] **Calendario de Asignaciones**
  - Vista de calendario con turnos asignados
  - Drag & drop para reasignar
  - Visualización por colores

- [ ] **Dashboard de Turnos**
  - Cobertura actual por turno
  - Personal sin turno asignado
  - Alertas de turnos sin personal

#### Mejoras en Alertas

- [ ] **Alertas de Licencias Vencidas**
  - Cambiar query para usar tabla `personal` en lugar de `roles_operativos`
  - Notificaciones automáticas

- [ ] **Alertas de Turnos**
  - Turnos sin cobertura
  - Personal próximo a finalizar asignación

---

## 🔍 Búsqueda de Referencias en el Código

### Archivos Clave a Revisar:

```bash
# 1. Servicios
lib/recurso-humano-service.ts
lib/historial-personal-service.ts
lib/perfiles-service.ts

# 2. Reportes
lib/reportes/recurso-humano-reports.ts

# 3. Buscar todos los imports de tipos antiguos
grep -r "import.*RolOperativo" --include="*.tsx" --include="*.ts" .
grep -r "import.*PersonalOperativo" --include="*.tsx" --include="*.ts" .
grep -r "import.*HistorialPersonal" --include="*.tsx" --include="*.ts" .

# 4. Buscar queries de Supabase
grep -r "from('roles_operativos')" --include="*.tsx" --include="*.ts" .
grep -r "from('historial_personal')" --include="*.tsx" --include="*.ts" .
```

---

## 📝 Orden Recomendado de Implementación

### Fase 1: Servicios Base (Hacer primero)
1. Crear `lib/personal-service.ts`
2. Crear `lib/turnos-service.ts`
3. Crear `lib/movimientos-personal-service.ts`
4. Probar servicios con queries directas a Supabase

### Fase 2: Actualizar Componentes Críticos
5. Actualizar selectores de personal en inspecciones
6. Actualizar selectores de personal en bitácora
7. Actualizar formularios de creación/edición de personal

### Fase 3: Reportes y Analítica
8. Actualizar `lib/reportes/recurso-humano-reports.ts`
9. Crear reportes de turnos
10. Actualizar dashboard con nuevas métricas

### Fase 4: Nuevas Funcionalidades
11. Crear UI de gestión de turnos
12. Crear calendario de asignaciones
13. Implementar notificaciones de alertas

---

## ⚠️ Consideraciones Importantes

### 1. Compatibilidad hacia atrás
- Los tipos `RolOperativo`, `PersonalOperativo`, `HistorialPersonal` están marcados como **DEPRECATED** pero se mantienen en `lib/types.ts`
- Esto evita que el código existente se rompa inmediatamente
- Migrar gradualmente a los nuevos tipos

### 2. Validaciones
- **Operarios deben tener licencia** - La base de datos lo valida, pero también validar en frontend
- **Cédulas no pueden duplicarse** - Validar antes de enviar
- **No se pueden solapar turnos** - Validar en frontend antes de asignar

### 3. Datos de prueba
- Los 5 turnos predefinidos ya están en la base de datos
- Crear personal de prueba con cédulas reales
- Probar asignaciones de turnos

### 4. Migraciones
- Si tienes datos existentes, ejecutar scripts de migración **antes** de actualizar el frontend
- Revisar y corregir cédulas temporales
- Verificar que todos los movimientos importantes se migraron

---

## 📚 Recursos y Referencias

### Documentación
- `REESTRUCTURACION_PERSONAL.md` - Cambios en base de datos
- `lib/types.ts` - Nuevos tipos TypeScript
- Scripts SQL en `supabase/` - Estructura de tablas

### Servicios de Ejemplo
Revisar servicios existentes para seguir el mismo patrón:
- `lib/vehiculos-service.ts` - Ejemplo de CRUD básico
- `lib/perfiles-service.ts` - Ejemplo con relaciones
- `lib/bitacora-service.ts` - Ejemplo con queries complejas

---

## ✅ Checklist de Verificación Final

Antes de considerar completa la migración:

- [ ] Todos los servicios TypeScript creados y probados
- [ ] Componentes actualizados y sin errores de compilación
- [ ] Formularios validando correctamente
- [ ] Reportes mostrando datos correctos
- [ ] No hay referencias a `roles_operativos` en código activo
- [ ] No hay referencias a `historial_personal` en código activo
- [ ] Tipos deprecados solo usados en código legacy
- [ ] Pruebas manuales completas:
  - [ ] Crear personal
  - [ ] Editar personal
  - [ ] Cambiar estados
  - [ ] Asignar turnos
  - [ ] Ver historial de movimientos
  - [ ] Generar reportes

---

**🎯 OBJETIVO**: Tener el frontend completamente adaptado a la nueva estructura de personal, turnos y movimientos.

**⏱️ ESTIMACIÓN**: 1-2 sesiones de trabajo (4-8 horas)

**📌 PRIORIDAD**: Alta - Necesario para que el sistema funcione con la nueva base de datos
