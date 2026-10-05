CREATE TABLE materia_horarios (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id     UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  institucion_id UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  dia_semana     SMALLINT NOT NULL,
  hora_inicio    TIME NOT NULL,
  hora_fin       TIME NOT NULL,
  aula           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ,

  CONSTRAINT horario_dia_check    CHECK (dia_semana BETWEEN 1 AND 7),
  CONSTRAINT horario_horas_check  CHECK (hora_fin > hora_inicio)
);

CREATE INDEX idx_materia_horarios_materia
  ON materia_horarios(materia_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_materia_horarios_inst_dia
  ON materia_horarios(institucion_id, dia_semana)
  WHERE deleted_at IS NULL;

ALTER TABLE materia_horarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY materia_horarios_tenant ON materia_horarios
  FOR ALL USING (
    has_any_role(institucion_id, ARRAY['admin', 'docente', 'responsable'])
    OR is_superadmin()
  )
  WITH CHECK (
    has_role(institucion_id, 'admin') OR is_superadmin()
  );
