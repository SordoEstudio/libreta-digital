# Módulo de Contenidos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repositorio de materiales (links, archivos, imágenes) por curso→materia→unidad, visible en modo lectura para alumnos y responsables; editable por docentes y admins.

**Architecture:** Módulo activado por `instituciones.modulo_contenidos`. Dos tablas nuevas (`unidades_contenido`, `contenidos`) con soft-delete y campo `publicado`. Archivos en bucket privado `contenidos` en Supabase Storage; acceso exclusivo por signed URLs generadas server-side. API REST bajo `/api/v1/contenidos/`. UI: server components fetchean datos + signed URLs; client components manejan edición y upload.

**Tech Stack:** Next.js 16 App Router, Supabase JS v2, TypeScript strict, Zod 4, Tailwind v4, base-ui/shadcn. Sin test framework — verificación: `npx tsc --noEmit` + checks manuales.

**Spec:** `docs/superpowers/specs/2026-10-19-contenidos-design.md`

## Global Constraints

- `supabase db push` PROHIBIDO — solo `mcp__supabase__apply_migration`
- Nunca incluir `año_lectivo_id` en `.select()` de tabla `cursos` — usar `select('*')`
- API routes: usar `getSession` (no `requireSession`)
- Git directo a master (sin feature branches)
- Tipos de item exactos: `'link' | 'archivo' | 'imagen'`
- Tamaño máximo de archivo: 10 MB
- Bucket Storage: `contenidos` (privado)
- Path Storage: `{institucion_id}/{materia_id}/{unidad_id}/{uuid}-{filename}`
- Signed URL TTL: 3600 segundos (1 hora)
- Zod 4 (no Zod 3) — importar desde `'zod'`
- Reordenar items: up/down buttons, optimista, sin drag library

## Review Focus

1. **Docente de otra materia accede a contenidos ajenos** → debe recibir 403; verificar en Task 2/3 que la resolución de materia valida `hasAnyRole` con el `institucion_id` correcto.
2. **Módulo desactivado (`modulo_contenidos = false`) aun muestra datos** → página debe retornar `notFound()` antes de cualquier query de contenidos; verificar en Task 5.
3. **Upload con tipo MIME no permitido** → API debe rechazar con 422 antes de subir a Storage; verificar en Task 3 step de upload.
4. **Item `tipo=link` recibe `storage_path`** → check constraint en DB + validación Zod deben rechazarlo; verificar en Task 1 (constraint) y Task 3 (schema).
5. **URL firmada expirada mostrada a alumno** → las signed URLs se generan en el server component en cada request, expiran en 1h; TTL es suficiente para una sesión normal. Documentar en código.

---

## File Map

```
supabase/migrations/
  20261019000001_contenidos.sql            ← Task 1

src/app/api/v1/contenidos/
  unidades/route.ts                        ← Task 2  (POST crear unidad)
  unidades/[id]/route.ts                   ← Task 2  (PUT, DELETE)
  items/route.ts                           ← Task 3  (POST crear item link)
  items/[id]/route.ts                      ← Task 3  (PUT, DELETE)
  items/upload/route.ts                    ← Task 3  (POST multipart, archivo/imagen)
  items/[id]/download/route.ts             ← Task 3  (GET → 302 signed URL)

src/app/dashboard/[slug]/contenidos/
  [curso_id]/[materia_id]/
    page.tsx                               ← Task 4  (server component)
    contenidos-editor.tsx                  ← Task 4  (client, lista + edición)
    item-sheet.tsx                         ← Task 4  (client, form link/archivo)
    unidad-form.tsx                        ← Task 4  (client, inline create/edit unidad)
  [curso_id]/page.tsx                      ← Task 5  (lista materias del curso)
  page.tsx                                 ← Task 5  (lista cursos)

src/components/app-sidebar.tsx             ← Task 5  (add "Contenidos" item)
```

---

## Task 1: Migración DB + bucket Storage

**Files:**
- Create: `supabase/migrations/20261019000001_contenidos.sql`

**Interfaces:**
- Produces: tablas `unidades_contenido`, `contenidos`; campo `instituciones.modulo_contenidos`; bucket `contenidos` en Storage; políticas RLS

