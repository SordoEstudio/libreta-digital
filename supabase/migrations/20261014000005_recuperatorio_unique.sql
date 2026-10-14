-- Prevent duplicate recuperatorios per evaluacion (soft-delete aware)
CREATE UNIQUE INDEX evaluaciones_unique_recuperatorio_idx
  ON evaluaciones (recuperatorio_de_evaluacion_id)
  WHERE recuperatorio_de_evaluacion_id IS NOT NULL
    AND deleted_at IS NULL;
