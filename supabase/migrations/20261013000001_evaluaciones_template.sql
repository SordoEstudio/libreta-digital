CREATE TABLE evaluaciones_template (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  tipo            TEXT NOT NULL,
  peso            NUMERIC NOT NULL DEFAULT 1,
  orden           INT NOT NULL DEFAULT 1,
  periodo_id      UUID NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  fecha           DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT evaluaciones_template_tipo_check
    CHECK (tipo IN ('parcial', 'final', 'recuperatorio', 'tp', 'concepto'))
);

CREATE INDEX idx_evaluaciones_template_institucion
  ON evaluaciones_template(institucion_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_evaluaciones_template_periodo
  ON evaluaciones_template(periodo_id)
  WHERE deleted_at IS NULL;

CREATE TRIGGER evaluaciones_template_updated_at
  BEFORE UPDATE ON evaluaciones_template
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE evaluaciones
  ADD COLUMN template_id UUID REFERENCES evaluaciones_template(id) ON DELETE SET NULL;

ALTER TABLE evaluaciones_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evaluaciones_template_select" ON evaluaciones_template
  FOR SELECT USING (
    is_superadmin() OR has_any_role(institucion_id, ARRAY['admin', 'docente', 'responsable'])
  );

CREATE POLICY "evaluaciones_template_insert" ON evaluaciones_template
  FOR INSERT WITH CHECK (
    is_superadmin() OR has_role(institucion_id, 'admin')
  );

CREATE POLICY "evaluaciones_template_update" ON evaluaciones_template
  FOR UPDATE USING (
    is_superadmin() OR has_role(institucion_id, 'admin')
  );

CREATE POLICY "evaluaciones_template_delete" ON evaluaciones_template
  FOR DELETE USING (
    is_superadmin() OR has_role(institucion_id, 'admin')
  );
