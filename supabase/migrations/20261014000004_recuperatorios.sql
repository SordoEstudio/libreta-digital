-- Recuperatorios: flag en evaluaciones + templates, self-FK, nota_aprobacion en instituciones

ALTER TABLE instituciones
  ADD COLUMN nota_aprobacion numeric DEFAULT 6;

ALTER TABLE evaluaciones
  ADD COLUMN permite_recuperatorio boolean NOT NULL DEFAULT false,
  ADD COLUMN recuperatorio_de_evaluacion_id uuid REFERENCES evaluaciones(id) ON DELETE SET NULL;

ALTER TABLE evaluaciones_template
  ADD COLUMN permite_recuperatorio boolean NOT NULL DEFAULT false;
