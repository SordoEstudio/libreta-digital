# Observaciones y Firmas del Boletín — Diseño

**Fecha:** 2026-10-24  
**Estado:** Borrador — pendiente aprobación

---

## Contexto y motivación

El boletín digital muestra notas y asistencias pero no permite al docente/admin dejar una observación escrita sobre el alumno (texto libre por período), ni tiene un área de firmas para el documento impreso.

En Argentina, el boletín en papel incluye:
1. "Observaciones del docente" — texto al pie de cada período
2. Líneas de firma al cierre: Director/a, Docente, Responsable

Este módulo digitaliza ambas cosas: observaciones editables y sección de firmas en el impreso.

---

## Objetivos

- Admin o docente escribe una observación libre por alumno por período
- La observación aparece en el boletín (web + impresión)
- El boletín impreso tiene un área de firmas: Director/a y Responsable
- El nombre/cargo del Director/a es configurable por institución

---

## Goals

- Una observación por alumno por período (upsert — sobreescribir está bien)
- Solo admin y docentes del curso del alumno pueden escribir/editar
- Responsables solo leen (no escriben)
- Observación en blanco = no se muestra nada (sección oculta si no hay texto)
- Nombre del firmante Director/a configurable en Configuración (texto libre)
- Sección de firmas solo visible al imprimir (print:block, hidden en web)
- Fecha de impresión se genera en el momento (no se almacena)

## Non-goals

- Firma digital con validez legal
- Imágenes de firma subidas por el usuario
- Observaciones por materia (la granularidad es alumno+período)
- Observaciones visibles en cuaderno o notas — solo en boletín
- Historial de cambios de observaciones
- Notificaciones al escribir una observación

## Anti-goals

- No exponer observaciones antes de que el período esté publicado (responsables)
- No permitir que responsables escriban observaciones

---

## Schema de base de datos

### Nueva tabla: `observaciones_boletin`

```sql
CREATE TABLE observaciones_boletin (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id   UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  periodo_id  UUID NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  texto       TEXT NOT NULL CHECK (char_length(texto) <= 1000),
  autor_id    UUID REFERENCES personas(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(alumno_id, periodo_id)
);
CREATE INDEX observaciones_boletin_alumno_idx  ON observaciones_boletin(alumno_id);
CREATE INDEX observaciones_boletin_periodo_idx ON observaciones_boletin(periodo_id);
```

`autor_id`: la persona que escribió/actualizó la observación. Nullable para datos migrados.

### Nuevas columnas en `instituciones`

```sql
ALTER TABLE instituciones
  ADD COLUMN IF NOT EXISTS director_nombre TEXT,
  ADD COLUMN IF NOT EXISTS director_cargo  TEXT DEFAULT 'Director/a';
```

### RLS

```sql
-- Admin: full access
CREATE POLICY "obs_admin" ON observaciones_boletin FOR ALL TO authenticated
  USING (exists(
    select 1 from alumnos a
    join memberships m on m.institucion_id = a.institucion_id
    where a.id = observaciones_boletin.alumno_id
      and m.persona_id = get_persona_id()
      and m.rol in ('admin', 'superadmin')
  ))
  WITH CHECK (exists(
    select 1 from alumnos a
    join memberships m on m.institucion_id = a.institucion_id
    where a.id = observaciones_boletin.alumno_id
      and m.persona_id = get_persona_id()
      and m.rol in ('admin', 'superadmin')
  ));

-- Docente: read + write for alumnos in their courses
CREATE POLICY "obs_docente_write" ON observaciones_boletin FOR ALL TO authenticated
  USING (exists(
    select 1 from alumno_inscripciones ai
    join materia_docentes md on md.materia_id in (
      select id from materias where curso_id = ai.curso_id and deleted_at is null
    )
    where ai.alumno_id = observaciones_boletin.alumno_id
      and ai.activo = true and ai.deleted_at is null
      and md.persona_id = get_persona_id()
  ))
  WITH CHECK (exists(
    select 1 from alumno_inscripciones ai
    join materia_docentes md on md.materia_id in (
      select id from materias where curso_id = ai.curso_id and deleted_at is null
    )
    where ai.alumno_id = observaciones_boletin.alumno_id
      and ai.activo = true and ai.deleted_at is null
      and md.persona_id = get_persona_id()
  ));

-- Responsable: SELECT only, only for published periods
CREATE POLICY "obs_responsable_read" ON observaciones_boletin FOR SELECT TO authenticated
  USING (exists(
    select 1 from alumno_responsables ar
    where ar.alumno_id = observaciones_boletin.alumno_id
      and ar.persona_id = get_persona_id()
  ));
```

---

## Rutas API

### `POST /api/v1/observaciones-boletin`

