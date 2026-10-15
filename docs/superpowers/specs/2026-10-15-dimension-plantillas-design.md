# Plantillas de dimensiones institucionales — Diseño

**Fecha:** 2026-10-15  
**Estado:** aprobado

## Intención

Hoy cada materia configura sus dimensiones de forma independiente. Una institución que quiere aplicar el mismo esquema de ponderación a múltiples materias (ej. "Oral 30% / Escrito 70%") tiene que hacerlo materia por materia. Las plantillas permiten al admin definir ese esquema una vez y aplicarlo a una o todas las materias de un curso en un solo click.

## Actores

| Actor | Puede |
|-------|-------|
| Admin | CRUD plantillas; aplicar a materia o a todo un curso |
| Docente | Solo ver plantillas disponibles en el selector (no puede aplicar) |
| Superadmin | Todo |

## Reglas de negocio

1. Plantilla pertenece a una institución. Solo admin/superadmin crea, elimina y aplica.
2. Plantilla tiene nombre y N ítems (nombre + peso). No se valida que los pesos de la plantilla sumen 100% — la materia es responsable de eso.
3. Aplicar plantilla a una materia **reemplaza** todas sus dimensiones existentes con los ítems de la plantilla. Es una copia — no hay vínculo vivo. La materia puede modificar sus dimensiones después sin afectar la plantilla.
4. Aplicar plantilla a todas las materias de un curso: all-or-nothing en una transacción. Si falla una, ninguna se modifica.
5. Eliminar plantilla = soft delete (`deleted_at`). No afecta materias donde ya fue aplicada.
6. Un ítem de plantilla puede tener peso `null` (promedio directo) o `> 0`. Peso = 0 se almacena como null.
7. `orden` de los ítems lo asigna el backend según la posición en el array recibido.

## Modelo de datos

### `dimension_plantillas`
| columna | tipo | restricción |
|---------|------|-------------|
| id | UUID PK | gen_random_uuid() |
| institucion_id | UUID NOT NULL | → instituciones |
| nombre | TEXT NOT NULL | char_length 1–100 |
| created_at | TIMESTAMPTZ | DEFAULT now() |
| updated_at | TIMESTAMPTZ | DEFAULT now() |
| deleted_at | TIMESTAMPTZ | soft delete |

Índice: `(institucion_id)`.

### `dimension_plantilla_items`
| columna | tipo | restricción |
|---------|------|-------------|
| id | UUID PK | gen_random_uuid() |
| plantilla_id | UUID NOT NULL | → dimension_plantillas ON DELETE CASCADE |
| nombre | TEXT NOT NULL | char_length 1–100 |
| peso | NUMERIC(5,2) NOT NULL | CHECK (peso > 0) |
| orden | INTEGER NOT NULL DEFAULT 0 | para mostrar en orden |

Índice: `(plantilla_id)`.

## RLS

Ambas tablas:
- `FOR SELECT USING (has_any_role(institucion_id, '{admin,docente}') OR is_superadmin())`
- `FOR INSERT/UPDATE/DELETE WITH CHECK/USING (has_any_role(institucion_id, '{admin}') OR is_superadmin())`

`dimension_plantilla_items` hereda el `institucion_id` vía join a `dimension_plantillas` — las políticas usan una función auxiliar o un subquery.

## API

```
GET  /api/v1/instituciones/[id]/dimension-plantillas
     → 200: { data: PlantillaListItem[] }
     PlantillaListItem: { id, nombre, created_at, items: { id, nombre, peso, orden }[] }

POST /api/v1/instituciones/[id]/dimension-plantillas
     body: { nombre: string(1-100), items: { nombre: string, peso: number }[] }  (items min 1)
     → 201: { data: PlantillaListItem }

DELETE /api/v1/dimension-plantillas/[plantilla_id]
     → 200: { data: { id } }

POST /api/v1/materias/[id]/dimensiones/aplicar-plantilla
     body: { plantilla_id: uuid }
     Lógica: DELETE existing dimensiones de la materia → INSERT ítems de la plantilla como nuevas dimensiones
     Solo admin. Verifica plantilla pertenece a la institución de la materia.
     → 200: { data: { dimensiones_creadas: number } }

POST /api/v1/cursos/[id]/dimensiones/aplicar-plantilla
     body: { plantilla_id: uuid }
     Lógica: para cada materia activa (is('deleted_at', null)) del curso → DELETE + INSERT en una sola transacción RPC
     Solo admin.
     → 200: { data: { materias_actualizadas: number } }
```

## Transacción en bulk apply

El bulk apply a un curso requiere atomicidad. Implementar con una función SQL `aplicar_plantilla_a_curso(curso_id, plantilla_id)` llamada vía `supabase.rpc()`. La función itera sobre las materias del curso, elimina sus dimensiones y crea las nuevas con los ítems de la plantilla.

## UI

### Configuración → Plantillas de dimensiones (nueva sección admin)

Ruta: `/dashboard/[slug]/configuracion/dimension-plantillas` (sub-ruta dentro de configuración, o sección inline en la página de configuración existente).

- Lista de plantillas: nombre | N ítems | acciones (eliminar)
- Botón "Nueva plantilla" → sheet
  - Campo: Nombre de la plantilla
  - Sección Ítems: agregar ítems inline (nombre + peso), eliminar ítems, total de pesos visible
  - Guardar crea la plantilla completa en un solo POST
- Eliminar → AlertDialog confirmación

### Sheet de dimensiones de materia (modificar existente)

Al final del sheet, si hay plantillas disponibles, agregar sección "Aplicar plantilla":
- Select con plantillas de la institución
- Botón "Aplicar" → AlertDialog "Esto reemplazará las dimensiones actuales. ¿Continuar?" → POST

### Página de curso (modificar existente)

En la lista de materias del curso, agregar botón "Aplicar plantilla a todo el curso" (solo admin). Abre modal con:
- Select de plantilla
- Advertencia: "Se reemplazarán las dimensiones de todas las materias del curso"
- Confirmar → POST bulk

## No incluido en este alcance

- Editar ítems de plantilla (solo crear/eliminar)
- Ordenar ítems manualmente (orden por posición de creación)
- Aplicar a múltiples cursos de una vez
- Vista de qué materias usan qué plantilla
- Reenvío de plantilla a materias que ya la tienen aplicada (es igual que aplicar de nuevo)
