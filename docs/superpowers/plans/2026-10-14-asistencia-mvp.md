# Asistencia MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que admin/docente cargue inasistencias por alumno/materia/período y que se muestren en el boletín.

**Architecture:** Nueva tabla `asistencia_resumen` (sin RLS de docente para write ya que el input es por materia). API REST siguiendo el patrón `materias/[id]/evaluaciones`. UI como página de editor tipo grilla (igual que `notas-editor.tsx`). Display en boletín como línea debajo de la tabla de notas de cada materia.

**Tech Stack:** Next.js 16 App Router, Supabase PostgreSQL + RLS, TypeScript, Zod, shadcn/base-ui, Sonner toasts.

**Spec:** `https://claude.ai/code/artifact/6fd9559a-44fa-4cf6-8cd4-d22539e68fc7` — sección "Asistencia MVP"

## Global Constraints

- Todas las tablas requieren `institucion_id` para RLS multi-tenant
- Soft delete: `deleted_at TIMESTAMPTZ` en lugar de DELETE físico (excepto `asistencia_resumen` que usa UPSERT por UNIQUE constraint)
- API responses: `ok(data)` / `created(data)` / `Err.*()` de `@/lib/api`
- Auth: `getSession()` + `hasAnyRole(session, inst_id, roles)` de `@/lib/auth`
- Params en Next.js 16: `const { id } = await params` (params es Promise)
- Zod 4: `z.object({}).strict()` para body validation
- UI client components: `'use client'`, fetch directo, `toast` de sonner, `router.refresh()` post-save
- `porcentaje` no se almacena — se calcula en API/frontend
- `materia_id NULL` = asistencia general (no implementar en este MVP — solo `materia_id` requerido)

## Review Focus

- `total_clases = 0`: división por cero al calcular porcentaje → retornar `null` en vez de `NaN`
- Alumno sin inscripción activa: GET debe retornar el alumno igual (con asistencia vacía) para permitir carga
- UNIQUE constraint `(alumno_id, periodo_id, materia_id)`: POST debe usar UPSERT (`onConflict`)
- Docente de otra materia intenta cargar asistencia: verificar `materia_docentes` igual que en evaluaciones
- Boletín sin asistencia registrada: no mostrar línea de asistencia (solo mostrar si hay datos)

---

### Task 1: Migración DB — tabla `asistencia_resumen`

**Files:**
- Create: `supabase/migrations/20261014000001_create_asistencia_resumen.sql`

**Interfaces:**
- Produces: tabla `asistencia_resumen` con columnas `id, institucion_id, alumno_id, materia_id, periodo_id, total_clases, inasistencias_justificadas, inasistencias_injustificadas, observacion, created_at, updated_at`; UNIQUE `(alumno_id, periodo_id, materia_id)`; RLS habilitado

- [ ] **Step 1: Escribir migración**

```sql
CREATE TABLE asistencia_resumen (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id               UUID NOT NULL REFERENCES instituciones(id),
  alumno_id                    UUID NOT NULL REFERENCES alumnos(id),
  materia_id                   UUID REFERENCES materias(id),
  periodo_id                   UUID NOT NULL REFERENCES periodos(id),
  total_clases                 INT NOT NULL DEFAULT 0,
  inasistencias_justificadas   INT NOT NULL DEFAULT 0,
  inasistencias_injustificadas INT NOT NULL DEFAULT 0,
  observacion                  TEXT,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (alumno_id, periodo_id, materia_id)
);
-- índice para consultas por materia+período
CREATE INDEX idx_asistencia_materia_periodo
  ON asistencia_resumen(materia_id, periodo_id)
  WHERE materia_id IS NOT NULL;

ALTER TABLE asistencia_resumen ENABLE ROW LEVEL SECURITY;

CREATE POLICY asistencia_resumen_tenant ON asistencia_resumen
  FOR ALL USING (
    has_any_role(institucion_id, ARRAY['admin', 'docente', 'responsable'])
    OR is_superadmin()
  )
  WITH CHECK (
    has_any_role(institucion_id, ARRAY['admin', 'docente'])
    OR is_superadmin()
  );
```

- [ ] **Step 2: Aplicar migración**