Cuerpo: `{ alumno_id, periodo_id, texto }` (texto vacío = eliminar la observación)

- Verifica que la persona sea admin de la institución del alumno, O docente con materia en el curso activo del alumno
- Upsert en `observaciones_boletin` con `autor_id = session.persona_id`
- Si `texto.trim() === ''`: DELETE la fila (observación en blanco = sin observación)
- Respuesta: `201 { observacion: { id, texto, updated_at } }` o `200 {}` si se eliminó
- **Convención del proyecto**: usar `POST` para upserts (no PUT)

---

## Páginas y componentes

| Archivo | Tipo | Cambio |
|---------|------|--------|
| `supabase/migrations/20261024000005_observaciones_firmas.sql` | Migration | Tabla + columnas instituciones |
| `src/app/api/v1/observaciones-boletin/route.ts` | API route | PUT upsert/delete |
| `src/app/dashboard/[slug]/libreta/[alumno_id]/boletin/page.tsx` | Server page | Fetch observaciones + firmas config; render secciones |
| `src/app/dashboard/[slug]/libreta/[alumno_id]/boletin/observacion-editor.tsx` | Client component | Textarea inline + save/delete |
| `src/app/dashboard/[slug]/configuracion/page.tsx` | Server page | Nuevo bloque "Director/a" en ajustes |
| `src/types/database.ts` | Types | Regenerar tras migración |

---

## Diseño de la UI

### Sección Observaciones en el boletín

Debajo de la tabla de notas, antes del footer. Solo visible si hay al menos una observación O si el usuario es admin/docente.

```
Observaciones del docente
────────────────────────────────────────────────────────
  1er Cuatrimestre:
  "Muy buen desempeño. Mejoró su participación oral."
                                              [Editar]

  2do Cuatrimestre:
  [Sin observación]                           [Agregar]
────────────────────────────────────────────────────────
```

- Para **responsables**: solo se muestran períodos publicados con observación (sin botón editar)
- Para **admin/docente**: todos los períodos del año con su observación o un botón "Agregar"
- "Editar" / "Agregar" → textarea inline (client component), máx. 1000 caracteres
- Botón "Guardar" → PUT → actualización optimista (`router.refresh()` al éxito)
- Botón "Eliminar" (aparece si hay texto) → texto vacío → DELETE vía PUT

### Sección Firmas en el boletín impreso

Solo visible al imprimir (`hidden print:block`). Al pie del documento:

```
                              [ciudad/provincia], [dd/mm/aaaa]

Firma del/la Responsable:          Firma del/la [director_cargo]:


_____________________________      _____________________________
                                   [director_nombre]
                                   [director_cargo]  ·  [inst.nombre]
```

- La fecha se genera en el cliente en el momento de imprimir (`new Date().toLocaleDateString('es-AR')`)
- Si `director_nombre` es null → la línea derecha muestra solo `[director_cargo] · [inst.nombre]`
- Ciudad: **MI DECISIÓN** — no se almacena; la sección dirá solo la fecha (ciudad es difícil de inferir automáticamente)

### Configuración — bloque Director/a

Nuevo bloque en `src/app/dashboard/[slug]/configuracion/page.tsx`, bajo el bloque "Terminología":

```
Director/a del establecimiento
  Cargo      [Director/a          ]
  Nombre     [Lic. María García   ]
  Aparece como firma en el boletín impreso.
```

Formulario inline con `debounce` o botón "Guardar". **MI DECISIÓN**: un formulario con botón (no autoguardado), mismo patrón que `TerminoRecuperatorioForm`.

---

## Flujo de permisos (resumen)

| Rol | Observaciones | Firmas config |
|-----|--------------|---------------|
| Admin | Leer + escribir todos los alumnos | Editar en Configuración |
| Superadmin | Igual que admin | Igual que admin |
| Docente | Leer + escribir alumnos de sus cursos | No |
| Responsable | Leer (períodos publicados) | No |

---

## Decisiones del builder (para revisión)

- **Ciudad en firmas**: no se almacena — solo la fecha aparece. Alternativa sería un campo `ciudad` en instituciones.
- **Formulario Director/a**: botón "Guardar" (no autoguardado) para consistencia con `TerminoRecuperatorioForm`.
- **Observación vacía = eliminar**: texto en blanco hace DELETE en lugar de guardar cadena vacía.
- **Responsables ven observaciones de períodos no publicados**: NO — misma lógica que las notas.
- **HTTP verb**: `POST` para el upsert (no PUT) — convención del proyecto.
- **Periods query en boletin page**: agregar query separada de períodos del año activo del alumno; no depender de las notas para la lista de períodos.
- **Docente pierde acceso al curso**: pierde acceso de escritura a la observación. Sin cláusula `autor_id` fallback en RLS. Admin puede editar en su lugar.
