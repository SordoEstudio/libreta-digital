# Cuaderno v2 + Unidades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el cuaderno en la interfaz primaria del docente: eval-refs editables inline, acciones por columna, nueva instancia desde cuaderno; y agregar unidades (agrupadores temáticos por materia, muchos-a-muchos) con filtro en cuaderno y gestión desde cuaderno y desde el sheet de materia.

**Architecture:** Grupo A (Tasks 1–3) migra el cuaderno a edición inline sin tocar la DB — process columns pasan de `<span>` a `<Input>`, se agrega "Guardar seguimiento" y acciones por header de columna. Grupo B (Tasks 4–9) agrega la tabla `unidades` y dos junctions, API CRUD, chips de filtro en cuaderno, asignación en los sheets de eval-ref, y CRUD de unidades también desde editar-materia-sheet. Las rutas `/referencia` y `/referencia/[ref_id]` se mantienen pero dejan de ser la interfaz primaria.

**Tech Stack:** Next.js 16 App Router (server + client components), Supabase JS v2, TypeScript strict, Zod 4, base-ui (Sheet, AlertDialog), Sonner toasts, Lucide icons.

**Spec:** Conversación de diseño en sesión (ver historial) — no hay doc de spec separado.

## Global Constraints

- `supabase db push` PROHIBIDO — usar solo `mcp__supabase__apply_migration` para cambios de schema.
- `const { params } = await params` — params es Promise en Next.js 16.
- TypeScript strict — no `any` implícito; usar `as unknown as T` cuando sea necesario por el parser de Supabase con caracteres `ñ`.
- Zod 4 para validación en todas las rutas API.
- `npx tsc --noEmit` debe pasar a cero errores antes de cada commit.
- No eliminar las rutas `/referencia` ni `/referencia/[ref_id]` — solo dejan de ser el punto de entrada principal.

## Review Focus

1. **Save proceso con múltiples eval-refs:** guardar llama a `notas-referencia/bulk` una vez por eval-ref con notas; si una falla a mitad, las anteriores ya se guardaron — el handler debe reportar cuántas fallaron sin silenciar errores parciales. → Task 3, step "handleSaveProceso itera eval-refs".
2. **Filtro de unidades con eval-refs sin unidad:** `selectedUnidad === 'sin_unidad'` debe mostrar solo columnas donde `unidadIds.length === 0`; eval-refs no migradas del pasado tienen array vacío. → Task 8, step "filter logic".
3. **Eliminar eval-ref con notas cargadas:** DELETE del API ya soft-deletes la eval-ref; las notas quedan huérfanas pero no se muestran. El AlertDialog en acciones de columna debe advertir esto. → Task 2.
4. **Unidades con eval-refs asignadas al eliminar unidad:** DELETE de unidad elimina los junction rows pero no toca las eval-refs — quedan "sin unidad". El handler debe avisar con toast. → Task 5.
5. **Eval-ref asignada a múltiples unidades:** aparece en la tabla cuando cualquiera de sus unidades está seleccionada (OR, no AND). El filtro debe manejar `unidadIds.includes(selected)` correctamente incluso si `unidadIds` tiene duplicados. → Task 8.

---

## GRUPO A — Cuaderno inline editing

### Task 1: Ampliar props de cuaderno-tabla y page.tsx con metadata completa

**Files:**
- Modify: `src/app/dashboard/[slug]/cuaderno/cuaderno-tabla.tsx`
- Modify: `src/app/dashboard/[slug]/cuaderno/page.tsx`

**Interfaces — nueva forma de `EvalRefCol` y `Props` en cuaderno-tabla:**

