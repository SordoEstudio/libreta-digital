# Observaciones por Período en el Boletín (Nivel 2)

> **Estado:** PENDIENTE — implementar cuando primer cliente lo solicite.
> **Prioridad:** Baja. No bloquea lanzamiento.

## Qué es

Texto libre asociado a un alumno + materia + período, escrito por el docente o el admin, visible en el boletín familiar. Ejemplo: "Mejoró notablemente su participación oral en el segundo trimestre."

## Por qué no está hoy

La Nivel 1 (nota.observacion, inline en cada celda) cubre el caso básico. Las observaciones por período son un nivel arriba: aplican a toda la instancia de una materia en un trimestre, no a una evaluación puntual. Ningún cliente lo pidió aún.

## Diseño propuesto

### Tabla nueva

```sql
CREATE TABLE observaciones_periodo (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id   UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  materia_id  UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  periodo_id  UUID NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  texto       TEXT NOT NULL CHECK (char_length(texto) <= 1000),
  autor_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  UNIQUE (alumno_id, materia_id, periodo_id)
);

-- RLS: docente/admin de la institución puede insertar/actualizar.
-- Responsable: solo lectura.
```

### Flujo de edición

- Docente accede desde la libreta interna del alumno (`/libreta/[alumno_id]`)
- Botón "Agregar observación" en el card de cada período × materia
- Input de textarea con límite 1000 chars
- Guardado vía API route `/api/v1/observaciones-periodo` (POST/PATCH)

### Renderizado en el boletín

Texto en cursiva debajo del nombre de la materia en la fila correspondiente al período, o al final de la fila de materia como sub-celda con colspan completo.

Opción recomendada: fila adicional colapsable con `colspan=ALL`, separada visualmente con `text-xs italic text-muted-foreground`. No agrega columna nueva — preserva la legibilidad de la tabla.

```
Matemática    │  MB  │  8  │  MB  │  9  │  8
              │ "Excelente progreso en geometría analítica."     │
```

### Impacto en consulta del boletín

Join adicional en la query de `boletin/page.tsx`:

```ts
const { data: obsperiodo } = await supabase
  .from('observaciones_periodo')
  .select('alumno_id, materia_id, periodo_id, texto')
  .eq('alumno_id', alumno_id)
  .is('deleted_at', null)
```

Map: `obsMap[materia_id][periodo_id] = texto`

En el render, después de cada fila de materia (o de su última sub-fila de dimensión), si `obsMap[matId][pid]` existe se emite una fila adicional.

## Nivel 3 (más adelante): Observación general anual

Si algún cliente pide una observación anual de la materia (sin período), se agrega `periodo_id = null` como caso especial o una columna `observacion_anual TEXT` directamente en el boletín.
