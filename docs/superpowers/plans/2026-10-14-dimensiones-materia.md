# Dimensiones por Materia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que una materia tenga dimensiones ponderadas (ej. Oral 40%, Escrito 40%, Lectura 20%) con evaluaciones por dimensión y sub-scores en boletín.

**Architecture:** Nueva tabla `materias_dimensiones` + `ALTER TABLE evaluaciones ADD COLUMN dimension_id`. Retrocompatible: `dimension_id IS NULL` = materia clásica sin cambios. API CRUD de dimensiones bajo `materias/[id]/dimensiones`. Config UI en la página de detalle del curso (igual que horarios). Evaluaciones con selector de dimensión (opcional). Boletín con sub-filas por dimensión cuando existen.

**Tech Stack:** Next.js 16 App Router, Supabase PostgreSQL + RLS, TypeScript, Zod, shadcn/base-ui, Sonner toasts.

**Spec:** `https://claude.ai/code/artifact/6fd9559a-44fa-4cf6-8cd4-d22539e68fc7` — sección "Dimensiones por materia"

## Global Constraints

- Todas las tablas requieren `institucion_id` para RLS multi-tenant
- Soft delete: `deleted_at TIMESTAMPTZ` (excepto `materias_dimensiones` que usa DELETE físico ya que tiene ON DELETE CASCADE en evaluaciones)
- API responses: `ok(data)` / `created(data)` / `Err.*()` de `@/lib/api`
- Auth: `getSession()` + `hasAnyRole(session, inst_id, roles)` de `@/lib/auth`
- Params Next.js 16: `const { id } = await params` (params es Promise)
- Zod 4: `z.object({}).strict()` para body validation
- `dimension_id IS NULL` en evaluaciones = sin dimensión (comportamiento legacy sin cambios)
- La nota final de la materia = promedio ponderado de promedios por dimensión (display only, no se almacena)
- Boletín muestra sub-filas por dimensión solo si la materia tiene dimensiones configuradas

## Review Focus

- Evaluación sin `dimension_id` en materia con dimensiones configuradas: tratar como "sin dimensión" — mostrar en sección general, no en sub-rows ponderados
- Todos los pesos en 0 o dimensiones sin evaluaciones: no dividir por cero al calcular promedio ponderado
- DELETE de dimensión con evaluaciones asignadas: `ON DELETE SET NULL` en `dimension_id` — las evaluaciones quedan sin dimensión, no se pierden
- Docente ve selector de dimensiones en nueva evaluación pero la materia no tiene dimensiones: el select debe estar oculto o mostrar "Sin dimensión (opcional)"
- Boletín con mix de evaluaciones dimensionadas y sin dimensión en misma materia: agrupar dimensionadas por dimensión, las sin dimensión en grupo propio

---

### Task 1: Migración DB — tabla `materias_dimensiones` y columna `dimension_id`

**Files:**
- Create: `supabase/migrations/20261014000002_create_materias_dimensiones.sql`

**Interfaces:**
- Produces:
  - Tabla `materias_dimensiones(id, materia_id, nombre, peso, orden, created_at)`
  - Columna `evaluaciones.dimension_id UUID REFERENCES materias_dimensiones(id) ON DELETE SET NULL`
  - RLS habilitado en `materias_dimensiones`

- [ ] **Step 1: Escribir migración**

```sql
CREATE TABLE materias_dimensiones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  nombre     TEXT NOT NULL,
  peso       NUMERIC NOT NULL DEFAULT 1 CHECK (peso > 0),
  orden      INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mat_dim_materia ON materias_dimensiones(materia_id);

ALTER TABLE materias_dimensiones ENABLE ROW LEVEL SECURITY;

CREATE POLICY mat_dim_tenant ON materias_dimensiones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM materias m
      WHERE m.id = materia_id
        AND (has_any_role(m.institucion_id, ARRAY['admin','docente','responsable']) OR is_superadmin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM materias m
      WHERE m.id = materia_id
        AND (has_role(m.institucion_id, 'admin') OR is_superadmin())
    )
  );

ALTER TABLE evaluaciones
  ADD COLUMN dimension_id UUID REFERENCES materias_dimensiones(id) ON DELETE SET NULL;
```

- [ ] **Step 2: Aplicar migración**

```bash
npx supabase db push
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20261014000002_create_materias_dimensiones.sql
git commit -m "feat: migración materias_dimensiones y evaluaciones.dimension_id"
```

---

### Task 2: API — CRUD dimensiones

