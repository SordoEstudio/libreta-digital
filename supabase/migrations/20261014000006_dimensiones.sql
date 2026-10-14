CREATE TABLE materias_dimensiones (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  nombre     TEXT NOT NULL,
  peso       NUMERIC NOT NULL DEFAULT 1 CHECK (peso > 0),
  orden      INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mat_dim_materia ON materias_dimensiones(materia_id);

ALTER TABLE materias_dimensiones ENABLE ROW LEVEL SECURITY;

CREATE POLICY mat_dim_tenant ON materias_dimensiones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM materias m
      WHERE m.id = materia_id
        AND (has_any_role(m.institucion_id, ARRAY['admin','docente','responsable']) OR is_superadmin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM materias m
      WHERE m.id = materia_id
        AND (has_role(m.institucion_id, 'admin') OR is_superadmin())
    )
  );

ALTER TABLE evaluaciones
  ADD COLUMN dimension_id UUID REFERENCES materias_dimensiones(id) ON DELETE SET NULL;
