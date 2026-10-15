ALTER TABLE periodos
  ADD COLUMN activo      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN cerrado_at  TIMESTAMPTZ,
  ADD COLUMN cerrado_por UUID REFERENCES personas(id);

CREATE UNIQUE INDEX idx_periodos_activo_unico
  ON periodos(año_lectivo_id)
  WHERE activo = true AND deleted_at IS NULL;
