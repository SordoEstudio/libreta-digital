-- Migration: Período Anual
-- Adds tipo to periodos, ensures cerrado_at/publicado_at exist on both tables,
-- creates annual periods for every año_lectivo, and migrates evaluaciones.periodo_id = NULL
-- to point to the annual period.

-- 1. Ensure cerrado_at / publicado_at exist on años_lectivos (may have been added via Studio)
ALTER TABLE años_lectivos
  ADD COLUMN IF NOT EXISTS cerrado_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS publicado_at TIMESTAMPTZ;

-- 2. Ensure publicado_at exists on periodos (may have been added via Studio)
ALTER TABLE periodos
  ADD COLUMN IF NOT EXISTS publicado_at TIMESTAMPTZ;

-- 3. Add tipo to periodos
ALTER TABLE periodos
  ADD COLUMN tipo TEXT NOT NULL DEFAULT 'regular'
    CHECK (tipo IN ('regular', 'anual'));

-- 4. Unique constraint: at most one anual period per año_lectivo
CREATE UNIQUE INDEX idx_periodos_anual_unico
  ON periodos(año_lectivo_id)
  WHERE tipo = 'anual' AND deleted_at IS NULL;

-- 5. Create annual period for every existing año_lectivo that doesn't have one
INSERT INTO periodos (institucion_id, año_lectivo_id, nombre, orden, tipo, activo)
SELECT al.institucion_id, al.id, 'Período Anual', 9999, 'anual', false
FROM años_lectivos al
WHERE al.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM periodos p
    WHERE p.año_lectivo_id = al.id
      AND p.tipo = 'anual'
      AND p.deleted_at IS NULL
  );

-- 6. Migrate evaluaciones: NULL periodo_id → annual period of their año_lectivo
--    Uses: evaluaciones → materias → cursos → años_lectivos → periodos (tipo='anual')
UPDATE evaluaciones e
SET periodo_id = p.id
FROM materias m
JOIN cursos c ON c.id = m.curso_id AND c.deleted_at IS NULL
JOIN periodos p ON p.año_lectivo_id = c.año_lectivo_id
  AND p.tipo = 'anual'
  AND p.deleted_at IS NULL
WHERE e.materia_id = m.id
  AND e.periodo_id IS NULL
  AND e.deleted_at IS NULL;

-- 7. Assert 0 nulls remain before enforcing NOT NULL
--    If this raises, investigate before applying step 8.
DO $$
DECLARE remaining INT;
BEGIN
  SELECT COUNT(*) INTO remaining
  FROM evaluaciones
  WHERE periodo_id IS NULL AND deleted_at IS NULL;

  IF remaining > 0 THEN
    RAISE EXCEPTION 'Migration halted: % evaluaciones still have NULL periodo_id. Investigate before enforcing NOT NULL.', remaining;
  END IF;
END $$;

-- 8. Enforce NOT NULL on evaluaciones.periodo_id
ALTER TABLE evaluaciones ALTER COLUMN periodo_id SET NOT NULL;

-- 9. Fix FK: ON DELETE SET NULL no longer makes sense now that periodo_id is NOT NULL
ALTER TABLE evaluaciones DROP CONSTRAINT evaluaciones_periodo_id_fkey;
ALTER TABLE evaluaciones ADD CONSTRAINT evaluaciones_periodo_id_fkey
  FOREIGN KEY (periodo_id) REFERENCES periodos(id) ON DELETE RESTRICT;

-- NOTE: evaluaciones_template.periodo_id intentionally left nullable.
-- NULL templates are "institutional/annual templates" (applied across periods),
-- used by the evaluaciones-institucionales feature.
