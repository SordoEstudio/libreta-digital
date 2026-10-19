-- Fix: RLS policies used auth.uid() which returns auth UUID,
-- but persona_id columns store personas.id (not auth UUID).
-- Replace with get_persona_id() which resolves via personas.auth_id.

-- unidades_contenido: drop and recreate all 3 staff policies + responsable
DROP POLICY IF EXISTS "unidades_staff_select" ON unidades_contenido;
DROP POLICY IF EXISTS "unidades_staff_insert" ON unidades_contenido;
DROP POLICY IF EXISTS "unidades_staff_update" ON unidades_contenido;
DROP POLICY IF EXISTS "unidades_responsable_select" ON unidades_contenido;

CREATE POLICY "unidades_staff_select" ON unidades_contenido
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM materias m
      JOIN memberships mb ON mb.institucion_id = m.institucion_id
        AND mb.persona_id = get_persona_id()
        AND mb.rol IN ('admin','docente')
        AND mb.activo = true
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
        AND mb.persona_id = get_persona_id()
        AND mb.rol IN ('admin','docente')
        AND mb.activo = true
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
        AND mb.persona_id = get_persona_id()
        AND mb.rol IN ('admin','docente')
        AND mb.activo = true
      WHERE m.id = unidades_contenido.materia_id
        AND m.deleted_at IS NULL
    )
  );

CREATE POLICY "unidades_responsable_select" ON unidades_contenido
  FOR SELECT TO authenticated
  USING (
    publicado = true AND deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM alumno_responsables ar
      JOIN alumno_inscripciones ai ON ai.alumno_id = ar.alumno_id
        AND ai.activo = true AND ai.deleted_at IS NULL
      JOIN materias m ON m.curso_id = ai.curso_id
        AND m.deleted_at IS NULL
      WHERE ar.persona_id = get_persona_id()
        AND m.id = unidades_contenido.materia_id
    )
  );

-- contenidos: drop and recreate all 3 staff policies + responsable
DROP POLICY IF EXISTS "contenidos_staff_select" ON contenidos;
DROP POLICY IF EXISTS "contenidos_staff_insert" ON contenidos;
DROP POLICY IF EXISTS "contenidos_staff_update" ON contenidos;
DROP POLICY IF EXISTS "contenidos_responsable_select" ON contenidos;

CREATE POLICY "contenidos_staff_select" ON contenidos
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM unidades_contenido uc
      JOIN materias m ON m.id = uc.materia_id
      JOIN memberships mb ON mb.institucion_id = m.institucion_id
        AND mb.persona_id = get_persona_id()
        AND mb.rol IN ('admin','docente')
        AND mb.activo = true
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
        AND mb.persona_id = get_persona_id()
        AND mb.rol IN ('admin','docente')
        AND mb.activo = true
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
        AND mb.persona_id = get_persona_id()
        AND mb.rol IN ('admin','docente')
        AND mb.activo = true
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
      JOIN alumno_responsables ar ON ar.persona_id = get_persona_id()
      JOIN alumno_inscripciones ai ON ai.alumno_id = ar.alumno_id
        AND ai.curso_id = m.curso_id
        AND ai.activo = true AND ai.deleted_at IS NULL
      WHERE uc.id = contenidos.unidad_id
        AND uc.deleted_at IS NULL AND m.deleted_at IS NULL
    )
  );
