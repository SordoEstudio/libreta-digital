# Cuaderno v3 — Gradebook unificado

**Fecha:** 2026-10-17  
**Estado:** Spec aprobada, pendiente implementación

---

## Objetivo

El docente entra al cuaderno y ve inmediatamente un gradebook con todas las evaluaciones del período — tanto las que van a la libreta como las internas (referencia) — todas editables inline. Sin tener que navegar a pantallas separadas.

---

## User stories

1. **Carga inmediata:** Al entrar al cuaderno sin params en la URL, se selecciona automáticamente la primera materia disponible y el período activo. El gradebook carga sin que el docente tenga que hacer nada.

2. **Notas de libreta inline:** El docente ve columnas para cada evaluación del período (parciales, TPs, etc.) y puede escribir la nota directamente en la celda. Acepta número o `A` para ausente. Un "Guardar todo" persiste todo en una sola acción.

3. **Recuperatorios inline:** Para cada evaluación con recuperatorio generado, aparece una sub-columna "R" adyacente. El docente puede entrar la nota del recuperatorio ahí. Las celdas de dimensiones ya aprobadas en el original quedan deshabilitadas (misma experiencia que el editor de notas completo).

4. **Drill-down a editor completo:** Cada columna de libreta (y sus recuperatorios) tiene un ícono de link que navega a `/notas/[eval_id]` — el editor completo ya existente con filtro de alumnos elegibles, ausente, validación de escala, y bloqueo de dimensiones. El parámetro `?from=cuaderno&materia_id=X&periodo_id=Y` permite volver al cuaderno con el mismo estado.

4. **Referencia inline:** Mismas columnas inline ya implementadas en v2. Sin cambios de comportamiento.

5. **Definitiva inline:** Sin cambios de comportamiento.

6. **Período cerrado:** Si el período está cerrado, las columnas de libreta (y sus recuperatorios) quedan deshabilitadas. Las de referencia y definitiva no son afectadas por el cierre de período.

8. **Grupos visuales:** La tabla tiene separadores de grupo con labels "Libreta" y "Referencia". Chip toggles para mostrar/ocultar cada grupo.

---

## Diseño de la tabla

```
┌──────────────┬──────────── Libreta ─────────────┬──────── Referencia ────────┬──────┬────────────┐
│              │  1er Parc │ R │  TP 1 │  TP 2 │R │ Diagnóst │ Participac    │ Prom │ Definitiva │
│ García, Ana  │     8     │   │  7    │  9    │  │    6     │ Bien          │ 6.5  │            │
│ López, Juan  │     5     │ 7 │  6    │  8    │  │    7     │ Regular       │ 7.0  │            │
└──────────────┴──────────────────────────────────┴───────────────────────────┴──────┴────────────┘
```

- "R" sub-columna: aparece solo si `permite_recuperatorio=true` Y existe un recuperatorio creado para esa eval.
- Alumnos que no hicieron recuperatorio: celda vacía, editable (el docente puede cargar nota si es necesario).
- Células libreta con tono visual diferente al de referencia.

---

## Defaults de selección

- Si no hay `materia_id` en URL: usar `materias[0]`.
- Si no hay `periodo_id` en URL: usar el período con `activo=true`, fallback al primero en orden.
- Sin redirect. Los valores se pasan como selección inicial a los selectores.
- Cuando el docente cambia materia: URL actualiza, page re-renderiza con el período activo de esa nueva materia.

---

## Ausente

- Celda libreta acepta: número (nota numérica) o `A`/`a` (ausente).
- Si hay nota existente con `valor_literal='A'`: se muestra "A" en el input.
- Al guardar: `'A'/'a'` → `{ valor_numerico: null, valor_literal: 'A' }`.
- Para evaluaciones con dimensiones: se envía `valor_literal: 'A'` para cada dimension_id del alumno.

---

## Período cerrado

- Si `periodo.cerrado_at IS NOT NULL`: columnas de libreta y sus recuperatorios → inputs `disabled`.
- Referencia y definitiva no se afectan por `cerrado_at` (nunca lo estuvieron).
- Badge visual "Período cerrado" cerca del grupo Libreta cuando está cerrado.

---

## Recuperatorios

- Un recuperatorio es una `evaluacion` con `recuperatorio_de_evaluacion_id IS NOT NULL`.
- Se muestra como sub-columna del parcial original, header "R" con tooltip = nombre completo del recuperatorio.
- Se guarda via el mismo `/api/v1/notas/bulk`.
- Si el recuperatorio aún no fue generado, la sub-columna "R" NO aparece — el docente lo genera desde `/evaluaciones`.

### Bloqueo por dimensión en cuaderno

Para cada celda `(alumnoId, dimId)` de un recuperatorio:
- Si la nota original del alumno en esa dimensión es `>= nota_aprobacion`: celda `disabled` (dimensión aprobada, no necesita recuperar).
- Si no: celda editable.
- `nota_aprobacion` viene de `escalas.min_aprobacion` de la institución (misma fuente que el editor existente).
- El bloqueo es **solo visual** — el endpoint `/api/v1/notas/bulk` no valida. Validación en API queda para versión futura.
- Para evals de recuperatorio **sin dimensiones**: no aplica bloqueo (el alumno aparece en el recuperatorio porque reprobó → celda siempre editable).

### Drill-down

- Link icon en header de cada columna libreta y "R" → `/notas/[eval_id]?from=cuaderno&materia_id=X&periodo_id=Y`.
- La página `/notas/[eval_id]` existente ya maneja: filtro alumnos elegibles, bloqueo de dimensiones, ausente, escala, notificaciones.
- Si `from=cuaderno` presente en URL: mostrar breadcrumb "← Cuaderno" que restaura `?materia_id=X&periodo_id=Y`.

---

## APIs utilizadas

| Acción | Endpoint |
|--------|----------|
| Guardar notas libreta | `POST /api/v1/notas/bulk` |
| Guardar notas referencia | `POST /api/v1/notas-referencia/bulk` (ya implementado) |
| Guardar nota definitiva | ya implementado |

`/api/v1/notas/bulk` acepta `{ evaluacion_id, notas[] }`, valida período cerrado, envía notificaciones a responsables, valida escala. Sin cambios.

---

## Fuera de scope

- Crear nueva evaluación de libreta desde el cuaderno (sigue siendo en `/evaluaciones`).
- Validación en API del bloqueo por dimensión en recuperatorios (solo bloqueo visual en v3).
- Borrar una nota ya cargada poniéndola en blanco (limitación existente del bulk endpoint).
- La página `/referencia` se mantiene sin cambios.
- Editar propiedades de una evaluación de libreta desde cuaderno (sigue siendo en `/evaluaciones`).