**Files:**
- Create: `src/app/api/v1/materias/[id]/dimensiones/route.ts`
- Create: `src/app/api/v1/materias/[id]/dimensiones/[dim_id]/route.ts`

**Interfaces:**
- Produces:
  - `GET /api/v1/materias/[id]/dimensiones` → `{ id, nombre, peso, orden }[]` ordenado por `orden`
  - `POST /api/v1/materias/[id]/dimensiones` body `{ nombre, peso, orden? }` → `{ id, nombre, peso, orden }`
  - `PATCH /api/v1/materias/[id]/dimensiones/[dim_id]` body `{ nombre?, peso?, orden? }` → `{ id, nombre, peso, orden }`
  - `DELETE /api/v1/materias/[id]/dimensiones/[dim_id]` → `{ deleted: true }` (físico, ON DELETE SET NULL en evaluaciones)

- [ ] **Step 1: Escribir test CRUD básico**

```typescript
// src/tests/api/dimensiones.test.ts
it('dimensiones: CRUD básico retorna shape correcto', () => {
  // GET retorna array
  expect(Array.isArray(result)).toBe(true)
  // POST retorna objeto con id, nombre, peso, orden
  expect(created).toMatchObject({ id: expect.any(String), nombre: 'Oral', peso: 40, orden: 1 })
})
```

- [ ] **Step 2: Correr test — debe fallar**

```bash
npx vitest run src/tests/api/dimensiones.test.ts
```

- [ ] **Step 3: Implementar `route.ts` (colección)**

`GET`: auth + materia lookup → SELECT `materias_dimensiones` WHERE `materia_id` ORDER BY `orden`.

`POST` schema:
```typescript
z.object({
  nombre: z.string().min(1).max(100),
  peso:   z.number().positive(),
  orden:  z.number().int().positive().optional(),
}).strict()
```
Solo `admin`. Si `orden` no viene, usar `MAX(orden) + 1`.

- [ ] **Step 4: Implementar `[dim_id]/route.ts` (item)**

`PATCH` schema:
```typescript
z.object({
  nombre: z.string().min(1).max(100).optional(),
  peso:   z.number().positive().optional(),
  orden:  z.number().int().positive().optional(),
}).strict()
```
Solo `admin`. Verificar que `dim_id` pertenece a `materia_id`.

`DELETE`: Solo `admin`. DELETE físico. Retorna `ok({ deleted: true })`.

- [ ] **Step 5: Correr tests — deben pasar**

```bash
npx vitest run src/tests/api/dimensiones.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/v1/materias/[id]/dimensiones/
git add src/tests/api/dimensiones.test.ts
git commit -m "feat: API CRUD dimensiones por materia"
```

---

### Task 3: API — Evaluaciones con `dimension_id`

**Files:**
- Modify: `src/app/api/v1/materias/[id]/evaluaciones/route.ts` (líneas ~7-14 y ~37-43 y ~67-79)
- Modify: `src/app/api/v1/evaluaciones/[id]/route.ts` (líneas ~7-14 y ~53-61)

**Interfaces:**
- Consumes: `materias_dimensiones` ya existe (Task 1)
- Produces:
  - `GET /api/v1/materias/[id]/evaluaciones` incluye `dimension_id` en select y response
  - `POST /api/v1/materias/[id]/evaluaciones` acepta `dimension_id?: string (uuid | null)`
  - `PATCH /api/v1/evaluaciones/[id]` acepta `dimension_id?: string (uuid | null)`

- [ ] **Step 1: Modificar `CreateSchema` en evaluaciones/route.ts**

Agregar al schema Zod:
```typescript
dimension_id: z.string().uuid().optional().nullable(),
```

- [ ] **Step 2: Agregar `dimension_id` al SELECT y al INSERT**

En `GET`: agregar `dimension_id` al `.select('id, nombre, tipo, peso, orden, periodo_id, created_at, periodos(id, nombre)')`
→ `'id, nombre, tipo, peso, orden, periodo_id, dimension_id, created_at, periodos(id, nombre)'`

En `POST`: agregar `...(parsed.data.dimension_id !== undefined ? { dimension_id: parsed.data.dimension_id } : {})` al insert object.

- [ ] **Step 3: Modificar `PatchSchema` en evaluaciones/[id]/route.ts**

Agregar al schema:
```typescript
dimension_id: z.string().uuid().optional().nullable(),
```