```ts
interface EvalRefCol {
  id: string
  nombre: string
  tipo: 'numerica' | 'conceptual'
  periodoId: string | null          // nuevo
  dimensionIds: string[]            // nuevo — para EditarEvalRefSheet
  dimensiones: Dimension[]
  notasMap: Record<string, string>
  // unidadIds agregado en Task 8
}

interface Periodo { id: string; nombre: string; orden: number }

interface Props {
  alumnos: Alumno[]
  evalRefs: EvalRefCol[]
  notaDefinitivaEvalId: string | null
  notaDefinitivaMap: Record<string, string>
  materiaId: string
  periodoId: string
  periodoNombre: string
  periodos: Periodo[]           // nuevo — para sheets de nueva/editar eval-ref
  todasDimensiones: Dimension[] // nuevo — dims de la materia para sheets
}
```

**Interfaces — cuaderno/page.tsx:**
- Fetch `materias_dimensiones(id, nombre, orden)` para la materia seleccionada (ya se hace para `allMaterialDims`, solo agregarlo a los props).
- En el map de `evalRefsRaw`, incluir `periodoId: ev.periodo_id ?? null` y `dimensionIds: ev.evaluacion_referencia_dimensiones.map(d => d.dimension_id)`.

- [ ] **Step 1:** En `cuaderno-tabla.tsx`, ampliar `EvalRefCol` con `periodoId: string | null` y `dimensionIds: string[]`. Ampliar `Props` con `periodos: Periodo[]` y `todasDimensiones: Dimension[]`. El componente por ahora ignora los nuevos campos — solo satisfacer TS.

- [ ] **Step 2:** En `cuaderno/page.tsx`, agregar `periodos` y `todasDimensiones` al objeto pasado a `CuadernoTabla`. `todasDimensiones = allMaterialDims`. En el map de evalRefs, incluir `periodoId` y `dimensionIds`.

- [ ] **Step 3:** Verificar tipos.

```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 4:** Commit.

```bash
git add src/app/dashboard/[slug]/cuaderno/
git commit -m "refactor: ampliar props cuaderno-tabla con metadata eval-ref para acciones"
```

---

### Task 2: Acciones por columna — editar y eliminar eval-ref desde cuaderno

**Files:**
- Create: `src/app/dashboard/[slug]/cuaderno/cuaderno-acciones-col.tsx`
- Modify: `src/app/dashboard/[slug]/cuaderno/cuaderno-tabla.tsx`

**Interfaces — `cuaderno-acciones-col.tsx`:**

```ts
interface EvalRefMeta {
  id: string
  nombre: string
  tipo: 'numerica' | 'conceptual'
  periodoId: string | null
  dimensionIds: string[]
}

interface Periodo { id: string; nombre: string; orden: number }
interface Dimension { id: string; nombre: string; orden: number }

interface Props {
  evalRef: EvalRefMeta
  periodos: Periodo[]
  dimensiones: Dimension[]   // todas las dims de la materia
}
```

Renderiza: `EditarEvalRefSheet` + `AlertDialog` de eliminar (mismo patrón que `eval-ref-acciones.tsx` existente).

El AlertDialog de eliminar advierte: "Se eliminarán también las notas cargadas para esta evaluación."
On delete: `DELETE /api/v1/evaluaciones-referencia/[ref_id]` → toast → `router.refresh()`.

En `cuaderno-tabla.tsx`, en el `<th>` de cada grupo de eval-ref, renderizar `<CuadernoAccionesCol>` a la derecha del nombre. Importar `EditarEvalRefSheet` desde `../materias/[materia_id]/referencia/editar-eval-ref-sheet` — **no**, ese path usa `[materia_id]` dinámico, hay que mover o reimportar. Ver nota abajo.

> **Nota de ruta:** `EditarEvalRefSheet` vive en `src/app/dashboard/[slug]/materias/[materia_id]/referencia/editar-eval-ref-sheet.tsx`. Ese path tiene segmentos dinámicos pero el archivo es un componente client — se puede importar con path relativo desde cuaderno si se usa `../../materias/[materia_id]/referencia/editar-eval-ref-sheet` ... pero los `[]` en el directorio hacen el import raro. Solución: mover los sheets reutilizables a `src/components/eval-ref/` o simplemente copiar las props en el nuevo componente e importar desde una ruta sin `[segmentos]`. Decisión del implementador: la opción más limpia es **mover** `editar-eval-ref-sheet.tsx` y `nueva-eval-ref-sheet.tsx` a `src/components/eval-ref/` y actualizar los imports en `referencia/page.tsx` y `eval-ref-acciones.tsx`.

- [ ] **Step 1:** Mover `editar-eval-ref-sheet.tsx` y `nueva-eval-ref-sheet.tsx` a `src/components/eval-ref/`. Actualizar imports en:
  - `src/app/dashboard/[slug]/materias/[materia_id]/referencia/page.tsx`
  - `src/app/dashboard/[slug]/materias/[materia_id]/referencia/eval-ref-acciones.tsx`

- [ ] **Step 2:** Verificar tipos.
```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 3:** Crear `cuaderno-acciones-col.tsx` con props `{ evalRef: EvalRefMeta, periodos, dimensiones }`. Importa `EditarEvalRefSheet` desde `@/components/eval-ref/editar-eval-ref-sheet` y el AlertDialog de base-ui.

