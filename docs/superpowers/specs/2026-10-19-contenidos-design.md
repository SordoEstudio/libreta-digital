# Módulo de Contenidos — Diseño

## Problema

Docentes comparten links, archivos e imágenes por WhatsApp. El material se pierde en el hilo de conversación, no hay organización ni acceso posterior. Alumnos y responsables no tienen dónde encontrar lo que el docente publicó.

## Objetivo

Repositorio de materiales organizados por curso → materia → unidad, visible para alumnos y responsables del curso. El docente publica; los demás solo leen.

## Qué no es esto

- No es un LMS con tareas o entregas.
- No es foro ni chat.
- No reemplaza el cuaderno de notas ni el boletín.
- No tiene comentarios de alumnos ni responsables (v1).

## Jerarquía de contenido

```
Institución
└── Curso
    └── Materia
        └── Unidad  (carpeta, ej: "Unit 1: Greetings")
            └── Item  (link | archivo | imagen)
                      ├── título
                      ├── nota del docente  (texto libre, opcional)
                      └── dimensión_id      (tag opcional, ej: "Oral")
```

La dimensión es un tag opcional que vincula el item a una dimensión existente de la materia (misma tabla `materias_dimensiones`). Útil para materias como Inglés donde hay "Oral", "Escrito", "Comprensión lectora".

## Tipos de item

| Tipo | Qué se guarda | Cómo se muestra |
|------|---------------|-----------------|
| `link` | URL (string) | Tarjeta con favicon + título, abre en nueva pestaña |
| `archivo` | Supabase Storage path | Botón de descarga, preview inline para PDF/imagen |
| `imagen` | Supabase Storage path | Thumbnail clickeable, lightbox |

v1 no incluye video embed (YouTube, Drive). Se agrega si primer cliente lo pide.

## Permisos

| Rol | Puede hacer |
|-----|-------------|
| Docente de la materia | CRUD de unidades e items de su materia |
| Admin de la institución | CRUD de todo |
| Alumno inscripto en el curso | Solo lectura |
| Responsable de alumno inscripto | Solo lectura |
| Docente de otra materia | No accede |

Módulo activable por institución: campo `modulo_contenidos: boolean` en tabla `instituciones`. Si está desactivado, las rutas retornan 404.

## Esquema de base de datos

```sql
-- Unidades (carpetas)
CREATE TABLE unidades_contenido (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id    UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  nombre        TEXT NOT NULL CHECK (char_length(nombre) <= 120),
  descripcion   TEXT CHECK (char_length(descripcion) <= 500),
  orden         INT NOT NULL DEFAULT 0,
  publicado     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

-- Items de contenido
CREATE TABLE contenidos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id     UUID NOT NULL REFERENCES unidades_contenido(id) ON DELETE CASCADE,
  tipo          TEXT NOT NULL CHECK (tipo IN ('link', 'archivo', 'imagen')),
  titulo        TEXT NOT NULL CHECK (char_length(titulo) <= 200),
  url           TEXT,          -- para tipo=link; o URL pública de Storage para archivo/imagen
  storage_path  TEXT,          -- para archivo/imagen: path en bucket supabase Storage
  nota          TEXT CHECK (char_length(nota) <= 1000),  -- comentario del docente
  dimension_id  UUID REFERENCES materias_dimensiones(id) ON DELETE SET NULL,
  orden         INT NOT NULL DEFAULT 0,
  publicado     BOOLEAN NOT NULL DEFAULT true,
  autor_id      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ,
  CHECK (
    (tipo = 'link' AND url IS NOT NULL AND storage_path IS NULL) OR
    (tipo IN ('archivo', 'imagen') AND storage_path IS NOT NULL)
  )
);
```

**Storage bucket:** `contenidos`
**Path:** `{institucion_id}/{curso_id}/{materia_id}/{unidad_id}/{uuid}-{filename}`
**Acceso:** bucket privado, URLs firmadas generadas server-side (expiran en 1h para descarga).

**Campo en instituciones:**
```sql
ALTER TABLE instituciones ADD COLUMN modulo_contenidos BOOLEAN NOT NULL DEFAULT false;
```

## RLS

