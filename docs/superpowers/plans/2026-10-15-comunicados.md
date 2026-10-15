# Comunicados con confirmación de lectura — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir a admin/docentes enviar comunicados a los responsables de un curso y registrar confirmaciones de lectura sin que el responsable necesite login.

**Architecture:** Dos tablas nuevas (`comunicados` + `comunicado_confirmaciones`). El flujo POST crea el comunicado, genera una fila de confirmación por responsable deduplicado, y envía emails fire-and-forget. La confirmación pública usa un UUID como token y `createAdminClient()` server-side para escribir sin RLS.

**Tech Stack:** Next.js 16 App Router, Supabase JS v2, TypeScript strict, Zod 4, base-ui, Sonner, Resend (react-email), vitest.

**Spec:** `docs/superpowers/specs/2026-10-15-comunicados-design.md`

## Global Constraints

- Next.js 16: `params` is a Promise — `const { id } = await params`
- Supabase migrations: usar `mcp__supabase__apply_migration`, NO `supabase db push`
- Después de apply_migration: regenerar types con `mcp__supabase__generate_typescript_types` y actualizar `src/types/database.ts`
- Zod 4: `z.object({...}).strict()`, no `.parse()` en rutas — usar `.safeParse()`
- base-ui AlertDialog trigger: `render={<Button/>}` no `asChild`
- Auth en rutas API: `getSession()` → check null → check role; usar `hasAnyRole(session, inst_id, ['admin','docente'])`
- Soft delete: `deleted_at TIMESTAMPTZ` con `.is('deleted_at', null)` en queries
- Email fire-and-forget: no `await` en el bloque de envío, usar `void sendComunicado(...)` o `sendComunicado(...).catch(console.error)` — el comunicado se crea aunque falle el email
- MERGE_BASE: commit HEAD at plan-start (anotar en ledger)

## Review Focus

1. **Responsable con múltiples alumnos en el mismo curso** recibe solo 1 email — `deduplicarResponsables` debe cubrir este caso (Task 2 lo testea).
2. **`curso_id` de otra institución** en POST body — verificar que `curso.institucion_id` coincida con lo que el usuario puede acceder (Task 4 lo testea).
3. **Token de confirmación ya utilizado** (double-click, reenvío) — idempotente: si `confirmed_at IS NOT NULL` ya, responder "ya confirmado" sin error (Task 5 lo testea).
4. **`NEXT_PUBLIC_APP_URL` no definida** al construir `confirm_url` — el comunicado se crea con URL vacía/incorrecta pero no falla (Task 4: verificar fallback).
5. **Curso sin responsables con email** — POST crea el comunicado con `emails_enviados: 0` sin error (Task 4 lo testea con mock de responsables vacío).

---

### Task 1: Migración DB + types

**Files:**
- Create: `supabase/migrations/20261015000003_comunicados.sql`
- Modify: `src/types/database.ts` (regenerar con MCP)

**Interfaces:**
- Consumes: nada (base)
- Produces: tablas `comunicados` y `comunicado_confirmaciones` en DB y en `Database` type de `src/types/database.ts`

- [ ] **Step 1: Escribir y aplicar la migración**

```sql
-- supabase/migrations/20261015000003_comunicados.sql
CREATE TABLE comunicados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id UUID NOT NULL REFERENCES instituciones(id),
  autor_id UUID NOT NULL REFERENCES personas(id),
  titulo TEXT NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 300),
  contenido TEXT NOT NULL CHECK (char_length(contenido) BETWEEN 1 AND 5000),
  curso_id UUID NOT NULL REFERENCES cursos(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_comunicados_inst ON comunicados(institucion_id);
CREATE INDEX idx_comunicados_curso ON comunicados(curso_id);

CREATE TABLE comunicado_confirmaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comunicado_id UUID NOT NULL REFERENCES comunicados(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES personas(id),
  institucion_id UUID NOT NULL,
  email TEXT NOT NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comunicado_id, persona_id)
);
CREATE INDEX idx_conf_comunicado ON comunicado_confirmaciones(comunicado_id);

ALTER TABLE comunicados ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicado_confirmaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comunicados_tenant_select" ON comunicados
  FOR SELECT USING (has_any_role(institucion_id, '{admin,docente}') OR is_superadmin());
CREATE POLICY "comunicados_tenant_insert" ON comunicados
  FOR INSERT WITH CHECK (has_any_role(institucion_id, '{admin,docente}') OR is_superadmin());

CREATE POLICY "conf_tenant_select" ON comunicado_confirmaciones
  FOR SELECT USING (has_any_role(institucion_id, '{admin,docente}') OR is_superadmin());
CREATE POLICY "conf_tenant_insert" ON comunicado_confirmaciones
  FOR INSERT WITH CHECK (has_any_role(institucion_id, '{admin,docente}') OR is_superadmin());
```