```bash
npx supabase db push
```
Verificar: tabla aparece en `supabase db diff` limpio

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20261014000001_create_asistencia_resumen.sql
git commit -m "feat: migración tabla asistencia_resumen"
```

---

### Task 2: API — GET/POST asistencia por materia

**Files:**
- Create: `src/app/api/v1/materias/[id]/asistencia/route.ts`

**Interfaces:**
- Consumes: patrón de `src/app/api/v1/materias/[id]/evaluaciones/route.ts` (auth + materia lookup)
- Produces:
  - `GET /api/v1/materias/[id]/asistencia?periodo_id=<uuid>` → `{ alumno_id, total_clases, inasistencias_justificadas, inasistencias_injustificadas, observacion }[]`
  - `POST /api/v1/materias/[id]/asistencia` body `{ periodo_id, registros: [{alumno_id, total_clases, inasistencias_justificadas, inasistencias_injustificadas, observacion?}] }` → `{ upserted: number }`

- [ ] **Step 1: Escribir test GET sin asistencia**

```typescript
// src/tests/api/asistencia.test.ts
it('GET asistencia vacía retorna array vacío', async () => {
  // mock supabase devuelve []
  expect(result).toEqual([])
})
```

- [ ] **Step 2: Correr test — debe fallar** (archivo no existe)

```bash
npx vitest run src/tests/api/asistencia.test.ts
```

- [ ] **Step 3: Implementar `GET` en `route.ts`**

Flujo:
1. `await params` → `materia_id`
2. `getSession()` → `Err.unauthorized()`
3. Buscar `materia` por id, `.is('deleted_at', null)` → `Err.notFound()`
4. `hasAnyRole(session, materia.institucion_id, ['admin', 'docente', 'responsable'])` → `Err.forbidden()`
5. Leer `periodo_id` de `req.nextUrl.searchParams`; si falta → `Err.validation('periodo_id requerido')`
6. SELECT `asistencia_resumen` WHERE `materia_id = materia_id AND periodo_id = periodo_id`
7. Retornar `ok(data)`

- [ ] **Step 4: Implementar `POST` en `route.ts`**

Schema Zod:
```typescript
const BulkSchema = z.object({
  periodo_id: z.string().uuid(),
  registros: z.array(z.object({
    alumno_id:                   z.string().uuid(),
    total_clases:                z.number().int().min(0),
    inasistencias_justificadas:  z.number().int().min(0),
    inasistencias_injustificadas: z.number().int().min(0),
    observacion:                 z.string().max(500).optional().nullable(),
  })).min(1),
})
```

Flujo:
1. Auth + materia lookup (igual que GET)
2. Solo `admin` o `docente` puede escribir; docente verifica `materia_docentes` igual que `evaluaciones/route.ts`
3. Parsear body con `BulkSchema`
4. Upsert: `supabase.from('asistencia_resumen').upsert(rows, { onConflict: 'alumno_id,periodo_id,materia_id' })`; cada row incluye `institucion_id: materia.institucion_id`
5. Retornar `ok({ upserted: parsed.data.registros.length })`

- [ ] **Step 5: Correr tests — deben pasar**

```bash
npx vitest run src/tests/api/asistencia.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/v1/materias/[id]/asistencia/route.ts src/tests/api/asistencia.test.ts
git commit -m "feat: API GET/POST asistencia por materia"
```

---

### Task 3: UI — Página de carga de asistencia

**Files:**
- Create: `src/app/dashboard/[slug]/materias/[materia_id]/asistencia/page.tsx`
- Create: `src/app/dashboard/[slug]/materias/[materia_id]/asistencia/asistencia-editor.tsx`

**Interfaces:**
- Consumes:
  - `GET /api/v1/materias/[id]/asistencia?periodo_id=` (Task 2)
  - `POST /api/v1/materias/[id]/asistencia` (Task 2)
  - Supabase: alumnos inscritos al curso de la materia, periodos de la institución
- Produces: página en `/dashboard/[slug]/materias/[materia_id]/asistencia?periodo_id=`

- [ ] **Step 1: Escribir `page.tsx` (Server Component)**

`page.tsx` resuelve params, verifica auth (admin|docente), carga:
- `materia` → `materias_catalogo(nombre), cursos(id, nombre, año_lectivo_id)`
- `periodos` de la institución
- `alumno_inscripciones` del curso (activos) → alumnos con `nombre, apellido`
- `asistencia` existente via `asistencia_resumen` WHERE `materia_id + periodo_id`

`periodo_id` viene de `searchParams`; si no hay, usar el primer período.

Pasa a `AsistenciaEditor`: `{ materiaId, periodoId, periodos, alumnos, asistenciaExistente, slug }`.

- [ ] **Step 2: Escribir `asistencia-editor.tsx` (Client Component)**

Patrón idéntico a `notas-editor.tsx`:
- Estado inicial: `Record<alumno_id, { total: string; justif: string; injustif: string; obs: string }>` inicializado desde `asistenciaExistente`
- Tabla con columnas: Alumno | Total clases | Inasist. justificadas | Inasist. injustificadas | Observación | Asistencia %
- Columna "Asistencia %" calculada: `total > 0 ? ((total - justif - injustif) / total * 100).toFixed(1) + '%' : '—'`
- Selector de período arriba (cambia URL con `router.push`)
- Botón "Guardar" → POST bulk → `toast.success` / `toast.error` → `router.refresh()`

- [ ] **Step 3: Verificar manualmente en browser**

Navegar a `/dashboard/[slug]/materias/[materia_id]/asistencia`.
- Tabla muestra alumnos
- Ingresar valores → Guardar → refresh muestra los valores guardados
- Selector de período cambia datos

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/[slug]/materias/[materia_id]/asistencia/
git commit -m "feat: UI carga de asistencia por materia/período"
```