- `unidades_contenido`: SELECT para alumno inscripto en el curso de esa materia, y para responsable cuyo alumno esté inscripto. INSERT/UPDATE/DELETE para docente de la materia y admin de la institución.
- `contenidos`: mismo patrón que unidades, + filtro `publicado = true` para alumnos/responsables.
- Storage: policies server-side vía signed URLs, no acceso directo por cliente.

## Rutas (App Router)

```
/dashboard/[slug]/contenidos
  → lista de cursos con contenido activo (docente/admin)
  → para responsable/alumno: lista sus cursos

/dashboard/[slug]/contenidos/[curso_id]
  → lista de materias del curso con sus unidades colapsables

/dashboard/[slug]/contenidos/[curso_id]/[materia_id]
  → lista de unidades expandibles con items inline

/dashboard/[slug]/contenidos/[curso_id]/[materia_id]/[unidad_id]/editar
  → formulario de edición de unidad (docente/admin)

/api/v1/contenidos/unidades           POST, PUT, DELETE
/api/v1/contenidos/items              POST, PUT, DELETE
/api/v1/contenidos/items/upload       POST (multipart, devuelve signed URL)
```

## UX — vista docente

```
Materia: Inglés — 1° A
──────────────────────────────────────────────────────
[+ Nueva unidad]

▼ Unit 1: Greetings                           [⋮ editar]
  [Oral]  🔗 Hello & Goodbye - BBC Learn English
          "Escuchar antes de la clase del miércoles"
  [Oral]  📄 Diálogo modelo.pdf
  [Escrit] 🖼 vocabulary-chart.png

▼ Unit 2: Colors & Numbers                    [⋮ editar]
  🔗 Numbers Song - YouTube
  📄 Worksheet Unit 2.pdf
  [+ Agregar material]
──────────────────────────────────────────────────────
```

- Drag-to-reorder entre items dentro de una unidad (y entre unidades).
- "Agregar material" abre un drawer: elige tipo → completa campos mínimos → guarda.
- Tag de dimensión opcional, con dropdown de las dimensiones de esa materia.
- Sin formulario innecesario: título + contenido (URL o archivo) + nota opcional. Listo.

## UX — vista alumno / responsable

Igual que docente pero sin botones de edición. Items no publicados no aparecen. Si la materia no tiene unidades, muestra "El docente aún no publicó materiales."

## Navegación en el sidebar

El módulo aparece en el sidebar como ítem "Contenidos" (con ícono BookMarked o FolderOpen) solo si `modulo_contenidos = true` en la institución. Para alumnos y responsables aparece con el nombre que defina la institución (default: "Materiales de clase").

## Anti-metas

- No notificaciones push por ahora (se agrega cuando haya demanda).
- No versionado de archivos.
- No compartir entre cursos.
- No comentarios de alumnos ni responsables.
- No editor de texto rico ni embeds (v1).

## Tamaño y orden de implementación

Proyecto mediano: ~4-5 días de desarrollo. Orden sugerido:

1. Migration + Storage bucket + campo `modulo_contenidos`
2. API routes (CRUD unidades e items, upload)
3. Vista docente: lista + crear/editar unidades e items
4. Vista alumno/responsable: read-only
5. Sidebar condicional + activación por institución

## Decisiones de builder (no requieren consulta)

| # | Decisión | Razón |
|---|----------|-------|
| 1 | Reordenar items es optimista (client-first) + no se permite mover items entre unidades en v1 | Simplifica RLS y evita edge cases de validación cross-unit |
| 2 | Items/unidades no publicados: visibles para docente/admin (badge "Borrador"), ocultos para alumnos/responsables | Patrón estándar, no necesita query dual |
| 3 | Preview de PDF: botón "Ver PDF" abre signed URL en nueva pestaña. Sin react-pdf ni thumbnails server-side | Evita dependencia y latencia extra; suficiente para v1 |
| 4 | Soft-delete conserva archivo en Storage. No hay cleanup job en v1 | Consistente con el resto del proyecto (deleted_at pattern) |
| 5 | Módulo desactivado: check a nivel de página (`notFound()`), no middleware | Consistente con otros módulos del proyecto |

## Referencias de diseño consultadas

- Google Classroom: materiales por tema, sin anidamiento profundo — adoptado como modelo base por simplicidad probada.
- Canvas: módulos secuenciales — descartado (demasiada estructura para este caso).
- Schoology: carpetas libres — referencia para el modelo de unidades.
- Patrón LATAM: preferencia por estructura simple vs. LMS completo.