- [ ] **Step 4:** En `cuaderno-tabla.tsx`, en el `<th>` de cada eval-ref, agregar `<CuadernoAccionesCol evalRef={...} periodos={periodos} dimensiones={todasDimensiones} />`.

- [ ] **Step 5:** Verificar tipos.
```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 6:** Commit.
```bash
git add src/components/eval-ref/ src/app/dashboard/[slug]/cuaderno/ src/app/dashboard/[slug]/materias/
git commit -m "feat: acciones editar/eliminar eval-ref desde cuaderno, mover sheets a src/components/eval-ref"
```

---

### Task 3: Proceso inline — inputs editables y guardar seguimiento

**Files:**
- Modify: `src/app/dashboard/[slug]/cuaderno/cuaderno-tabla.tsx`
- Modify: `src/app/dashboard/[slug]/cuaderno/page.tsx`

**Cambios en cuaderno-tabla.tsx:**

Estado nuevo:
```ts
const [valoresProceso, setValoresProceso] = useState<Record<string, string>>(() => {
  const init: Record<string, string> = {}
  for (const ev of evalRefs) {
    for (const [k, v] of Object.entries(ev.notasMap)) {
      init[`${ev.id}::${k}`] = v   // key = `${evalRefId}::${alumnoId}::${dimId|'__'}`
    }
  }
  return init
})
const [savingProceso, setSavingProceso] = useState(false)
```

Key helper:
```ts
function procesoKey(evalRefId: string, alumnoId: string, dimId: string | null) {
  return `${evalRefId}::${alumnoId}::${dimId ?? '__'}`
}
```

Las celdas de proceso cambian de `<span>{val}</span>` a:
```tsx
<Input
  value={valoresProceso[procesoKey(ev.id, alumno.id, dim?.id ?? null)] ?? ''}
  onChange={e => setValoresProceso(prev => ({
    ...prev,
    [procesoKey(ev.id, alumno.id, dim?.id ?? null)]: e.target.value
  }))}
  className="h-7 w-20 text-sm text-center mx-auto"
  placeholder="—"
