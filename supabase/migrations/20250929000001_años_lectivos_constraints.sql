-- Enforce at most one active año lectivo per institution at the DB level.
-- The API already deactivates others on PATCH activo=true, but a concurrent
-- request could bypass that check. This index makes the constraint atomic.
CREATE UNIQUE INDEX idx_años_lectivos_one_active_per_institucion
  ON años_lectivos(institucion_id)
  WHERE activo = true AND deleted_at IS NULL;