En `PATCH`, `dimension_id` se maneja igual que `fecha` (nullable):
```typescript
const { fecha, dimension_id, ...rest } = parsed.data
if (fecha !== undefined) updateData.fecha = fecha
if (dimension_id !== undefined) updateData.dimension_id = dimension_id
```

- [ ] **Step 4: Verificar que evaluaciones existentes sin dimensión siguen funcionando**

```bash
npx vitest run
```
Tests existentes deben seguir pasando.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/materias/[id]/evaluaciones/route.ts
git add src/app/api/v1/evaluaciones/[id]/route.ts
git commit -m "feat: evaluaciones soportan dimension_id opcional"
```

---

### Task 4: UI — Configuración de dimensiones en página de materia

**Files:**
- Create: `src/app/dashboard/[slug]/cursos/[curso_id]/dimensiones-materia-sheet.tsx`
- Modify: `src/app/dashboard/[slug]/cursos/[curso_id]/page.tsx`

**Interfaces:**
- Consumes:
  - `GET /api/v1/materias/[id]/dimensiones` (Task 2)
  - `POST /api/v1/materias/[id]/dimensiones` (Task 2)
  - `DELETE /api/v1/materias/[id]/dimensiones/[dim_id]` (Task 2)
- Produces: botón "Dimensiones" en la fila de cada materia (visible solo para admin); sheet con lista editable de dimensiones

- [ ] **Step 1: Implementar `DimensionesMateriaSheet` (Client Component)**

Props: `{ materiaId: string; materiaNombre: string; initialDimensiones: Dimension[] }`

Donde `Dimension = { id: string; nombre: string; peso: number; orden: number }`.

El sheet muestra:
- Lista de dimensiones existentes con nombre, peso (%) y botón eliminar (ConfirmDialog)
- Formulario al pie: Input nombre + Input peso (number) + botón "Agregar"
- Total de pesos mostrado (no bloquea si no suma 100)

Al agregar: `POST /api/v1/materias/[materiaId]/dimensiones` → `toast.success('Dimensión agregada')` → `router.refresh()`.
Al eliminar: `DELETE /api/v1/materias/[materiaId]/dimensiones/[dim_id]` → `toast.success('Dimensión eliminada')` → `router.refresh()`.

- [ ] **Step 2: Agregar columna "Dimensiones" en `page.tsx` del curso**

En `page.tsx` del curso, en el SELECT de materias agregar:
```typescript
materias_dimensiones(id, nombre, peso, orden)
```

En la tabla de materias (ya existente), agregar una celda con `<DimensionesMateriaSheet>` (solo visible si `isAdminLevel`).

- [ ] **Step 3: Verificar manualmente**

- Admin ve botón "Dimensiones" en cada materia
- Sheet abre, permite agregar "Oral" peso 40, "Escrito" peso 40, "Lectura" peso 20
- Eliminar una dimensión muestra confirm dialog

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/[slug]/cursos/[curso_id]/dimensiones-materia-sheet.tsx
git add src/app/dashboard/[slug]/cursos/[curso_id]/page.tsx
git commit -m "feat: UI configuración de dimensiones por materia"
```

---

### Task 5: UI — Selector de dimensión en nueva/editar evaluación

**Files:**
- Modify: `src/app/dashboard/[slug]/materias/[materia_id]/evaluaciones/nueva-evaluacion-sheet.tsx`
- Modify: `src/app/dashboard/[slug]/materias/[materia_id]/evaluaciones/editar-evaluacion-sheet.tsx`
- Modify: `src/app/dashboard/[slug]/materias/[materia_id]/evaluaciones/page.tsx`

**Interfaces:**
- Consumes: dimensiones de la materia (vienen como prop desde `page.tsx`)
- Produces: Select "Dimensión (opcional)" en los sheets de evaluación; solo visible si la materia tiene dimensiones

- [ ] **Step 1: Cargar dimensiones en `page.tsx`**

Agregar query al server component:
```typescript
const { data: dimensiones } = await supabase
  .from('materias_dimensiones')
  .select('id, nombre')
  .eq('materia_id', materia_id)
  .order('orden')
```
Pasar `dimensiones={dimensiones ?? []}` a `NuevaEvaluacionSheet` y `EditarEvaluacionSheet`.

- [ ] **Step 2: Agregar prop `dimensiones` y campo en `nueva-evaluacion-sheet.tsx`**

Agregar a `Props`:
```typescript
dimensiones: Array<{ id: string; nombre: string }>
```
Agregar estado `dimensionId: string | null = null`.

