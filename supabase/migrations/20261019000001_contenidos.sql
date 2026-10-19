-- Campo en instituciones
ALTER TABLE instituciones
  ADD COLUMN IF NOT EXISTS modulo_contenidos BOOLEAN NOT NULL DEFAULT false;

-- Unidades (carpetas de contenido)
CREATE TABLE unidades_contenido (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  materia_id   UUID NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
  nombre       TEXT NOT NULL CHECK (char_length(nombre) <= 120),
  descripcion  TEXT CHECK (char_length(descripcion) <= 500),
  orden        INT NOT NULL DEFAULT 0,
  publicado    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ
);

-- Items de contenido
CREATE TABLE contenidos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id    UUID NOT NULL REFERENCES unidades_contenido(id) ON DELETE CASCADE,
  tipo         TEXT NOT NULL CHECK (tipo IN ('link','archivo','imagen')),
  titulo       TEXT NOT NULL CHECK (char_length(titulo) <= 200),
  url          TEXT,
  storage_path TEXT,
  nota         TEXT CHECK (char_length(nota) <= 1000),
  dimension_id UUID REFERENCES materias_dimensiones(id) ON DELETE SET NULL,
  orden        INT NOT NULL DEFAULT 0,
  publicado    BOOLEAN NOT NULL DEFAULT true,
  autor_id     UUID REFERENCES personas(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at   TIMESTAMPTZ,
  CHECK (
    (tipo = 'link'                AND url IS NOT NULL AND storage_path IS NULL) OR
    (tipo IN ('archivo','imagen') AND storage_path IS NOT NULL AND url IS NULL)
  )
);

CREATE INDEX ON unidades_contenido(materia_id) WHERE deleted_at IS NULL;
CREATE INDEX ON contenidos(unidad_id) WHERE deleted_at IS NULL;

-- RLS: unidades_contenido
ALTER TABLE unidades_contenido ENABLE ROW LEVEL SECURITY;

-- Staff (docente/admin): SELECT todas incluso borrador
CREATE POLICY "unidades_staff_select" ON unidades_contenido
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM materias m
      JOIN memberships mb ON mb.institucion_id = m.institucion_id
        AND mb.persona_id = auth.uid()
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
        AND mb.persona_id = auth.uid()
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
        AND mb.persona_id = auth.uid()
        AND mb.rol IN ('admin','docente')
        AND mb.activo = true
      WHERE m.id = unidades_contenido.materia_id
        AND m.deleted_at IS NULL
    )
  );

-- Responsables: SELECT solo publicado
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
      WHERE ar.persona_id = auth.uid()
        AND m.id = unidades_contenido.materia_id
    )
  );

-- RLS: contenidos
ALTER TABLE contenidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contenidos_staff_select" ON contenidos
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM unidades_contenido uc
      JOIN materias m ON m.id = uc.materia_id
      JOIN memberships mb ON mb.institucion_id = m.institucion_id
        AND mb.persona_id = auth.uid()
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
        AND mb.persona_id = auth.uid()
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
        AND mb.persona_id = auth.uid()
        AND mb.rol IN ('admin','docente')
        AND mb.activo = true
      WHERE uc.id = contenidos.unidad_id
        AND uc.deleted_at IS NULL AND m.deleted_at IS NULL
    )
  );

-- Responsables: SELECT solo publicado
CREATE POLICY "contenidos_responsable_select" ON contenidos
  FOR SELECT TO authenticated
  USING (
    publicado = true AND deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM unidades_contenido uc
      JOIN materias m ON m.id = uc.materia_id
      JOIN alumno_responsables ar ON ar.persona_id = auth.uid()
      JOIN alumno_inscripciones ai ON ai.alumno_id = ar.alumno_id
        AND ai.curso_id = m.curso_id
        AND ai.activo = true AND ai.deleted_at IS NULL
      WHERE uc.id = contenidos.unidad_id
        AND uc.deleted_at IS NULL AND m.deleted_at IS NULL
    )
  );

-- Storage bucket (privado, 10 MB, tipos permitidos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contenidos',
  'contenidos',
  false,
  10485760,
  ARRAY[
    'image/jpeg','image/png','image/gif','image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
) ON CONFLICT (id) DO NOTHING;