- [ ] **Step 1: Escribir la migración**

  ```sql
  -- Campo en instituciones
  ALTER TABLE instituciones
    ADD COLUMN IF NOT EXISTS modulo_contenidos BOOLEAN NOT NULL DEFAULT false;

  -- Unidades (carpetas)
  CREATE TABLE unidades_contenido (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    materia_id   UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
    nombre       TEXT NOT NULL CHECK (char_length(nombre) <= 120),
    descripcion  TEXT CHECK (char_length(descripcion) <= 500),
    orden        INT NOT NULL DEFAULT 0,
    publicado    BOOLEAN NOT NULL DEFAULT true,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ
  );

  -- Items de contenido
  CREATE TABLE contenidos (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unidad_id    UUID NOT NULL REFERENCES unidades_contenido(id) ON DELETE CASCADE,
    tipo         TEXT NOT NULL CHECK (tipo IN ('link','archivo','imagen')),
    titulo       TEXT NOT NULL CHECK (char_length(titulo) <= 200),
    url          TEXT,
    storage_path TEXT,
    nota         TEXT CHECK (char_length(nota) <= 1000),
    dimension_id UUID REFERENCES materias_dimensiones(id) ON DELETE SET NULL,
    orden        INT NOT NULL DEFAULT 0,
    publicado    BOOLEAN NOT NULL DEFAULT true,
    autor_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at   TIMESTAMPTZ,
    CHECK (
      (tipo = 'link'                    AND url IS NOT NULL AND storage_path IS NULL) OR
      (tipo IN ('archivo','imagen')     AND storage_path IS NOT NULL AND url IS NULL)
    )
  );

  -- Índices
  CREATE INDEX ON unidades_contenido(materia_id) WHERE deleted_at IS NULL;
  CREATE INDEX ON contenidos(unidad_id) WHERE deleted_at IS NULL;

  -- RLS: unidades_contenido
  ALTER TABLE unidades_contenido ENABLE ROW LEVEL SECURITY;

  -- Alumnos: SELECT solo publicado, sin deleted
  CREATE POLICY "unidades_alumno_select" ON unidades_contenido
    FOR SELECT TO authenticated
    USING (
      publicado = true AND deleted_at IS NULL AND
      EXISTS (
        SELECT 1 FROM materias m
        JOIN cursos c ON c.id = m.curso_id
        JOIN alumno_inscripciones ai ON ai.curso_id = c.id
          AND ai.alumno_id = (
            SELECT alumno_id FROM alumno_responsables ar
            WHERE ar.persona_id = auth.uid()
              AND ar.institucion_id = m.institucion_id
            LIMIT 1
          )
          AND ai.activo = true AND ai.deleted_at IS NULL
        WHERE m.id = unidades_contenido.materia_id
          AND m.deleted_at IS NULL
      )
    );

  -- Responsables: SELECT solo publicado
  CREATE POLICY "unidades_responsable_select" ON unidades_contenido
    FOR SELECT TO authenticated
    USING (
      publicado = true AND deleted_at IS NULL AND
      EXISTS (
        SELECT 1 FROM alumno_responsables ar
        JOIN alumno_inscripciones ai ON ai.alumno_id = ar.alumno_id
        JOIN materias m ON m.curso_id = ai.curso_id
        WHERE ar.persona_id = auth.uid()
          AND m.id = unidades_contenido.materia_id
          AND ai.activo = true AND ai.deleted_at IS NULL
          AND m.deleted_at IS NULL
      )
    );

  -- Docente/admin: SELECT todas (incluso borrador)
  CREATE POLICY "unidades_staff_select" ON unidades_contenido
    FOR SELECT TO authenticated
    USING (
      deleted_at IS NULL AND
      EXISTS (
        SELECT 1 FROM materias m
        JOIN memberships mb ON mb.institucion_id = m.institucion_id
          AND mb.persona_id = auth.uid()
          AND mb.rol IN ('admin','docente')
          AND mb.deleted_at IS NULL
        WHERE m.id = unidades_contenido.materia_id
          AND m.deleted_at IS NULL
      )
    );

  CREATE POLICY "unidades_staff_insert" ON unidades_contenido
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM materias m
        JOIN memberships mb ON mb.institucion_id = m.institucion_id
          AND mb.persona_id = auth.uid()
          AND mb.rol IN ('admin','docente')
          AND mb.deleted_at IS NULL
        WHERE m.id = unidades_contenido.materia_id
          AND m.deleted_at IS NULL
      )
    );

  CREATE POLICY "unidades_staff_update" ON unidades_contenido
    FOR UPDATE TO authenticated
    USING (
      deleted_at IS NULL AND
      EXISTS (
        SELECT 1 FROM materias m
        JOIN memberships mb ON mb.institucion_id = m.institucion_id
          AND mb.persona_id = auth.uid()
          AND mb.rol IN ('admin','docente')
          AND mb.deleted_at IS NULL
        WHERE m.id = unidades_contenido.materia_id
          AND m.deleted_at IS NULL
      )
    );

  -- RLS: contenidos (mismo patrón)
  ALTER TABLE contenidos ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "contenidos_alumno_select" ON contenidos
    FOR SELECT TO authenticated
    USING (
      publicado = true AND deleted_at IS NULL AND
      EXISTS (
        SELECT 1 FROM unidades_contenido uc
        JOIN materias m ON m.id = uc.materia_id
        JOIN alumno_responsables ar ON ar.institucion_id = m.institucion_id
          AND ar.persona_id = auth.uid()
        JOIN alumno_inscripciones ai ON ai.alumno_id = ar.alumno_id
          AND ai.curso_id = m.curso_id
          AND ai.activo = true AND ai.deleted_at IS NULL
        WHERE uc.id = contenidos.unidad_id
          AND uc.deleted_at IS NULL AND m.deleted_at IS NULL
      )
    );

  CREATE POLICY "contenidos_responsable_select" ON contenidos
    FOR SELECT TO authenticated
    USING (
      publicado = true AND deleted_at IS NULL AND
      EXISTS (
        SELECT 1 FROM unidades_contenido uc
        JOIN materias m ON m.id = uc.materia_id
        JOIN alumno_responsables ar ON ar.persona_id = auth.uid()
        JOIN alumno_inscripciones ai ON ai.alumno_id = ar.alumno_id
          AND ai.curso_id = m.curso_id
          AND ai.activo = true AND ai.deleted_at IS NULL
        WHERE uc.id = contenidos.unidad_id
          AND uc.deleted_at IS NULL AND m.deleted_at IS NULL
      )
    );

  CREATE POLICY "contenidos_staff_select" ON contenidos
    FOR SELECT TO authenticated
    USING (
      deleted_at IS NULL AND
      EXISTS (
        SELECT 1 FROM unidades_contenido uc
        JOIN materias m ON m.id = uc.materia_id
        JOIN memberships mb ON mb.institucion_id = m.institucion_id
          AND mb.persona_id = auth.uid()
          AND mb.rol IN ('admin','docente')
          AND mb.deleted_at IS NULL
        WHERE uc.id = contenidos.unidad_id
          AND uc.deleted_at IS NULL AND m.deleted_at IS NULL
      )
    );

  CREATE POLICY "contenidos_staff_insert" ON contenidos
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM unidades_contenido uc
        JOIN materias m ON m.id = uc.materia_id
        JOIN memberships mb ON mb.institucion_id = m.institucion_id
          AND mb.persona_id = auth.uid()
          AND mb.rol IN ('admin','docente')
          AND mb.deleted_at IS NULL
        WHERE uc.id = contenidos.unidad_id
          AND uc.deleted_at IS NULL AND m.deleted_at IS NULL
      )
    );

  CREATE POLICY "contenidos_staff_update" ON contenidos
    FOR UPDATE TO authenticated
    USING (
      deleted_at IS NULL AND
      EXISTS (
        SELECT 1 FROM unidades_contenido uc
        JOIN materias m ON m.id = uc.materia_id
        JOIN memberships mb ON mb.institucion_id = m.institucion_id
          AND mb.persona_id = auth.uid()
          AND mb.rol IN ('admin','docente')
          AND mb.deleted_at IS NULL
        WHERE uc.id = contenidos.unidad_id
          AND uc.deleted_at IS NULL AND m.deleted_at IS NULL
      )
    );

  -- Storage bucket
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'contenidos', 'contenidos', false,
    10485760,
    ARRAY[
      'image/jpeg','image/png','image/gif','image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ]
  ) ON CONFLICT (id) DO NOTHING;
  ```