Render del campo solo si `dimensiones.length > 0`:
```tsx
{dimensiones.length > 0 && (
  <div className="flex flex-col gap-1.5">
    <Label>Dimensión (opcional)</Label>
    <Select value={dimensionId ?? ''} onValueChange={v => setDimensionId(v || null)}>
      <SelectTrigger><SelectValue placeholder="Sin dimensión" /></SelectTrigger>
      <SelectContent>
        {dimensiones.map(d => <SelectItem key={d.id} value={d.id}>{d.nombre}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
)}
```
Incluir `dimension_id: dimensionId` en el body del POST.

- [ ] **Step 3: Idem en `editar-evaluacion-sheet.tsx`**

Prop `dimensiones`, estado `dimensionId` inicializado desde `evaluacion.dimension_id ?? null`.
Incluir `dimension_id: dimensionId` en el body del PATCH.

- [ ] **Step 4: Verificar manualmente**

- Materia sin dimensiones: selector no aparece
- Materia con dimensiones (tras Task 4): selector aparece, permite elegir "Sin dimensión" o una dimensión
- Crear evaluación con dimensión → aparece guardada

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/[slug]/materias/[materia_id]/evaluaciones/
git commit -m "feat: selector de dimensión en nueva/editar evaluación"
```

---

### Task 6: Display de dimensiones en libreta y boletín

**Files:**
- Modify: `src/app/api/v1/alumnos/[id]/libreta/route.ts`
- Modify: `src/app/dashboard/[slug]/libreta/[alumno_id]/boletin/page.tsx`
- Modify: `src/app/dashboard/[slug]/libreta/[alumno_id]/page.tsx`

**Interfaces:**
- Consumes: `evaluaciones.dimension_id` + `materias_dimensiones(nombre, peso)` (Task 1)
- Produces:
  - API libreta incluye `dimension: { id, nombre, peso } | null` en cada evaluación
  - Boletín: sub-filas agrupadas por dimensión cuando existen; sin cambios para materias sin dimensiones
  - Libreta: idem

- [ ] **Step 1: Actualizar query en `libreta/route.ts`**

En el `.select()` de notas, expandir evaluaciones para incluir:
```
materias_dimensiones(id, nombre, peso)
```
Actualizar el type `Evaluacion` para incluir:
```typescript
materias_dimensiones: { id: string; nombre: string; peso: number } | null
```
En la salida, incluir `dimension` en cada evaluación del array.

- [ ] **Step 2: Actualizar `boletin/page.tsx`**

El select de notas ya carga evaluaciones con dimensiones (después del Step 1 del API).

Lógica de agrupación:
```typescript
// Para cada materia, separar notas por dimension
const conDimension = notas.filter(n => n._ev.materias_dimensiones)
const sinDimension = notas.filter(n => !n._ev.materias_dimensiones)

const dimMap = new Map<string, { nombre: string; peso: number; notas: NotaRow[] }>()
for (const nota of conDimension) {
  const dim = nota._ev.materias_dimensiones!
  if (!dimMap.has(dim.id)) dimMap.set(dim.id, { nombre: dim.nombre, peso: dim.peso, notas: [] })
  dimMap.get(dim.id)!.notas.push(nota)
}
```

Render: si `dimMap.size > 0`, mostrar sub-secciones por dimensión con encabezado `dim.nombre (peso: X%)`. Calcular y mostrar promedio por dimensión al pie de cada sub-sección:
```typescript
const promDim = notas.reduce((sum, n) => sum + (n.valor_numerico ?? 0), 0) / notas.filter(n => n.valor_numerico !== null).length
// mostrar solo si hay al menos una nota numérica
```
Las notas `sinDimension` si existen, van en sección sin título al final.

- [ ] **Step 3: Idem en `libreta/page.tsx`** — misma lógica pero en Cards

- [ ] **Step 4: Verificar manualmente end-to-end**

1. Configurar dimensiones Oral/Escrito/Lectura en una materia
2. Crear evaluaciones con esas dimensiones
3. Cargar notas
4. Abrir boletín: ver sub-filas por dimensión

- [ ] **Step 5: Commit**

```bash
git add src/app/api/v1/alumnos/[id]/libreta/route.ts
git add src/app/dashboard/[slug]/libreta/[alumno_id]/boletin/page.tsx
git add src/app/dashboard/[slug]/libreta/[alumno_id]/page.tsx
git commit -m "feat: mostrar sub-scores por dimensión en libreta y boletín"
```