/>
```

Handler `handleSaveProceso`:
```ts
async function handleSaveProceso() {
  setSavingProceso(true)
  let savedCount = 0
  let errorCount = 0
  for (const ev of evalRefs) {
    const notas = alumnos.flatMap(a => {
      const cols = ev.dimensiones.length > 0 ? ev.dimensiones : [null]
      return cols.map(dim => {
        const val = valoresProceso[procesoKey(ev.id, a.id, dim?.id ?? null)]?.trim() ?? ''
        const num = parseFloat(val)
        return {
          alumno_id: a.id,
          dimension_id: dim?.id ?? null,
          valor_numerico: ev.tipo === 'numerica' && Number.isFinite(num) ? num : null,
          valor_literal: ev.tipo === 'conceptual' && val ? val : null,
        }
      })
    }).filter(n => n.valor_numerico !== null || n.valor_literal !== null)
    if (notas.length === 0) continue
    const res = await fetch('/api/v1/notas-referencia/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evaluacion_ref_id: ev.id, notas }),
    })
    res.ok ? savedCount++ : errorCount++
  }
  setSavingProceso(false)
  if (errorCount > 0) toast.error(`${errorCount} evaluación(es) no se pudieron guardar`)
  else toast.success(`Seguimiento guardado`)
  router.refresh()
}
```

Botón "Guardar seguimiento" junto al botón definitiva (o separado si ambas visibles).

- [ ] **Step 1:** Agregar estado `valoresProceso` inicializado desde `evalRefs[*].notasMap` con prefijo `evalRefId::`.

- [ ] **Step 2:** Reemplazar spans de proceso por `<Input>` controlados.

- [ ] **Step 3:** Implementar `handleSaveProceso` con loop por eval-ref.

- [ ] **Step 4:** Agregar botón "Guardar seguimiento" (visible cuando `showProceso === true`).

- [ ] **Step 5:** Verificar tipos.
```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 6:** Commit.
```bash
git add src/app/dashboard/[slug]/cuaderno/
git commit -m "feat: edición inline de notas de seguimiento en el cuaderno"
```

---

### Task 4: Nueva instancia desde cuaderno

**Files:**
- Modify: `src/app/dashboard/[slug]/cuaderno/page.tsx`
- Modify: `src/app/dashboard/[slug]/cuaderno/cuaderno-tabla.tsx` (o nueva prop en page.tsx que renderiza el sheet)

Estrategia: el botón "Nueva evaluación de seguimiento" vive en el header de la página (`page.tsx` pasa un slot, o se agrega directamente al JSX del server component como componente client). Más simple: agregar el sheet como client component wrapper en el mismo `page.tsx` — pero page.tsx es server. Solución: crear `cuaderno-nueva-instancia-btn.tsx` client que recibe `materiaId, periodos, dimensiones` y renderiza `NuevaEvalRefSheet`.

**Files:**
- Create: `src/app/dashboard/[slug]/cuaderno/cuaderno-nueva-instancia-btn.tsx`
- Modify: `src/app/dashboard/[slug]/cuaderno/page.tsx`

```ts
// cuaderno-nueva-instancia-btn.tsx
interface Props {
  materiaId: string
  periodos: Periodo[]
  dimensiones: Dimension[]
}
// Renderiza NuevaEvalRefSheet desde @/components/eval-ref/nueva-eval-ref-sheet
```

En `page.tsx`, cuando `tableData` existe, renderizar `<CuadernoNuevaInstanciaBtn>` junto al título.

- [ ] **Step 1:** Crear `cuaderno-nueva-instancia-btn.tsx` que importa `NuevaEvalRefSheet` y lo renderiza con las props.

- [ ] **Step 2:** En `page.tsx`, agregar `<CuadernoNuevaInstanciaBtn>` cuando `selectedMateria && selectedPeriodo`.

- [ ] **Step 3:** Verificar tipos.
```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 4:** Commit.
```bash
git add src/app/dashboard/[slug]/cuaderno/
git commit -m "feat: crear nueva eval-ref directamente desde el cuaderno"
```

---

## GRUPO B — Unidades

### Task 5: DB migration — tabla unidades y junctions

**Migration SQL:**

```sql
-- unidades
CREATE TABLE unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id UUID NOT NULL REFERENCES materias(id),
  institucion_id UUID NOT NULL REFERENCES instituciones(id),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  orden INT NOT NULL DEFAULT 1,
  fecha_inicio DATE,
  fecha_fin DATE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON unidades(materia_id) WHERE deleted_at IS NULL;

-- evaluacion_unidades (eval regular ↔ unidad)
CREATE TABLE evaluacion_unidades (
  evaluacion_id UUID NOT NULL REFERENCES evaluaciones(id) ON DELETE CASCADE,
  unidad_id     UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  PRIMARY KEY (evaluacion_id, unidad_id)
);