- [ ] **Step 2: Aplicar migración**

  Aplicar con `mcp__supabase__apply_migration`. Name: `contenidos`.

- [ ] **Step 3: Verificar**

  ```sql
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'instituciones' AND column_name = 'modulo_contenidos';

  SELECT table_name FROM information_schema.tables
  WHERE table_name IN ('unidades_contenido','contenidos');

  SELECT id FROM storage.buckets WHERE id = 'contenidos';
  ```

  Esperado: 3 filas (columna, 2 tablas, bucket).

- [ ] **Step 4: Commit**

  ```bash
  git add supabase/migrations/20261019000001_contenidos.sql
  git commit -m "feat: migración módulo de contenidos"
  ```

---

## Task 2: API — unidades CRUD

**Files:**
- Create: `src/app/api/v1/contenidos/unidades/route.ts`
- Create: `src/app/api/v1/contenidos/unidades/[id]/route.ts`

**Interfaces:**
- Consumes: `getSession`, `isSuperadmin`, `hasAnyRole` de `@/lib/auth`; `ok`, `created`, `Err` de `@/lib/api`; `createClient` de `@/lib/supabase/server`
- Produces:
  - `POST /api/v1/contenidos/unidades` body `{ materia_id: string, nombre: string, descripcion?: string, orden?: number }` → `201 { data: { id, nombre, descripcion, orden, publicado } }`
  - `PUT /api/v1/contenidos/unidades/[id]` body `{ nombre?, descripcion?, publicado?, orden? }` → `200 { data: updated }`
  - `DELETE /api/v1/contenidos/unidades/[id]` → `204`