---

### Task 4: Link de navegación desde evaluaciones

**Files:**
- Modify: `src/app/dashboard/[slug]/materias/[materia_id]/evaluaciones/page.tsx`

**Interfaces:**
- Consumes: ruta `/dashboard/[slug]/materias/[materia_id]/asistencia` (Task 3)
- Produces: botón "Asistencia" en la página de evaluaciones de la materia

- [ ] **Step 1: Agregar botón en `page.tsx`**

En el header de la página de evaluaciones, junto al botón `NuevaEvaluacionSheet`, agregar:
```tsx
<Button variant="outline" size="sm" render={<Link href={`/dashboard/${slug}/materias/${materia_id}/asistencia`} />}>
  <UserCheck data-icon="inline-start" />
  Asistencia
</Button>
```
Import: `UserCheck` de `lucide-react`.

- [ ] **Step 2: Verificar manualmente** — botón aparece, navega correctamente

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/[slug]/materias/[materia_id]/evaluaciones/page.tsx
git commit -m "feat: link a asistencia desde página de evaluaciones"
```

---

### Task 5: Display de asistencia en boletín y libreta

**Files:**
- Modify: `src/app/dashboard/[slug]/libreta/[alumno_id]/boletin/page.tsx`
- Modify: `src/app/dashboard/[slug]/libreta/[alumno_id]/page.tsx`

**Interfaces:**
- Consumes: `asistencia_resumen` WHERE `alumno_id = alumno_id`
- Produces:
  - Boletín: línea **"Inasistencias: X just. / Y injust. (Z%)"** debajo de tabla de notas de cada materia, solo cuando hay datos
  - Libreta: idem

- [ ] **Step 1: Agregar query asistencia en `boletin/page.tsx`**

Después de cargar notas, agregar:
```typescript
const { data: asistencias } = await supabase
  .from('asistencia_resumen')
  .select('materia_id, periodo_id, total_clases, inasistencias_justificadas, inasistencias_injustificadas')
  .eq('alumno_id', alumno_id)
```
Crear `asistenciaMap: Map<string, asistencia_row>` indexado por `materia_id`.

- [ ] **Step 2: Renderizar sección asistencia en boletín**

Dentro del loop por materia, después de la `<table>` de notas:
```tsx
{(() => {
  const a = asistenciaMap.get(matId)
  if (!a || a.total_clases === 0) return null
  const pct = ((a.total_clases - a.inasistencias_justificadas - a.inasistencias_injustificadas) / a.total_clases * 100).toFixed(0)
  return (
    <p className="text-sm text-muted-foreground mt-2 print:text-gray-600">
      Inasistencias: {a.inasistencias_justificadas} just. / {a.inasistencias_injustificadas} injust. ({pct}% asistencia)
    </p>
  )
})()}
```

- [ ] **Step 3: Idem en `libreta/page.tsx`** — misma lógica, en Card

- [ ] **Step 4: Verificar manualmente** — boletín muestra línea de asistencia después de cargar datos de prueba

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/[slug]/libreta/[alumno_id]/boletin/page.tsx src/app/dashboard/[slug]/libreta/[alumno_id]/page.tsx
git commit -m "feat: mostrar asistencia en libreta y boletín"
```