Aplicar con `mcp__supabase__apply_migration`.

- [ ] **Step 2: Regenerar types**

Llamar `mcp__supabase__generate_typescript_types` y reemplazar `src/types/database.ts` con el resultado.

- [ ] **Step 3: Verificar tsc**

Run: `npx tsc --noEmit`
Expected: 0 errores

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20261015000003_comunicados.sql src/types/database.ts
git commit -m "feat: schema comunicados + comunicado_confirmaciones"
```

---

### Task 2: Utilidad deduplicarResponsables + schema Zod + tests

**Files:**
- Create: `src/lib/comunicados.ts`
- Create: `src/tests/lib/comunicados.test.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `deduplicarResponsables(rows: { persona_id: string; email: string }[]): { persona_id: string; email: string }[]`
  - `CreateComunicadoSchema` — `z.ZodObject` con `{ titulo, contenido, curso_id }`

- [ ] **Step 1: Escribir tests que fallan**

```typescript
// src/tests/lib/comunicados.test.ts
import { describe, it, expect } from 'vitest'
import { deduplicarResponsables, CreateComunicadoSchema } from '@/lib/comunicados'

const UUID_A = '00000000-0000-0000-0000-000000000001'
const UUID_B = '00000000-0000-0000-0000-000000000002'

describe('deduplicarResponsables', () => {
  it('retorna vacío para array vacío', () => {
    expect(deduplicarResponsables([])).toEqual([])
  })
  it('no modifica array sin duplicados', () => {
    const input = [
      { persona_id: UUID_A, email: 'a@test.com' },
      { persona_id: UUID_B, email: 'b@test.com' },
    ]
    expect(deduplicarResponsables(input)).toEqual(input)
  })
  it('deuplica manteniendo primera aparición', () => {
    const input = [
      { persona_id: UUID_A, email: 'first@test.com' },
      { persona_id: UUID_A, email: 'second@test.com' },
    ]
    expect(deduplicarResponsables(input)).toEqual([{ persona_id: UUID_A, email: 'first@test.com' }])
  })
  it('maneja múltiples persona_ids con duplicados mezclados', () => {
    const input = [
      { persona_id: UUID_A, email: 'a1@test.com' },
      { persona_id: UUID_B, email: 'b@test.com' },
      { persona_id: UUID_A, email: 'a2@test.com' },
    ]
    const result = deduplicarResponsables(input)
    expect(result).toHaveLength(2)
    expect(result[0].email).toBe('a1@test.com')
    expect(result[1].persona_id).toBe(UUID_B)
  })
})

describe('CreateComunicadoSchema', () => {
  it('rechaza titulo vacío', () => {
    const r = CreateComunicadoSchema.safeParse({ titulo: '', contenido: 'x', curso_id: UUID_A })
    expect(r.success).toBe(false)
  })
  it('rechaza titulo > 300 chars', () => {
    const r = CreateComunicadoSchema.safeParse({ titulo: 'x'.repeat(301), contenido: 'x', curso_id: UUID_A })
    expect(r.success).toBe(false)
  })
  it('rechaza curso_id no uuid', () => {
    const r = CreateComunicadoSchema.safeParse({ titulo: 'T', contenido: 'C', curso_id: 'not-a-uuid' })
    expect(r.success).toBe(false)
  })
  it('acepta datos válidos', () => {
    const r = CreateComunicadoSchema.safeParse({ titulo: 'Reunión', contenido: 'Se informa...', curso_id: UUID_A })
    expect(r.success).toBe(true)
  })
})
```

- [ ] **Step 2: Correr tests para verificar que fallan**

Run: `npx vitest run src/tests/lib/comunicados.test.ts`
Expected: FAIL — "Cannot find module '@/lib/comunicados'"

- [ ] **Step 3: Implementar `src/lib/comunicados.ts`**

Exportar `deduplicarResponsables` y `CreateComunicadoSchema`:
- `deduplicarResponsables`: Set de persona_ids vistas, filter
- `CreateComunicadoSchema`: `z.object({ titulo: z.string().min(1).max(300), contenido: z.string().min(1).max(5000), curso_id: z.string().uuid() }).strict()`

