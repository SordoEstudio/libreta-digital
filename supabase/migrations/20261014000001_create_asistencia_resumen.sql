CREATE TABLE asistencia_resumen (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id               UUID NOT NULL REFERENCES instituciones(id),
  alumno_id                    UUID NOT NULL REFERENCES alumnos(id),
  materia_id                   UUID REFERENCES materias(id),
  periodo_id                   UUID NOT NULL REFERENCES periodos(id),
  total_clases                 INT NOT NULL DEFAULT 0,
  inasistencias_justificadas   INT NOT NULL DEFAULT 0,
  inasistencias_injustificadas INT NOT NULL DEFAULT 0,
  observacion                  TEXT,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (alumno_id, periodo_id, materia_id)
);

CREATE INDEX idx_asistencia_materia_periodo
  ON asistencia_resumen(materia_id, periodo_id)
  WHERE materia_id IS NOT NULL;

ALTER TABLE asistencia_resumen ENABLE ROW LEVEL SECURITY;

CREATE POLICY asistencia_resumen_tenant ON asistencia_resumen
  FOR ALL USING (
    has_any_role(institucion_id, ARRAY['admin', 'docente', 'responsable'])
    OR is_superadmin()
  )
  WITH CHECK (
    has_any_role(institucion_id, ARRAY['admin', 'docente'])
    OR is_superadmin()
  );
