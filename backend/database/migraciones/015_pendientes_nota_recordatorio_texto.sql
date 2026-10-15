-- Exámenes/tareas propios con materia y nota (cuando se marcan como presentados) y recordatorios de texto libre.
-- @@UP
ALTER TABLE pendientes_personales
  ADD COLUMN IF NOT EXISTS materia_id INT UNSIGNED NULL AFTER tarea_id,
  ADD COLUMN IF NOT EXISTS nota DECIMAL(3,1) NULL AFTER materia_id
--//
ALTER TABLE pendientes_personales ADD CONSTRAINT fk_pend_materia FOREIGN KEY (materia_id) REFERENCES materias (id) ON DELETE SET NULL ON UPDATE CASCADE
--//
ALTER TABLE pendientes_personales ADD CONSTRAINT ck_pend_nota CHECK (nota IS NULL OR (nota >= 0 AND nota <= 5))
--//
ALTER TABLE recordatorios ADD COLUMN IF NOT EXISTS texto VARCHAR(200) NULL AFTER pendiente_id
--//
ALTER TABLE recordatorios DROP CONSTRAINT IF EXISTS ck_record_origen
--//
ALTER TABLE recordatorios ADD CONSTRAINT ck_record_origen CHECK (NOT (tarea_id IS NOT NULL AND pendiente_id IS NOT NULL) AND (tarea_id IS NOT NULL OR pendiente_id IS NOT NULL OR texto IS NOT NULL))
-- @@DOWN
ALTER TABLE recordatorios DROP CONSTRAINT IF EXISTS ck_record_origen
--//
DELETE FROM recordatorios WHERE tarea_id IS NULL AND pendiente_id IS NULL
--//
ALTER TABLE recordatorios ADD CONSTRAINT ck_record_origen CHECK ((tarea_id IS NULL) <> (pendiente_id IS NULL))
--//
ALTER TABLE recordatorios DROP COLUMN IF EXISTS texto
--//
ALTER TABLE pendientes_personales DROP CONSTRAINT IF EXISTS ck_pend_nota
--//
ALTER TABLE pendientes_personales DROP FOREIGN KEY IF EXISTS fk_pend_materia
--//
ALTER TABLE pendientes_personales DROP COLUMN IF EXISTS nota, DROP COLUMN IF EXISTS materia_id
