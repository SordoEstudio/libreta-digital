-- === 1. materias_catalogo (Patrón A) ===

CREATE TABLE materias_catalogo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institucion_id  UUID NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
  nombre          TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_materias_catalogo_unique
  ON materias_catalogo(institucion_id, lower(nombre))
  WHERE deleted_at IS NULL;

ALTER TABLE materias_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY materias_catalogo_tenant ON materias_catalogo
  FOR ALL USING (
    has_any_role(institucion_id, ARRAY['admin', 'docente', 'responsable'])
    OR is_superadmin()
  )
  WITH CHECK (has_role(institucion_id, 'admin') OR is_superadmin());

-- Add catalogo_id nullable first (for data migration)
ALTER TABLE materias ADD COLUMN catalogo_id UUID REFERENCES materias_catalogo(id);

-- Migrate existing materias.nombre → catalog (one entry per distinct lower(nombre) per institution)
INSERT INTO materias_catalogo (institucion_id, nombre, created_at)
SELECT DISTINCT ON (institucion_id, lower(nombre))
  institucion_id, nombre, created_at
FROM materias
WHERE deleted_at IS NULL
ORDER BY institucion_id, lower(nombre), created_at;

-- Link each materia to its catalog entry
UPDATE materias m
SET catalogo_id = mc.id
FROM materias_catalogo mc
WHERE mc.institucion_id = m.institucion_id
  AND lower(mc.nombre) = lower(m.nombre)
  AND m.deleted_at IS NULL;

-- Make catalogo_id NOT NULL (all existing rows now have it)
ALTER TABLE materias ALTER COLUMN catalogo_id SET NOT NULL;

-- Drop nombre — catalog is the single source of truth
ALTER TABLE materias DROP COLUMN nombre;

-- === 2. alumno_inscripciones ===

CREATE TABLE alumno_inscripciones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alumno_id       UUID NOT NULL REFERENCES alumnos(id) ON DELETE CASCADE,
  curso_id        UUID NOT NULL REFERENCES cursos(id),
  institucion_id  UUID NOT NULL REFERENCES instituciones(id),
  activo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_alumno_inscripciones_alumno
  ON alumno_inscripciones(alumno_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_alumno_inscripciones_curso
  ON alumno_inscripciones(curso_id)
  WHERE deleted_at IS NULL;

ALTER TABLE alumno_inscripciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY alumno_inscripciones_select ON alumno_inscripciones
  FOR SELECT USING (
    has_any_role(institucion_id, ARRAY['admin', 'docente'])
    OR is_superadmin()
    OR EXISTS (
      SELECT 1 FROM alumno_responsables ar
      WHERE ar.alumno_id = alumno_inscripciones.alumno_id
        AND ar.persona_id = get_persona_id()
    )
  );

CREATE POLICY alumno_inscripciones_write ON alumno_inscripciones
  FOR INSERT WITH CHECK (has_role(institucion_id, 'admin') OR is_superadmin());

CREATE POLICY alumno_inscripciones_update ON alumno_inscripciones
  FOR UPDATE USING (has_role(institucion_id, 'admin') OR is_superadmin());

-- Migrate existing alumnos.curso_id → inscripciones
INSERT INTO alumno_inscripciones (alumno_id, curso_id, institucion_id, activo, created_at)
SELECT id, curso_id, institucion_id, activo, created_at
FROM alumnos
WHERE curso_id IS NOT NULL
  AND deleted_at IS NULL;

-- Drop curso_id from alumnos
ALTER TABLE alumnos DROP COLUMN curso_id;

-- === 3. materia_docentes missing DELETE policy ===

CREATE POLICY materia_docentes_delete ON materia_docentes
  FOR DELETE USING (has_role(institucion_id, 'admin') OR is_superadmin());
