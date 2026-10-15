# Cierre de Período — Design Doc

**Intent:** Permitir que el admin cierre un período académico, bloqueando edición de notas/asistencia, activando el siguiente período, y notificando a responsables para que accedan a la libreta digital.

**Why:** Sin cierre, los docentes pueden seguir editando notas de períodos pasados indefinidamente. El primer cliente (academia de inglés con dimensiones) necesita un flujo formal de fin de bimestre/trimestre.

---

## Goals

- Admin puede cerrar un período: bloquea toda edición de notas, evaluaciones y asistencia de ese período
- Pre-cierre: el sistema muestra qué datos faltan (alumnos sin notas, materias sin asistencia)
- Al cerrar, el siguiente período (por `orden`) se activa automáticamente
- Admin puede reabrir un período cerrado (override)
- Notificación a responsables: email con link al boletín del alumno en el sitio — **no PDF adjunto**
- Notificación es paso separado, no automático al cerrar
- Responsables acceden a la libreta logueándose al dashboard (ya tienen cuenta)

## Non-Goals

- PDF generado por el servidor
- Actas oficiales / firma digital
- Portal separado para responsables (ya existe el dashboard con rol `responsable`)
- Notificaciones automáticas sin acción del admin

## Anti-Goals

- Cierre que borre o archive datos (todo queda en las tablas originales, solo se bloquea edición)
- Cierre que afecte múltiples instituciones a la vez

---

## Schema Changes

### Migración: `periodos`

Agregar dos columnas:

```sql
ALTER TABLE periodos
  ADD COLUMN activo      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN cerrado_at  TIMESTAMPTZ,
  ADD COLUMN cerrado_por UUID REFERENCES personas(id);
```

`activo`: el período que se muestra por defecto en UI (mismo patrón que `años_lectivos.activo`). Solo un período activo por año lectivo a la vez — enforced por UNIQUE partial index:

```sql
CREATE UNIQUE INDEX idx_periodos_activo_unico
  ON periodos(año_lectivo_id)
  WHERE activo = true AND deleted_at IS NULL;
```

`cerrado_at`: timestamp de cierre. NULL = abierto. NOT NULL = cerrado.
`cerrado_por`: persona que ejecutó el cierre (auditoría).

---

## API

### `GET /api/v1/instituciones/[id]/periodos/[periodo_id]/cierre-preview`

Auth: admin o superadmin.

Retorna reporte de datos faltantes en el período:

```typescript
{
  total_alumnos: number
  total_materias: number
  alumnos_sin_notas: Array<{ alumno_id, alumno_nombre, materias_sin_notas: string[] }>
  materias_sin_asistencia: Array<{ materia_id, materia_nombre }>
  completo: boolean  // true si alumnos_sin_notas y materias_sin_asistencia están vacíos
}
```

Lógica:
1. Obtener cursos del año lectivo del período → materias de esos cursos
2. Obtener alumnos con inscripción activa en esos cursos
3. Para cada alumno × materia: verificar si existe al menos una nota con `evaluacion.periodo_id = periodo_id` y `deleted_at IS NULL`
4. Para cada materia: verificar si existe `asistencia_resumen` con `materia_id + periodo_id`

### `POST /api/v1/instituciones/[id]/periodos/[periodo_id]/cerrar`

Auth: admin o superadmin.

Body:
```typescript
{ activar_siguiente: boolean }  // default true
```

Lógica:
1. Verificar que `cerrado_at IS NULL` (no cerrar dos veces)
2. `UPDATE periodos SET cerrado_at = now(), cerrado_por = session.persona_id WHERE id = periodo_id`
3. Si `activar_siguiente = true`:
   - Buscar el período con `orden = (orden_actual + 1)` en el mismo `año_lectivo_id`
   - Si existe: `UPDATE periodos SET activo = false WHERE año_lectivo_id = X AND activo = true`; luego `SET activo = true` en el siguiente
4. Retornar `ok({ cerrado: true, siguiente_activado: boolean })`

### `POST /api/v1/instituciones/[id]/periodos/[periodo_id]/reabrir`

Auth: admin o superadmin.

`UPDATE periodos SET cerrado_at = NULL, cerrado_por = NULL`. Retornar `ok({ reabierto: true })`.

