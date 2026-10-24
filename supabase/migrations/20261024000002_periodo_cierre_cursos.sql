CREATE TABLE periodo_cierre_cursos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo_id    UUID NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  curso_id      UUID NOT NULL REFERENCES cursos(id)  ON DELETE CASCADE,
  cerrado_at    TIMESTAMPTZ,
  publicado_at  TIMESTAMPTZ,
  abierto_at    TIMESTAMPTZ,
  UNIQUE(periodo_id, curso_id)
);
CREATE INDEX periodo_cierre_cursos_periodo_idx ON periodo_cierre_cursos(periodo_id);
CREATE INDEX periodo_cierre_cursos_curso_idx   ON periodo_cierre_cursos(curso_id);