-- evaluacion_referencia_unidades (eval-ref ↔ unidad)
CREATE TABLE evaluacion_referencia_unidades (
  evaluacion_ref_id UUID NOT NULL REFERENCES evaluaciones_referencia(id) ON DELETE CASCADE,
  unidad_id         UUID NOT NULL REFERENCES unidades(id) ON DELETE CASCADE,
  PRIMARY KEY (evaluacion_ref_id, unidad_id)
);
```

- [ ] **Step 1:** Aplicar migration via `mcp__supabase__apply_migration` con el SQL de arriba.

- [ ] **Step 2:** Actualizar `src/types/database.ts` — agregar `unidades`, `evaluacion_unidades`, `evaluacion_referencia_unidades` (mismo patrón que `evaluacion_referencia_dimensiones` ya presente en el archivo).

- [ ] **Step 3:** Verificar tipos.
```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 4:** Commit.
```bash
git add src/types/database.ts
git commit -m "feat: schema unidades y junctions evaluacion_unidades, evaluacion_referencia_unidades"
```

---

### Task 6: API — CRUD unidades

**Files:**
- Create: `src/app/api/v1/materias/[id]/unidades/route.ts`
- Create: `src/app/api/v1/unidades/[id]/route.ts`

**`GET/POST /api/v1/materias/[id]/unidades`**

```ts
// GET: select id, nombre, descripcion, orden, fecha_inicio, fecha_fin
//      where materia_id = id AND deleted_at IS NULL, order by orden
// POST body: { nombre: string (min 1), descripcion?: string, orden?: number, fecha_inicio?: string|null, fecha_fin?: string|null }
//      Returns: created row
```

Auth: `requireSession`, materia debe pertenecer a `inst_id` del token, rol admin o docente.

**`PATCH/DELETE /api/v1/unidades/[id]`**

```ts
// PATCH body: { nombre?, descripcion?, orden?, fecha_inicio?, fecha_fin? } (all optional)
// DELETE: soft-delete (deleted_at = now()); también elimina junction rows? No — ON DELETE CASCADE en junctions no aplica a soft delete. Así que: antes de soft-delete, eliminar junction rows de evaluacion_unidades y evaluacion_referencia_unidades donde unidad_id = id.
```

- [ ] **Step 1:** Crear `src/app/api/v1/materias/[id]/unidades/route.ts` con GET y POST.

- [ ] **Step 2:** Crear `src/app/api/v1/unidades/[id]/route.ts` con PATCH y DELETE (incluye borrar junction rows antes del soft-delete).

- [ ] **Step 3:** Verificar tipos.
```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 4:** Commit.
```bash
git add src/app/api/v1/materias/ src/app/api/v1/unidades/
git commit -m "feat: API CRUD unidades por materia"
```

---

### Task 7: Extender eval-refs API con unidad_ids

**Files:**
- Modify: `src/app/api/v1/materias/[id]/evaluaciones-referencia/route.ts`
- Modify: `src/app/api/v1/evaluaciones-referencia/[ref_id]/route.ts`

**POST** (crear eval-ref): agregar `unidad_ids: z.array(z.string().uuid()).optional()` al schema. Después de insertar, insertar en `evaluacion_referencia_unidades` si hay ids.

**PATCH** (editar eval-ref): igual, si `unidad_ids !== undefined` → delete all junction rows + re-insertar (mismo patrón que `dimension_ids`).

**GET** (listar eval-refs): incluir `evaluacion_referencia_unidades(unidad_id)` en el select.

- [ ] **Step 1:** Extender POST en `evaluaciones-referencia/route.ts` con `unidad_ids`.

- [ ] **Step 2:** Extender PATCH en `evaluaciones-referencia/[ref_id]/route.ts` con `unidad_ids` (delete + re-insert pattern).

- [ ] **Step 3:** Extender GET para incluir `evaluacion_referencia_unidades(unidad_id)` en select.

- [ ] **Step 4:** Verificar tipos.
```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 5:** Commit.
```bash
git add src/app/api/v1/materias/ src/app/api/v1/evaluaciones-referencia/
git commit -m "feat: eval-refs API acepta y devuelve unidad_ids"
```

