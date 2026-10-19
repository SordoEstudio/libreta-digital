-- Unify: use 'unidades' (cuaderno) as single source of truth for contenidos.
-- Drop 'unidades_contenido'; re-point contenidos.unidad_id → unidades.

-- 1. Add publicado to unidades
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS publicado BOOLEAN NOT NULL DEFAULT true;

-- 2. Add responsable SELECT policy on unidades (for contenidos module)
CREATE POLICY "unidades_responsable_select" ON unidades
  FOR SELECT TO authenticated
  USING (
    publicado = true AND deleted_at IS NULL AND
    has_any_role(institucion_id, ARRAY['responsable'])
  );

-- 3. Re-point FK
ALTER TABLE contenidos DROP CONSTRAINT contenidos_unidad_id_fkey;
ALTER TABLE contenidos ADD CONSTRAINT contenidos_unidad_id_fkey
  FOREIGN KEY (unidad_id) REFERENCES unidades(id) ON DELETE CASCADE;

-- 4. Update contenidos RLS: join through unidades directly
DROP POLICY IF EXISTS "contenidos_staff_select" ON contenidos;
DROP POLICY IF EXISTS "contenidos_staff_insert" ON contenidos;
DROP POLICY IF EXISTS "contenidos_staff_update" ON contenidos;
DROP POLICY IF EXISTS "contenidos_responsable_select" ON contenidos;

CREATE POLICY "contenidos_staff_select" ON contenidos
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM unidades u
      JOIN materias m ON m.id = u.materia_id
      JOIN memberships mb ON mb.institucion_id = m.institucion_id
        AND mb.persona_id = get_persona_id()
        AND mb.rol IN ('admin','docente')
        AND mb.activo = true
      WHERE u.id = contenidos.unidad_id
        AND u.deleted_at IS NULL AND m.deleted_at IS NULL
    )
  );

CREATE POLICY "contenidos_staff_insert" ON contenidos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM unidades u
      JOIN materias m ON m.id = u.materia_id
      JOIN memberships mb ON mb.institucion_id = m.institucion_id
        AND mb.persona_id = get_persona_id()
        AND mb.rol IN ('admin','docente')
        AND mb.activo = true
      WHERE u.id = contenidos.unidad_id
        AND u.deleted_at IS NULL AND m.deleted_at IS NULL
    )
  );

CREATE POLICY "contenidos_staff_update" ON contenidos
  FOR UPDATE TO authenticated
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM unidades u
      JOIN materias m ON m.id = u.materia_id
      JOIN memberships mb ON mb.institucion_id = m.institucion_id
        AND mb.persona_id = get_persona_id()
        AND mb.rol IN ('admin','docente')
        AND mb.activo = true
      WHERE u.id = contenidos.unidad_id
        AND u.deleted_at IS NULL AND m.deleted_at IS NULL
    )
  );

CREATE POLICY "contenidos_responsable_select" ON contenidos
  FOR SELECT TO authenticated
  USING (
    publicado = true AND deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM unidades u
      JOIN materias m ON m.id = u.materia_id
      JOIN alumno_responsables ar ON ar.persona_id = get_persona_id()
      JOIN alumno_inscripciones ai ON ai.alumno_id = ar.alumno_id
        AND ai.curso_id = m.curso_id
        AND ai.activo = true AND ai.deleted_at IS NULL
      WHERE u.id = contenidos.unidad_id
        AND u.deleted_at IS NULL AND m.deleted_at IS NULL
    )
  );

-- 5. Drop unidades_contenido
DROP TABLE unidades_contenido;