- [ ] **Step 1: Implementar `src/app/api/v1/contenidos/unidades/route.ts`**

  Solo `POST`. Patrón idéntico al de `/api/v1/materias/[id]/unidades/route.ts` pero:
  - Recibe `materia_id` en el body (no en path)
  - Resuelve `materia → institucion_id → modulo_contenidos`; si `modulo_contenidos = false`: `Err.notFound('Módulo no habilitado')`
  - Verifica rol docente/admin sobre `institucion_id`
  - Inserta en `unidades_contenido`

  Schema Zod:
  ```ts
  const CreateUnidadSchema = z.object({
    materia_id:  z.string().uuid(),
    nombre:      z.string().min(1).max(120),
    descripcion: z.string().max(500).optional().nullable(),
    orden:       z.number().int().min(0).default(0),
  })
  ```

- [ ] **Step 2: Implementar `src/app/api/v1/contenidos/unidades/[id]/route.ts`**

  `PUT` y `DELETE`. Resuelve `unidad → materia → institucion_id` para cada operación. Soft-delete en DELETE (set `deleted_at = now()`).

  Schema PUT:
  ```ts
  const UpdateUnidadSchema = z.object({
    nombre:      z.string().min(1).max(120).optional(),
    descripcion: z.string().max(500).nullable().optional(),
    publicado:   z.boolean().optional(),
    orden:       z.number().int().min(0).optional(),
  })
  ```

- [ ] **Step 3: Type check**

  Run: `npx tsc --noEmit`
  Expected: no errors

- [ ] **Step 4: Commit**

  ```bash
  git add src/app/api/v1/contenidos/
  git commit -m "feat: API CRUD unidades de contenido"
  ```

---

## Task 3: API — items CRUD + upload + download

**Files:**
- Create: `src/app/api/v1/contenidos/items/route.ts`
- Create: `src/app/api/v1/contenidos/items/[id]/route.ts`
- Create: `src/app/api/v1/contenidos/items/upload/route.ts`
- Create: `src/app/api/v1/contenidos/items/[id]/download/route.ts`

**Interfaces:**
- Consumes: Task 2 patterns; también `createAdminClient` de `@/lib/supabase/admin` para uploads
- Produces:
  - `POST /api/v1/contenidos/items` body `{ unidad_id, tipo:'link', titulo, url, nota?, dimension_id?, orden? }` → `201 { data: item }`
  - `PUT /api/v1/contenidos/items/[id]` body `{ titulo?, url?, nota?, dimension_id?, publicado?, orden? }` → `200`
  - `DELETE /api/v1/contenidos/items/[id]` → `204`
  - `POST /api/v1/contenidos/items/upload` multipart `file` + `unidad_id` + `titulo` + `nota?` + `dimension_id?` + `orden?` → `201 { data: item }`
  - `GET /api/v1/contenidos/items/[id]/download` → `302` a signed URL (TTL 3600s)