- [ ] **Step 4: Correr tests**

Run: `npx vitest run src/tests/lib/comunicados.test.ts`
Expected: PASS 8/8

- [ ] **Step 5: Suite completa**

Run: `npx vitest run`
Expected: todos passing (≥66 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/comunicados.ts src/tests/lib/comunicados.test.ts
git commit -m "feat: deduplicarResponsables y schema comunicados"
```

---

### Task 3: Email template + sendComunicado

**Files:**
- Create: `src/emails/comunicado.tsx`
- Modify: `src/lib/email.ts`

**Interfaces:**
- Consumes: nada
- Produces:
  - `ComunicadoEmail` (default export) — react-email component
  - `ComunicadoEmailProps`: `{ titulo: string; contenido: string; institucion_nombre: string; confirm_url: string }`
  - `sendComunicado(to: string, props: ComunicadoEmailProps, confId: string): Promise<boolean>` en `src/lib/email.ts`

- [ ] **Step 1: Crear `src/emails/comunicado.tsx`**

Seguir el patrón de `cierre-periodo.tsx`:
- Mismo import set de react-email (`Html, Head, Preview, Body, Container, Section, Heading, Text, Button, Hr, Tailwind, pixelBasedPreset`)
- Preview: `"[titulo] — [institucion_nombre]"`
- Body: muestra `titulo`, `contenido` (preservar saltos de línea con `white-space: pre-wrap` via className), botón "Confirmar lectura" → `confirm_url`
- `PreviewProps` al final para desarrollo

- [ ] **Step 2: Agregar `sendComunicado` en `src/lib/email.ts`**

```typescript
export async function sendComunicado(to: string, props: ComunicadoEmailProps, confId: string) {
  const resend = getResend()
  const { error } = await resend.emails.send(
    {
      from: FROM_ADDRESS,
      to: [to],
      subject: `${props.titulo} — ${props.institucion_nombre}`,
      react: createElement(ComunicadoEmail, props),
    },
    { idempotencyKey: `comunicado-confirm/${confId}/${to}` }
  )
  if (error) console.error('[email] sendComunicado failed:', error.message)
  return !error
}
```

- [ ] **Step 3: Verificar tsc**

Run: `npx tsc --noEmit`
Expected: 0 errores

- [ ] **Step 4: Commit**

```bash
git add src/emails/comunicado.tsx src/lib/email.ts
git commit -m "feat: email template comunicado + sendComunicado"
```

---

### Task 4: API routes

**Files:**
- Create: `src/app/api/v1/comunicados/route.ts`
- Create: `src/app/api/v1/comunicados/[id]/route.ts`

**Interfaces:**
- Consumes: `CreateComunicadoSchema`, `deduplicarResponsables` from `@/lib/comunicados`; `sendComunicado` from `@/lib/email`; `Database` types from `@/types/database`
- Produces:
  - `POST /api/v1/comunicados` → `{ data: { id, titulo, contenido, curso_id, created_at, emails_enviados: number } }`
  - `GET /api/v1/comunicados?institucion_id=UUID` → `{ data: ComunicadoListItem[] }`
  - `GET /api/v1/comunicados/[id]` → `{ data: ComunicadoDetail }`

- [ ] **Step 1: Implementar `src/app/api/v1/comunicados/route.ts`**

**POST** — lógica:
1. `getSession()` → null → 401
2. `CreateComunicadoSchema.safeParse(body)` → error → 400
3. Derivar institucion_id: `supabase.from('cursos').select('institucion_id').eq('id', curso_id).is('deleted_at', null).single()` → null → 404
4. `hasAnyRole(session, curso.institucion_id, ['admin','docente'])` → false → 403
5. `session.persona_id` → null → 403
6. INSERT en `comunicados` → error → 500
7. Fetch responsables en 3 queries secuenciales (Supabase no soporta joins profundos en una query):

   ```typescript
   // a) alumnos activos en el curso
   const { data: insc } = await supabase
     .from('alumno_inscripciones')
     .select('alumno_id')
     .eq('curso_id', curso_id)
     .eq('activo', true)
     .is('deleted_at', null)
   const alumnoIds = (insc ?? []).map(i => i.alumno_id)
   if (alumnoIds.length === 0) { /* skip to step 11 with emails_enviados:0 */ }

   // b) responsables de esos alumnos
   const { data: respRaw } = await supabase
     .from('alumno_responsables')
     .select('persona_id')
     .in('alumno_id', alumnoIds)
     .eq('institucion_id', curso.institucion_id)
   const personaIds = [...new Set((respRaw ?? []).map(r => r.persona_id))]
   if (personaIds.length === 0) { /* skip */ }

   // c) emails de esas personas
   const { data: personas } = await supabase
     .from('personas')
     .select('id, email')
     .in('id', personaIds)
     .is('deleted_at', null)
   const responsables = deduplicarResponsables(
     (personas ?? []).filter(p => !!p.email).map(p => ({ persona_id: p.id, email: p.email! }))
   )
   ```

8. INSERT en `comunicado_confirmaciones` (batch) si hay responsables
9. Fetch `instituciones.nombre` para el email
10. Fire-and-forget: `Promise.all(responsables.map(r => sendComunicado(r.email, { titulo, contenido, institucion_nombre, confirm_url }, r.conf_id).catch(console.error)))`
11. Return `ok({ ...comunicado, emails_enviados: responsables.length })`

`confirm_url` = `` `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/confirmar/${conf.id}` ``

**GET** — lógica:
1. `getSession()` + `?institucion_id` param → validar uuid
2. `hasAnyRole` check
3. `supabase.from('comunicados').select('id, titulo, curso_id, created_at, cursos(nombre), comunicado_confirmaciones(id, confirmed_at)').eq('institucion_id', inst_id).is('deleted_at', null).order('created_at', { ascending: false })`
4. Mapear para añadir `total` y `confirmados` counts
5. Return `ok(mapped)`

- [ ] **Step 2: Implementar `src/app/api/v1/comunicados/[id]/route.ts`**

**GET** — lógica:
1. `getSession()` → null → 401
2. `supabase.from('comunicados').select('id, titulo, contenido, curso_id, created_at, cursos(nombre), personas!autor_id(nombre, apellido), comunicado_confirmaciones(id, email, confirmed_at)').eq('id', id).is('deleted_at', null).single()` → null → 404
3. `hasAnyRole(session, comunicado.institucion_id, ['admin','docente'])` → false → 403
4. Calcular `total` y `confirmados` desde confirmaciones
5. Return `ok(detail)`

- [ ] **Step 3: Verificar tsc + suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 errores tsc; tests todos passing

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/v1/comunicados/"
git commit -m "feat: API comunicados — POST create+send, GET list, GET detail"
```

Note (Review Focus #2): en el POST, la verificación de que `curso.institucion_id` pertenece al usuario autenticado está cubierta en el paso 4 del POST.

Note (Review Focus #4): `NEXT_PUBLIC_APP_URL ?? ''` evita crash si no está definida; URL incorrecta no bloquea creación.

Note (Review Focus #5): si no hay responsables, `toUpsert` es `[]`, se omite el INSERT, `emails_enviados: 0`.

---

### Task 5: Página pública de confirmación

**Files:**
- Create: `src/app/confirmar/[conf_id]/page.tsx`

**Interfaces:**
- Consumes: `createAdminClient` from `@/lib/supabase/admin`
- Produces: ruta pública `GET /confirmar/[conf_id]`

- [ ] **Step 1: Implementar `src/app/confirmar/[conf_id]/page.tsx`**

Server component, sin imports de auth:

```typescript
type Params = { params: Promise<{ conf_id: string }> }

export default async function ConfirmarPage({ params }: Params) {
  const { conf_id } = await params
  const supabase = createAdminClient()

  const { data: conf } = await supabase
    .from('comunicado_confirmaciones')
    .select('id, confirmed_at, comunicados(titulo, instituciones(nombre))')
    .eq('id', conf_id)
    .single()

  if (!conf) {
    // generic error — no revelar existencia/no-existencia
    return <ConfirmarLayout><p>El enlace no es válido o ya expiró.</p></ConfirmarLayout>
  }

  if (conf.confirmed_at) {
    return <ConfirmarLayout titulo={titulo}><p>Ya confirmaste la lectura de este comunicado. ¡Gracias!</p></ConfirmarLayout>
  }

  await supabase
    .from('comunicado_confirmaciones')
    .update({ confirmed_at: new Date().toISOString() })
    .eq('id', conf_id)

  return <ConfirmarLayout titulo={titulo}><p>Gracias por confirmar la lectura.</p></ConfirmarLayout>
}
```

`titulo` y `institucion_nombre` vienen del join. `ConfirmarLayout` es un componente inline simple (no necesita su propio archivo) con un `<main>` centrado, logo/título de la app, el nombre de la institución.

- [ ] **Step 2: Verificar tsc + suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 errores tsc; suite passing

- [ ] **Step 3: Commit**

```bash
git add "src/app/confirmar/"
git commit -m "feat: página pública de confirmación de comunicado"
```

Note (Review Focus #3): `if (conf.confirmed_at)` sirve el estado "ya confirmado" sin error ni doble update.

---

### Task 6: Dashboard UI + sidebar

**Files:**
- Create: `src/app/dashboard/[slug]/comunicados/page.tsx`
- Create: `src/app/dashboard/[slug]/comunicados/nuevo-comunicado-sheet.tsx`
- Create: `src/app/dashboard/[slug]/comunicados/[id]/page.tsx`
- Modify: `src/components/app-sidebar.tsx`

**Interfaces:**
- Consumes: endpoints de Task 4
- Produces: rutas `/dashboard/[slug]/comunicados` y `/dashboard/[slug]/comunicados/[id]`; link en sidebar

- [ ] **Step 1: `src/app/dashboard/[slug]/comunicados/page.tsx`**

Server component, patrón igual a `referencia/page.tsx`:
- Auth: `requireSession()` → inst por slug → `hasAnyRole(session, inst.id, ['admin','docente'])` → redirect si no
- Fetch: `GET /api/v1/comunicados?institucion_id=inst.id` — NO, hacer fetch directo con supabase como en el resto de pages (no llamar a la propia API)
- Query directa:
  ```typescript
  supabase.from('comunicados')
    .select('id, titulo, curso_id, created_at, cursos(nombre), comunicado_confirmaciones(id, confirmed_at)')
    .eq('institucion_id', inst.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  ```
- Mapear `total` y `confirmados` counts
- Tabla: Título | Curso | Fecha | Confirmados/Total
- Botón Nuevo comunicado (abre `NuevoComunicadoSheet`)
- Empty state: `MessageSquare` icon + "Aún no hay comunicados."
- Pasar `cursos` al sheet (para el select)

Fetch cursos para el sheet:
```typescript
supabase.from('cursos')
  .select('id, nombre, años_lectivos(nombre)')
  .eq('institucion_id', inst.id)
  .is('deleted_at', null)
  .order('nombre')
```

- [ ] **Step 2: `src/app/dashboard/[slug]/comunicados/nuevo-comunicado-sheet.tsx`**

Client component, patrón igual a `nueva-eval-ref-sheet.tsx`:
- Props: `{ slug: string; cursos: { id: string; nombre: string }[] }`
- Fields: `titulo` (Input, required), `contenido` (Textarea, required), `curso_id` (Select, required)
- POST a `/api/v1/comunicados`, `{ titulo, contenido, curso_id }`
- On success: toast con "Comunicado enviado (N destinatarios)", `router.refresh()`

`Textarea` import desde `@/components/ui/textarea`.

- [ ] **Step 3: `src/app/dashboard/[slug]/comunicados/[id]/page.tsx`**

Server component:
- Auth: mismo patrón
- Query:
  ```typescript
  supabase.from('comunicados')
    .select('id, titulo, contenido, curso_id, created_at, autor_id, cursos(nombre), personas!autor_id(nombre, apellido), comunicado_confirmaciones(id, email, confirmed_at)')
    .eq('id', id)
    .is('deleted_at', null)
    .single()
  ```
- Header: título, badge con "N/M confirmaron", nombre del curso, fecha, autor
- Tabla confirmaciones: Email | Confirmado el (fecha formateada o Badge "Pendiente")

- [ ] **Step 4: Agregar link en `src/components/app-sidebar.tsx`**

En el bloque `{isAdminLevel || isDocente || isResponsable}` (Institución), después de Cursos/Mis materias y antes de Calendario:

```tsx
{(isAdminLevel || isDocente) && (
  <SidebarMenuItem>
    <SidebarMenuButton
      render={<Link href={`/dashboard/${activeSlug}/comunicados`} />}
      isActive={pathname.startsWith(`/dashboard/${activeSlug}/comunicados`)}
    >
      <MessageSquare />
      Comunicados
    </SidebarMenuButton>
  </SidebarMenuItem>
)}
```

Agregar `MessageSquare` a los imports de lucide-react.

- [ ] **Step 5: Verificar tsc + suite completa**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 errores tsc; todos los tests passing (≥74 tests)

- [ ] **Step 6: Commit**

```bash
git add "src/app/dashboard/[slug]/comunicados/" src/components/app-sidebar.tsx
git commit -m "feat: UI comunicados — lista, nuevo sheet, detalle, sidebar"
```