---

### Task 8: Sheet gestionar unidades (desde cuaderno)

**Files:**
- Create: `src/app/dashboard/[slug]/cuaderno/cuaderno-unidades-sheet.tsx`
- Modify: `src/app/dashboard/[slug]/cuaderno/page.tsx`
- Modify: `src/app/dashboard/[slug]/cuaderno/cuaderno-nueva-instancia-btn.tsx`

**`cuaderno-unidades-sheet.tsx`:**

```ts
interface Unidad { id: string; nombre: string; orden: number; fechaInicio: string | null; fechaFin: string | null }

interface Props {
  materiaId: string
  unidades: Unidad[]
}
```

Sheet con botón "Gestionar unidades" (ícono `Layers` o `BookmarkPlus`). Contenido:
- Lista de unidades existentes: nombre, botón eliminar (AlertDialog: "Se quitará la unidad de todas las evaluaciones asignadas.")
- Inline add: input nombre + botón agregar → `POST /api/v1/materias/[id]/unidades`
- Delete: `DELETE /api/v1/unidades/[id]` → `router.refresh()`

No hay editar inline en esta iteración — el nombre es suficiente por ahora.

En `page.tsx`:
- Fetch `unidades` para la materia seleccionada: `GET /api/v1/materias/[id]/unidades` (o query directa Supabase).
- Pasar `unidades` a `CuadernoTabla` (para Task 9) y a `CuadernoUnidadesSheet`.
- Renderizar `<CuadernoUnidadesSheet>` junto a `<CuadernoNuevaInstanciaBtn>`.

En `cuaderno-nueva-instancia-btn.tsx`:
- Agregar prop `unidades: Unidad[]`, pasarla a `NuevaEvalRefSheet` (que se extenderá en Task 9).

- [ ] **Step 1:** En `page.tsx`, fetchear unidades para la materia seleccionada via Supabase client. Interfaz: `{ id, nombre, orden, fecha_inicio, fecha_fin }`.

- [ ] **Step 2:** Crear `cuaderno-unidades-sheet.tsx` con lista + add inline + delete con AlertDialog.

- [ ] **Step 3:** Renderizar `CuadernoUnidadesSheet` en `page.tsx` header (junto a nueva instancia btn).

- [ ] **Step 4:** Verificar tipos.
```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 5:** Commit.
```bash
git add src/app/dashboard/[slug]/cuaderno/
git commit -m "feat: gestionar unidades desde el cuaderno"
```

---

### Task 9: Asignación de unidades en sheets nueva/editar eval-ref

**Files:**
- Modify: `src/components/eval-ref/nueva-eval-ref-sheet.tsx`
- Modify: `src/components/eval-ref/editar-eval-ref-sheet.tsx`

Ambos sheets reciben prop `unidades: Unidad[]` (opcional, default `[]`).

Cuando `unidades.length > 0`, mostrar sección "Unidades" con chips toggle (mismo patrón que dimensiones):
```tsx
interface Unidad { id: string; nombre: string }
// State: selectedUnidades: Set<string>
// Chip: onClick toggles id in/out of Set, border-primary cuando activo
```

En submit: incluir `unidad_ids: [...selectedUnidades]` en el body del POST/PATCH.

Para `editar-eval-ref-sheet.tsx`: nueva prop `initialUnidadIds: string[]`, inicializa `selectedUnidades` con ese Set.

Para `eval-ref-acciones.tsx` (ya en `/referencia/`): agregar props `evalRefUnidadIds` y `unidades` — por ahora pasar arrays vacíos (unidades no están disponibles en esa vista todavía, no es la ruta primaria).

- [ ] **Step 1:** Agregar prop `unidades?: Unidad[]` a `NuevaEvalRefSheet`. Cuando length > 0, renderizar sección chips. Incluir `unidad_ids` en POST body.

- [ ] **Step 2:** Agregar props `unidades?: Unidad[]` y `initialUnidadIds?: string[]` a `EditarEvalRefSheet`. Igual chips. Incluir `unidad_ids` en PATCH body.

- [ ] **Step 3:** Actualizar `cuaderno-nueva-instancia-btn.tsx` para pasar `unidades` a `NuevaEvalRefSheet`.

- [ ] **Step 4:** Actualizar `cuaderno-acciones-col.tsx` para pasar `unidades` a `EditarEvalRefSheet` y prop `evalRef.unidadIds`.

- [ ] **Step 5:** Verificar tipos.
```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 6:** Commit.
```bash
git add src/components/eval-ref/ src/app/dashboard/[slug]/cuaderno/
git commit -m "feat: asignar unidades al crear/editar eval-ref"
```

