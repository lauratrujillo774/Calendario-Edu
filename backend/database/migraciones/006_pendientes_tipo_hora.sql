-- Los pendientes personales pueden ser de tipo tarea, examen o evento (con hora opcional), para que el estudiante
-- agregue "su" examen o evento al calendario sin tocar las actividades oficiales de los profesores.
-- @@UP
ALTER TABLE pendientes_personales
  ADD COLUMN IF NOT EXISTS tipo ENUM('tarea','examen','evento') NOT NULL DEFAULT 'tarea' AFTER descripcion,
  ADD COLUMN IF NOT EXISTS hora TIME NULL AFTER fecha_limite
-- @@DOWN
ALTER TABLE pendientes_personales DROP COLUMN IF EXISTS hora, DROP COLUMN IF EXISTS tipo
