-- The log_nota_change trigger runs as the calling user (docente).
-- Docentes have no INSERT policy on notas_historial, causing RLS violation.
-- SECURITY DEFINER makes the function run as its owner (postgres), bypassing RLS.
ALTER FUNCTION log_nota_change() SECURITY DEFINER;