---

### Task 10: Filtro de unidades en cuaderno-tabla

**Files:**
- Modify: `src/app/dashboard/[slug]/cuaderno/cuaderno-tabla.tsx`
- Modify: `src/app/dashboard/[slug]/cuaderno/cuaderno-nueva-instancia-btn.tsx` (solo para prop unidades)
- Modify: `src/app/dashboard/[slug]/cuaderno/page.tsx`

**Cambios en `EvalRefCol`:**
```ts
interface EvalRefCol {
  // ... existente ...
  unidadIds: string[]   // nuevo
}
```

**En `page.tsx`**, al mapear evalRefs: incluir `unidadIds: ev.evaluacion_referencia_unidades.map(u => u.unidad_id)`. Incluir `evaluacion_referencia_unidades(unidad_id)` en el select de eval-refs. Pasar `unidades` a `CuadernoTabla`.

**Nuevas props en `CuadernoTabla`:**
```ts
interface Unidad { id: string; nombre: string }
// Props agrega:
unidades: Unidad[]
```

**Estado y lógica de filtro:**
```ts
const [selectedUnidad, setSelectedUnidad] = useState<string>('todas')
// 'todas' | 'sin_unidad' | unidad_id

const evalRefsFiltradas = useMemo(() =>
  selectedUnidad === 'todas' ? evalRefs
  : selectedUnidad === 'sin_unidad' ? evalRefs.filter(ev => ev.unidadIds.length === 0)
  : evalRefs.filter(ev => ev.unidadIds.includes(selectedUnidad))
, [evalRefs, selectedUnidad])
```

**UI chips de filtro** (encima de toggle chips existentes):
```tsx
{unidades.length > 0 && (
  <div className="flex items-center gap-2 flex-wrap">
    <span className="text-xs text-muted-foreground">Unidad:</span>
    {(['todas', ...unidades.map(u => u.id), 'sin_unidad'] as const).map(uid => (
      <button key={uid} onClick={() => setSelectedUnidad(uid)}
        className={`... ${selectedUnidad === uid ? 'bg-primary ...' : '...'}`}
      >
        {uid === 'todas' ? 'Todas' : uid === 'sin_unidad' ? 'Sin unidad' : unidades.find(u => u.id === uid)?.nombre}
      </button>
    ))}
  </div>
)}
```

Usar `evalRefsFiltradas` en lugar de `evalRefs` para renderizar columnas.

- [ ] **Step 1:** Ampliar `EvalRefCol` con `unidadIds: string[]`. Ampliar `Props` con `unidades: Unidad[]`.

- [ ] **Step 2:** En `page.tsx`, incluir `evaluacion_referencia_unidades(unidad_id)` en el select de eval-refs. Pasar `unidadIds` y `unidades` a `CuadernoTabla`.

- [ ] **Step 3:** Agregar estado `selectedUnidad` y `evalRefsFiltradas` en `cuaderno-tabla.tsx`.

- [ ] **Step 4:** Renderizar chips de filtro por unidad.

- [ ] **Step 5:** Reemplazar `evalRefs` por `evalRefsFiltradas` en el render de columnas de proceso.

