CREATE TABLE evaluaciones_referencia (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id     UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  institucion_id UUID NOT NULL,
  nombre         TEXT NOT NULL CHECK (char_length(nombre) >= 1),
  tipo           TEXT NOT NULL DEFAULT 'numerica',
  fecha          DATE,
  docente_id     UUID REFERENCES personas(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

CREATE INDEX idx_ev_ref_materia ON evaluaciones_referencia(materia_id);
CREATE INDEX idx_ev_ref_inst ON evaluaciones_referencia(institucion_id);

CREATE TABLE notas_referencia (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluacion_ref_id UUID NOT NULL REFERENCES evaluaciones_referencia(id) ON DELETE CASCADE,
  alumno_id         UUID NOT NULL REFERENCES alumnos(id),
  institucion_id    UUID NOT NULL,
  valor_numerico    NUMERIC,
  valor_literal     TEXT,
  observacion       TEXT,
  docente_id        UUID REFERENCES personas(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(evaluacion_ref_id, alumno_id)
);

ALTER TABLE evaluaciones_referencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_referencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY ev_ref_tenant ON evaluaciones_referencia
  FOR ALL USING (
    has_any_role(institucion_id, ARRAY['admin','docente']) OR is_superadmin()
  )
  WITH CHECK (
    has_any_role(institucion_id, ARRAY['admin','docente']) OR is_superadmin()
  );

CREATE POLICY notas_ref_tenant ON notas_referencia
  FOR ALL USING (
    has_any_role(institucion_id, ARRAY['admin','docente']) OR is_superadmin()
  )
  WITH CHECK (
    has_any_role(institucion_id, ARRAY['admin','docente']) OR is_superadmin()
  );