- [ ] **Step 1: Implementar `items/route.ts` — solo tipo `link`**

  Schema Zod:
  ```ts
  const CreateItemLinkSchema = z.object({
    unidad_id:    z.string().uuid(),
    tipo:         z.literal('link'),
    titulo:       z.string().min(1).max(200),
    url:          z.string().url(),
    nota:         z.string().max(1000).optional().nullable(),
    dimension_id: z.string().uuid().optional().nullable(),
    orden:        z.number().int().min(0).default(0),
  })
  ```

  Resuelve `unidad → materia → inst → modulo_contenidos`. Inserta con `url`, `storage_path = null`.

- [ ] **Step 2: Implementar `items/[id]/route.ts` — PUT y DELETE**

  PUT: campos opcionales `titulo`, `url`, `nota`, `dimension_id`, `publicado`, `orden`. Solo actualiza los campos recibidos. DELETE: soft-delete.

- [ ] **Step 3: Implementar `items/upload/route.ts`**

  Recibe multipart/form-data: `file` (Blob), `unidad_id` (string), `titulo`, `nota?`, `dimension_id?`, `orden?`.

  Flujo:
  1. Parsear formData con `request.formData()`
  2. Validar: `unidad_id` válido → resolve unidad → materia → inst (modulo check + auth)
  3. Validar MIME: debe estar en la lista del bucket; si no → `Err.validation('Tipo de archivo no permitido')`
  4. Validar size ≤ 10485760 bytes; si no → `Err.validation('Archivo supera 10 MB')`
  5. Generar path: `{inst_id}/{materia_id}/{unidad_id}/{randomUUID()}-{filename.replace(/[^a-z0-9._-]/gi,'_')}`
  6. Subir con `adminClient.storage.from('contenidos').upload(path, buffer, { contentType })`
  7. Si error Storage → `Err.server(...)`
  8. Insertar en `contenidos` con `tipo = file.type.startsWith('image/') ? 'imagen' : 'archivo'`, `storage_path = path`, `url = null`
  9. Retornar `created(item)`

  Tipos de archivo permitidos (MIME list exacta):
  ```ts
  const ALLOWED_MIME = new Set([
    'image/jpeg','image/png','image/gif','image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ])
  ```

- [ ] **Step 4: Implementar `items/[id]/download/route.ts`**

  GET: resolve item → verifica auth (docente/admin ó alumno/responsable inscripto).
  Genera signed URL: `adminClient.storage.from('contenidos').createSignedUrl(item.storage_path, 3600)`
  Retorna `NextResponse.redirect(signedUrl.data.signedUrl)`

- [ ] **Step 5: Type check**

  Run: `npx tsc --noEmit`
  Expected: no errors

- [ ] **Step 6: Commit**

  ```bash
  git add src/app/api/v1/contenidos/items/
  git commit -m "feat: API items de contenido + upload + download"
  ```

---

## Task 4: Vista docente — página de materia

**Files:**
- Create: `src/app/dashboard/[slug]/contenidos/[curso_id]/[materia_id]/page.tsx`
- Create: `src/app/dashboard/[slug]/contenidos/[curso_id]/[materia_id]/contenidos-editor.tsx`
- Create: `src/app/dashboard/[slug]/contenidos/[curso_id]/[materia_id]/item-sheet.tsx`
- Create: `src/app/dashboard/[slug]/contenidos/[curso_id]/[materia_id]/unidad-form.tsx`

**Interfaces:**
- Consumes: Tasks 2 y 3 API endpoints; tablas `unidades_contenido`, `contenidos`, `materias`, `materias_dimensiones`
- Produces: página funcional completa (docente puede crear/editar/eliminar unidades e items)

