CREATE TABLE comunicados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id UUID NOT NULL REFERENCES instituciones(id),
  autor_id UUID NOT NULL REFERENCES personas(id),
  titulo TEXT NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 300),
  contenido TEXT NOT NULL CHECK (char_length(contenido) BETWEEN 1 AND 5000),
  curso_id UUID NOT NULL REFERENCES cursos(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_comunicados_inst ON comunicados(institucion_id);
CREATE INDEX idx_comunicados_curso ON comunicados(curso_id);

CREATE TABLE comunicado_confirmaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comunicado_id UUID NOT NULL REFERENCES comunicados(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES personas(id),
  institucion_id UUID NOT NULL,
  email TEXT NOT NULL,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comunicado_id, persona_id)
);
CREATE INDEX idx_conf_comunicado ON comunicado_confirmaciones(comunicado_id);

ALTER TABLE comunicados ENABLE ROW LEVEL SECURITY;
ALTER TABLE comunicado_confirmaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comunicados_tenant_select" ON comunicados
  FOR SELECT USING (has_any_role(institucion_id, '{admin,docente}') OR is_superadmin());
CREATE POLICY "comunicados_tenant_insert" ON comunicados
  FOR INSERT WITH CHECK (has_any_role(institucion_id, '{admin,docente}') OR is_superadmin());

CREATE POLICY "conf_tenant_select" ON comunicado_confirmaciones
  FOR SELECT USING (has_any_role(institucion_id, '{admin,docente}') OR is_superadmin());
CREATE POLICY "conf_tenant_insert" ON comunicado_confirmaciones
  FOR INSERT WITH CHECK (has_any_role(institucion_id, '{admin,docente}') OR is_superadmin());
