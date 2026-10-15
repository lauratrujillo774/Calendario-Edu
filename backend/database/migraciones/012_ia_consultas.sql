-- Reutiliza la tabla consultas_ia que ya existía: se añade el tipo de consulta (asistente, plan de estudio, retroalimentación, plan de clase).
-- @@UP
ALTER TABLE consultas_ia ADD COLUMN IF NOT EXISTS tipo VARCHAR(30) NOT NULL DEFAULT 'asistente' AFTER usuario_id
--//
ALTER TABLE consultas_ia ADD KEY IF NOT EXISTS idx_ia_usuario_fecha (usuario_id, creado_en)
-- @@DOWN
ALTER TABLE consultas_ia DROP KEY IF EXISTS idx_ia_usuario_fecha
--//
ALTER TABLE consultas_ia DROP COLUMN IF EXISTS tipo