- [ ] **Step 1: Implementar `page.tsx` — server component**

  Params: `{ slug, curso_id, materia_id }`.

  Flujo:
  1. `requireSession()`, `createClient()`
  2. Fetch `instituciones` por slug → verificar `modulo_contenidos = true` (si no: `notFound()`)
  3. Verificar rol: docente o admin. Responsables y alumnos no acceden a esta ruta (→ `redirect`)
  4. Fetch materia con nombre (join `materias_catalogo`)
  5. Fetch unidades: `unidades_contenido` where `materia_id`, `deleted_at IS NULL`, order by `orden`
  6. Fetch items: `contenidos` where `unidad_id IN (ids)`, `deleted_at IS NULL`, order by `unidad_id, orden`
  7. Para items con `storage_path != null`: generar signed URLs usando `adminClient.storage.from('contenidos').createSignedUrl(path, 3600)` → map `item.signedUrl`
  8. Fetch `materias_dimensiones` where `materia_id`, `deleted_at IS NULL` para el dropdown
  9. Renderizar heading + `<ContenidosEditor />` (client component) con todos los datos

  Tipo a pasar al editor:
  ```ts
  type UnidadConItems = {
    id: string; nombre: string; descripcion: string | null
    orden: number; publicado: boolean
    items: (ContenidoItem & { signedUrl?: string })[]
  }
  type ContenidoItem = {
    id: string; tipo: 'link'|'archivo'|'imagen'; titulo: string
    url: string | null; storage_path: string | null; nota: string | null
    dimension_id: string | null; orden: number; publicado: boolean
  }
  ```

- [ ] **Step 2: Implementar `contenidos-editor.tsx` — client component**

  Props: `unidades: UnidadConItems[]`, `dimensiones: { id: string; nombre: string }[]`, `materiaId: string`, `slug: string`, `cursoId: string`, `isEditor: boolean` (docente/admin).

  Estado local: lista optimista de unidades (con sus items). Usa `useRouter().refresh()` tras mutaciones exitosas.

  Renderiza por cada unidad:
  - Header: nombre, badge "Borrador" si `!publicado`, botones editar nombre + toggle publicado + eliminar
  - Lista de items: ícono por tipo (🔗 link, 📄 archivo, 🖼 imagen), título, badge dimensión, nota en cursiva, botones ↑↓ orden, editar, eliminar
  - Botón "+ Agregar material" → abre `<ItemSheet />`

  Si `!isEditor`: render idéntico pero sin botones de edición.

  Reordenar items: botones ↑ y ↓. Al clic: actualizar orden optimistamente en state, luego `PUT /api/v1/contenidos/items/[id]` con nuevo `orden`. Si falla: `toast.error` + revertir.

  Eliminar unidad: `DELETE /api/v1/contenidos/unidades/[id]` → `router.refresh()`.
  Eliminar item: `DELETE /api/v1/contenidos/items/[id]` → `router.refresh()`.

- [ ] **Step 3: Implementar `item-sheet.tsx` — client component**

  Sheet/drawer con dos modos: crear o editar.

  Campos:
  - Tipo: tabs o radio `link | archivo | imagen`
  - Si `link`: input URL (required)
  - Si `archivo`/`imagen`: `<input type="file" accept="...">` (requerido al crear)
  - Título (required, max 200)
  - Nota (optional textarea, max 1000)
  - Dimensión: select con dimensiones de la materia (optional)

  Al guardar link: `POST /api/v1/contenidos/items` con body JSON.
  Al guardar archivo/imagen: `POST /api/v1/contenidos/items/upload` con `FormData`.

  Mostrar progress de upload (estado `uploading: boolean`). Al completar: `router.refresh()` + cerrar sheet.

- [ ] **Step 4: Implementar `unidad-form.tsx` — client component**

  Form inline para crear/editar unidad. Campos: nombre (required), descripción (optional).
  Guardar: `POST /api/v1/contenidos/unidades` (crear) o `PUT /api/v1/contenidos/unidades/[id]` (editar).
  Al completar: `router.refresh()`.

- [ ] **Step 5: Type check**

  Run: `npx tsc --noEmit`
  Expected: no errors

- [ ] **Step 6: Verificación manual**

  Con `modulo_contenidos = true` en la institución:
  - Docente crea una unidad → aparece en la lista
  - Docente agrega un item tipo link → aparece con ícono 🔗
  - Docente sube un archivo PDF → aparece con ícono 📄
  - Botón descarga del PDF genera signed URL → abre PDF
  - Reordenar items con ↑↓ persiste tras refresh

- [ ] **Step 7: Commit**

  ```bash
  git add src/app/dashboard/[slug]/contenidos/
  git commit -m "feat: vista docente módulo de contenidos"
  ```

---

## Task 5: Index pages + sidebar