### `POST /api/v1/instituciones/[id]/periodos/[periodo_id]/notificar`

Auth: admin o superadmin.

Envía email a todos los responsables de alumnos de la institución con link a su boletín.

Lógica:
1. Obtener `slug` de la institución
2. Obtener todos los alumnos activos de la institución
3. Para cada alumno: obtener responsables via `alumno_responsables → personas` donde `persona.email IS NOT NULL`
4. Para cada responsable: enviar email Resend con link `https://[APP_URL]/dashboard/[slug]/libreta/[alumno_id]/boletin`
5. Retornar `ok({ enviados: number, errores: number })`

Template email (Resend/React Email):
- Asunto: `Libreta de [alumno_nombre] — [periodo_nombre] cerrado`
- Cuerpo: aviso de cierre + botón CTA que abre el boletín en el sitio

### Lock enforcement en APIs existentes

Antes de cualquier mutación sobre notas, evaluaciones, y asistencia, verificar si el período asociado está cerrado. Si `periodo.cerrado_at IS NOT NULL`, retornar `Err.forbidden('Período cerrado')` (HTTP 403).

APIs afectadas:
- `POST /api/v1/materias/[id]/evaluaciones` — chequear `periodo_id` del body
- `PATCH/DELETE /api/v1/evaluaciones/[id]` — chequear `evaluacion.periodo_id`
- `POST /api/v1/notas` (bulk) — chequear `evaluacion.periodo_id`
- `PATCH /api/v1/notas/[id]` — chequear via `nota → evaluacion → periodo`
- `POST /api/v1/materias/[id]/asistencia` — chequear `periodo_id` del body

---

## UI

### Configuración → Períodos

Página existente (o nueva si no existe): `/dashboard/[slug]/configuracion/periodos`

Por cada período mostrar:
- Nombre, fechas, badge `Activo` si `activo = true`, badge `Cerrado` si `cerrado_at IS NOT NULL`
- Botón **"Cerrar período"** (admin, solo si `cerrado_at IS NULL`)
- Botón **"Reabrir"** (admin, solo si `cerrado_at IS NOT NULL`)
- Botón **"Enviar libretas"** (admin, solo si `cerrado_at IS NOT NULL`)

### Modal de cierre (Sheet o Dialog)

**Paso 1: Validación**
- Llamar a `cierre-preview` al abrir
- Mostrar spinner mientras carga
- Si `completo = true`: "Todos los datos están completos. Podés cerrar el período."
- Si hay faltantes: lista de advertencias (alumnos sin notas, materias sin asistencia). Texto: "Podés cerrar igual, pero estos datos quedarán incompletos."

**Paso 2: Confirmación**
- Checkbox: "Activar siguiente período automáticamente" (checked por default)
- Botón "Cerrar período" → POST `/cerrar`
- Toast success: "Período cerrado. [Siguiente período activado.]"

### Modal de notificaciones (Sheet o Dialog)

Botón "Enviar libretas" abre confirmación:
- "Se enviará un email a los responsables de X alumnos con link a la libreta digital."
- Botón "Enviar" → POST `/notificar`
- Toast: "X emails enviados."

### Lock indicator en páginas de edición

Cuando el período está cerrado, mostrar banner en:
- Página de notas del evaluacion
- Página de evaluaciones de materia
- Página de asistencia de materia

Banner: "Este período está cerrado. No se pueden editar datos." (sin bloquear visibilidad, solo edición)

---

## Constraints

- Solo admin y superadmin pueden cerrar/reabrir/notificar
- Docentes y responsables ven el estado pero no pueden cambiar nada
- Soft delete sigue aplicando en todas las tablas
- `notificar` no es idempotente — admin puede enviar múltiples veces (no hay tracking de envíos en este MVP)
- Email solo se envía a responsables con email en `personas.email`
- APP_URL viene de variable de entorno `NEXT_PUBLIC_APP_URL`

---

## Builder calls (decisiones del implementador)

- La página de configuración de períodos: si no existe, crear en `/dashboard/[slug]/configuracion/periodos`. Si existe, extender.
- El template de email Resend puede reusar el patrón de emails existentes en el proyecto.
- El banner de "período cerrado" puede ser un componente compartido o inline — a criterio del implementador.
