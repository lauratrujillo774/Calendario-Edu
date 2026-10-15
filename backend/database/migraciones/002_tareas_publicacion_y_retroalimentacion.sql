-- Borradores/publicación de tareas, marca de actualización, comentario del profesor y fecha de calificación.
-- Las tareas existentes quedan publicadas (DEFAULT 1) para no cambiar lo que ya ven los estudiantes.
-- @@UP
ALTER TABLE tareas
  ADD COLUMN IF NOT EXISTS publicada TINYINT(1) NOT NULL DEFAULT 1 AFTER archivo_url,
  ADD COLUMN IF NOT EXISTS actualizado_en TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP AFTER creado_en
--//
ALTER TABLE tareas ADD KEY IF NOT EXISTS idx_tareas_publicada (publicada, fecha_limite)
--//
ALTER TABLE entregas
  ADD COLUMN IF NOT EXISTS archivo_nombre VARCHAR(255) NULL AFTER archivo_url,
  ADD COLUMN IF NOT EXISTS comentario_profesor VARCHAR(1000) NULL AFTER calificacion,
  ADD COLUMN IF NOT EXISTS calificado_en DATETIME NULL AFTER comentario_profesor
-- @@DOWN
ALTER TABLE entregas DROP COLUMN IF EXISTS calificado_en, DROP COLUMN IF EXISTS comentario_profesor, DROP COLUMN IF EXISTS archivo_nombre
--//
ALTER TABLE tareas DROP KEY IF EXISTS idx_tareas_publicada
--//
ALTER TABLE tareas DROP COLUMN IF EXISTS actualizado_en, DROP COLUMN IF EXISTS publicada