**Files:**
- Create: `src/app/dashboard/[slug]/contenidos/page.tsx`
- Create: `src/app/dashboard/[slug]/contenidos/[curso_id]/page.tsx`
- Modify: `src/components/app-sidebar.tsx`

**Interfaces:**
- Consumes: Task 4 page patterns; `materias`, `cursos`, `unidades_contenido`, `contenidos`
- Produces: navegación completa: sidebar → lista cursos → lista materias → página de materia

- [ ] **Step 1: Implementar `contenidos/page.tsx`**

  Roles: admin/docente ven todos los cursos. Responsable/alumno ven sus cursos. Check `modulo_contenidos = true`.

  Para cada curso: contar items publicados total (join `unidades_contenido` → `contenidos`). Mostrar como lista de cards/rows con link a `[curso_id]`.

  Si docente con acceso a exactamente 1 curso y 1 materia → `redirect` directo a `[curso_id]/[materia_id]`.

- [ ] **Step 2: Implementar `contenidos/[curso_id]/page.tsx`**

  Lista las materias del curso. Para cada materia: nombre, cantidad de unidades publicadas, cantidad de items publicados.

  Docente/admin: link a la página de materia con controles de edición.
  Alumno/responsable: mismo link pero la página de materia mostrará solo lectura (`isEditor = false`).

- [ ] **Step 3: Agregar "Contenidos" al sidebar**

  En `app-sidebar.tsx`, dentro del grupo "Institución" (después de Comunicados), agregar para `isAdminLevel || isDocente || isResponsable`:

  ```tsx
  <SidebarMenuItem>
    <SidebarMenuButton
      render={<Link href={`/dashboard/${activeSlug}/contenidos`} />}
      isActive={pathname.startsWith(`/dashboard/${activeSlug}/contenidos`)}
    >
      <BookMarked />
      Contenidos
    </SidebarMenuButton>
  </SidebarMenuItem>
  ```

  `BookMarked` ya está importado en el sidebar. Si no: agregar al import de lucide-react.

- [ ] **Step 4: Type check**

  Run: `npx tsc --noEmit`
  Expected: no errors

- [ ] **Step 5: Verificación manual**

  - Sidebar muestra "Contenidos" para docente, admin, responsable
  - Sidebar NO muestra "Contenidos" en instituciones sin activeSlug
  - Institución con `modulo_contenidos = false` → página retorna 404
  - Alumno de un curso con materiales puede verlos en modo lectura
  - Alumno no ve items con `publicado = false`

- [ ] **Step 6: Commit**

  ```bash
  git add src/app/dashboard/[slug]/contenidos/ src/components/app-sidebar.tsx
  git commit -m "feat: navegación y sidebar módulo de contenidos"
  ```

---

## Self-Review

### Spec coverage

| Req spec | Task |
|----------|------|
| curso → materia → unidad → item | Tasks 1-4 |
| Tipos link/archivo/imagen | Tasks 3-4 |
| Nota del docente por item | Tasks 2-4 |
| Tag dimensión opcional | Tasks 3-4 |
| Permisos: docente CRUD, alumno/responsable lectura | Tasks 1-3 |
| Módulo activable (`modulo_contenidos`) | Tasks 1-2-4-5 |
| Archivos en Storage privado con signed URLs | Tasks 3-4 |
| Sidebar condicional por rol | Task 5 |
| Items/unidades no publicados → solo staff | Task 1 (RLS) + Task 4 |
| Anti-metas: sin notificaciones, sin drag lib | ✅ no incluidos |

### Review Focus — tests asignados

1. **Docente de otra materia → 403**: Step 1 de Task 2 resuelve `materia → institucion_id` y verifica `hasAnyRole`; verificación manual en Task 4 Step 6.
2. **Módulo desactivado → 404**: Task 4 Step 1 verifica `modulo_contenidos` antes de queries; Task 5 Step 5 verifica manualmente.
3. **MIME no permitido → 422**: Task 3 Step 3 valida contra `ALLOWED_MIME` antes de subir; verificar manual enviando `text/html`.
4. **Item link con storage_path → rechazado**: Task 1 check constraint + Task 3 schema Zod `z.literal('link')` + `url: z.string().url()` sin `storage_path`.
5. **Signed URL TTL**: generadas en cada render del server component (Task 4 Step 1); TTL = 3600s documentado en el código.
