# Comunicados con confirmación de lectura — Diseño

**Fecha:** 2026-10-15  
**Estado:** aprobado

## Intención

Las instituciones necesitan enviar comunicados a los responsables de alumnos y tener un registro digitalizado de quiénes los leyeron. En Argentina hay requisito implícito de poder demostrar que los responsables fueron notificados de eventos escolares. La confirmación de lectura no requiere que el responsable tenga login en la app.

## Actores

| Actor | Puede |
|-------|-------|
| Admin | Crear comunicados para cualquier curso de su institución; ver estado de confirmaciones |
| Docente | Crear comunicados para cursos de la institución; ver estado de confirmaciones |
| Responsable | Recibir email con el comunicado; confirmar lectura desde link en el email (sin login) |
| Superadmin | Todo |

## Reglas de negocio

1. Un comunicado se dirige a un `curso_id` — todos los responsables activos de los alumnos activos del curso reciben un email.
2. Si un responsable es responsable de N alumnos del mismo curso, recibe **1 solo email** y tiene **1 sola entrada de confirmación** (deduplicado por `persona_id`).
3. El comunicado **no se puede editar** una vez creado. Preservar integridad del registro es prioritario.
4. La confirmación es **irreversible** — `confirmed_at` no puede volver a null.
5. El email se envía **fire-and-forget** — si falla, el comunicado se creó igualmente y las filas de confirmación existen.
6. Si el curso no tiene responsables con email registrado, el comunicado se crea sin enviar emails (respuesta incluye `emails_enviados: 0`).

## Modelo de datos

### `comunicados`
| columna | tipo | restricción |
|---------|------|-------------|
| id | UUID PK | gen_random_uuid() |
| institucion_id | UUID NOT NULL | → instituciones |
| autor_id | UUID NOT NULL | → personas |
| titulo | TEXT NOT NULL | char_length 1–300 |
| contenido | TEXT NOT NULL | char_length 1–5000 |
| curso_id | UUID NOT NULL | → cursos ON DELETE RESTRICT |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| deleted_at | TIMESTAMPTZ | soft delete (solo uso interno/admin) |

Índices: `(institucion_id)`, `(curso_id)`.

### `comunicado_confirmaciones`
| columna | tipo | restricción |
|---------|------|-------------|
| id | UUID PK | IS el magic token |
| comunicado_id | UUID NOT NULL | → comunicados ON DELETE CASCADE |
| persona_id | UUID NOT NULL | → personas |
| institucion_id | UUID NOT NULL | para RLS |
| email | TEXT NOT NULL | denormalizado al momento del envío |
| confirmed_at | TIMESTAMPTZ | null = no confirmó |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| UNIQUE | (comunicado_id, persona_id) | un responsable = una confirmación |

## RLS

Ambas tablas:
- `FOR SELECT USING (has_any_role(institucion_id, '{admin,docente}') OR is_superadmin())`
- `FOR INSERT WITH CHECK (has_any_role(institucion_id, '{admin,docente}') OR is_superadmin())`
- No UPDATE/DELETE via RLS — la confirmación usa `createAdminClient()` server-side

## API

```
POST /api/v1/comunicados
  body: { titulo: string(1-300), contenido: string(1-5000), curso_id: uuid }
  → 201: { data: { id, titulo, contenido, curso_id, created_at, emails_enviados: number } }

GET  /api/v1/comunicados?institucion_id=UUID[&cursor=UUID]
  → 200: { data: ComunicadoListItem[], nextCursor?: string }
  ComunicadoListItem: { id, titulo, curso_id, cursos(nombre), created_at, total: number, confirmados: number }

GET  /api/v1/comunicados/[id]
  → 200: { data: { id, titulo, contenido, curso_id, cursos(nombre), created_at, autor(nombre,apellido), total: number, confirmados: number, confirmaciones: ConfirmacionItem[] } }
  ConfirmacionItem: { id, email, confirmed_at }
```

POST deriva `institucion_id` del `curso_id` (SELECT curso → año_lectivo → NOT NEEDED, `cursos.institucion_id` directo).

GET list requiere `institucion_id` en query string; verifica `hasAnyRole`.

## Utilidad pura (testeable)

```typescript
// src/lib/comunicados.ts
deduplicarResponsables(rows: { persona_id: string; email: string }[]): { persona_id: string; email: string }[]
```

Filtra dejando la primera aparición por `persona_id`. Handles: vacío → [], sin duplicados → igual, N responsables iguales → uno.

## Email

Template: `src/emails/comunicado.tsx`  
Props: `{ titulo: string; contenido: string; institucion_nombre: string; confirm_url: string }`  
Subject: `"[titulo] — [institucion_nombre]"`  
Body: título, contenido, botón "Confirmar lectura" → `confirm_url`

Función: `sendComunicado(to, props, confId)` en `src/lib/email.ts`  
Idempotency key: `comunicado-confirm/${confId}/${to}`

## URL de confirmación

`${process.env.NEXT_PUBLIC_APP_URL}/confirmar/[conf_id]`

## Página pública `/confirmar/[conf_id]`

Server component, sin autenticación.
- Usa `createAdminClient()` (service role) para UPDATE
- Estado `not found` → mensaje de error genérico (no revelar si el token existe o no)
- Estado `already confirmed` → "Ya confirmaste este comunicado. Gracias."
- Estado `confirmed now` → "Gracias por confirmar la lectura."

## UI en dashboard

### `/dashboard/[slug]/comunicados` (lista)
- Server component, auth: admin o docente de la institución
- Tabla: Título | Curso | Fecha | Confirmados/Total
- Botón "Nuevo comunicado" → abre sheet
- Estado vacío: icono + "Aún no hay comunicados."

### Sheet: Nuevo comunicado
- Client component
- Campos: Título (Input, required, max 300), Contenido (Textarea, required, max 5000), Curso (Select con cursos de la institución, required)
- POST a `/api/v1/comunicados`, on success: `router.refresh()`

### `/dashboard/[slug]/comunicados/[id]` (detalle)
- Server component
- Muestra título, contenido, fecha, curso, autor
- Tabla de confirmaciones: Email | Confirmado? (fecha o "—")
- Badge con stats: "N/M confirmaron"

### Sidebar
- Añadir "Comunicados" bajo el grupo Institución, visible para admin y docente
- Icono: `MessageSquare` (lucide-react)
- Posición: después de Cursos/Mis materias, antes de Calendario

## No incluido en este alcance

- Reenvío de email a responsables que no confirmaron
- Comunicados a una materia específica (solo por curso por ahora)
- Plantillas de comunicados predefinidas
- Responsable respondiendo al comunicado
