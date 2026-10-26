-- observaciones_boletin: one observation per alumno per period
CREATE TABLE IF NOT EXISTS observaciones_boletin (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id   UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  periodo_id  UUID NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  texto       TEXT NOT NULL CHECK (char_length(texto) <= 1000),
  autor_id    UUID REFERENCES personas(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(alumno_id, periodo_id)
);
CREATE INDEX IF NOT EXISTS observaciones_boletin_alumno_idx  ON observaciones_boletin(alumno_id);
CREATE INDEX IF NOT EXISTS observaciones_boletin_periodo_idx ON observaciones_boletin(periodo_id);

ALTER TABLE observaciones_boletin ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "obs_admin" ON observaciones_boletin FOR ALL TO authenticated
  USING (EXISTS(
    SELECT 1 FROM alumnos a
    JOIN memberships m ON m.institucion_id = a.institucion_id
    WHERE a.id = observaciones_boletin.alumno_id
      AND m.persona_id = get_persona_id()
      AND m.rol IN ('admin', 'superadmin')
  ))
  WITH CHECK (EXISTS(
    SELECT 1 FROM alumnos a
    JOIN memberships m ON m.institucion_id = a.institucion_id
    WHERE a.id = observaciones_boletin.alumno_id
      AND m.persona_id = get_persona_id()
      AND m.rol IN ('admin', 'superadmin')
  ));

-- Docente: read + write for alumnos in their active courses
CREATE POLICY "obs_docente_write" ON observaciones_boletin FOR ALL TO authenticated
  USING (EXISTS(
    SELECT 1 FROM alumno_inscripciones ai
    JOIN materia_docentes md ON md.materia_id IN (
      SELECT id FROM materias WHERE curso_id = ai.curso_id AND deleted_at IS NULL
    )
    WHERE ai.alumno_id = observaciones_boletin.alumno_id
      AND ai.activo = TRUE AND ai.deleted_at IS NULL
      AND md.persona_id = get_persona_id()
  ))
  WITH CHECK (EXISTS(
    SELECT 1 FROM alumno_inscripciones ai
    JOIN materia_docentes md ON md.materia_id IN (
      SELECT id FROM materias WHERE curso_id = ai.curso_id AND deleted_at IS NULL
    )
    WHERE ai.alumno_id = observaciones_boletin.alumno_id
      AND ai.activo = TRUE AND ai.deleted_at IS NULL
      AND md.persona_id = get_persona_id()
  ));

-- Responsable: SELECT only for their linked alumnos
CREATE POLICY "obs_responsable_read" ON observaciones_boletin FOR SELECT TO authenticated
  USING (EXISTS(
    SELECT 1 FROM alumno_responsables ar
    WHERE ar.alumno_id = observaciones_boletin.alumno_id
      AND ar.persona_id = get_persona_id()
  ));

-- Alumno: SELECT only for their own record
CREATE POLICY "obs_alumno_read" ON observaciones_boletin FOR SELECT TO authenticated
  USING (EXISTS(
    SELECT 1 FROM alumnos a
    WHERE a.id = observaciones_boletin.alumno_id
      AND a.persona_id = get_persona_id()
  ));

-- Director fields on instituciones
ALTER TABLE instituciones
  ADD COLUMN IF NOT EXISTS director_nombre TEXT,
  ADD COLUMN IF NOT EXISTS director_cargo  TEXT DEFAULT 'Director/a';