- [ ] **Step 6:** Verificar tipos.
```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 7:** Commit.
```bash
git add src/app/dashboard/[slug]/cuaderno/
git commit -m "feat: filtro por unidad en cuaderno"
```

---

### Task 11: Unidades en editar-materia-sheet

**Files:**
- Modify: `src/app/dashboard/[slug]/cursos/[curso_id]/editar-materia-sheet.tsx`
- Modify: `src/app/dashboard/[slug]/cursos/[curso_id]/page.tsx`

**En `editar-materia-sheet.tsx`:**

Nuevas interfaces y estado:
```ts
interface Unidad { id: string; nombre: string; orden: number }
// Props: agrega initialUnidades: Unidad[]
// State: unidades, unidadNombre (string), unidadAdding (boolean), unidadDeletingId (string|null)
```

En `useEffect` on open: fetch unidades actuales `GET /api/v1/materias/[id]/unidades`.

Sección "Unidades" debajo de Dimensiones (mismo patrón visual):
- Lista con nombre + botón eliminar (AlertDialog)
- Inline add: input + Enter o botón → `POST /api/v1/materias/[id]/unidades`
- Delete: `DELETE /api/v1/unidades/[id]`

En `page.tsx` del curso: agregar `initialUnidades` prop (vacío por ahora, se carga on open).

- [ ] **Step 1:** Agregar estado de unidades a `editar-materia-sheet.tsx`. Fetch on open.

- [ ] **Step 2:** Implementar `handleAddUnidad` y `handleDeleteUnidad` (sin HAS_NOTAS check — no aplica para unidades, solo soft-delete directo).

- [ ] **Step 3:** Renderizar sección Unidades en JSX del sheet, debajo de Dimensiones.

- [ ] **Step 4:** Actualizar `page.tsx` del curso para pasar `initialUnidades={[]}` (las unidades se cargan on open del sheet, mismo patrón que docentes/plantillas).

- [ ] **Step 5:** Verificar tipos.
```bash
npx tsc --noEmit
```
Expected: 0 errors.

- [ ] **Step 6:** Commit.
```bash
git add src/app/dashboard/[slug]/cursos/
git commit -m "feat: gestionar unidades desde sheet de edición de materia"
```

---

## Archivos creados/modificados — resumen

| Archivo | Acción |
|---|---|
| `src/components/eval-ref/nueva-eval-ref-sheet.tsx` | Mover desde referencia/ + agregar unidades |
| `src/components/eval-ref/editar-eval-ref-sheet.tsx` | Mover desde referencia/ + agregar unidades |
| `src/app/dashboard/[slug]/cuaderno/cuaderno-tabla.tsx` | Inline editing, col actions, unit filter |
| `src/app/dashboard/[slug]/cuaderno/cuaderno-acciones-col.tsx` | Nuevo |
| `src/app/dashboard/[slug]/cuaderno/cuaderno-nueva-instancia-btn.tsx` | Nuevo |
| `src/app/dashboard/[slug]/cuaderno/cuaderno-unidades-sheet.tsx` | Nuevo |
| `src/app/dashboard/[slug]/cuaderno/page.tsx` | Props extras, unidades, periodos, dims |
| `src/app/dashboard/[slug]/cursos/[curso_id]/editar-materia-sheet.tsx` | Sección Unidades |
| `src/app/dashboard/[slug]/materias/[materia_id]/referencia/page.tsx` | Actualizar imports |
| `src/app/dashboard/[slug]/materias/[materia_id]/referencia/eval-ref-acciones.tsx` | Actualizar imports |
| `src/app/api/v1/materias/[id]/unidades/route.ts` | Nuevo |
| `src/app/api/v1/unidades/[id]/route.ts` | Nuevo |
| `src/app/api/v1/materias/[id]/evaluaciones-referencia/route.ts` | unidad_ids |
| `src/app/api/v1/evaluaciones-referencia/[ref_id]/route.ts` | unidad_ids |
| `src/types/database.ts` | unidades + junctions |
