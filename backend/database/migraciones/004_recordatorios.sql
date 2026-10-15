-- Recordatorios: pueden ser de una tarea o de un pendiente personal, y no se pueden duplicar.
-- @@UP
ALTER TABLE recordatorios MODIFY tarea_id INT UNSIGNED NULL
--//
ALTER TABLE recordatorios ADD COLUMN IF NOT EXISTS pendiente_id INT UNSIGNED NULL AFTER tarea_id
--//
ALTER TABLE recordatorios ADD CONSTRAINT fk_record_pendiente FOREIGN KEY (pendiente_id) REFERENCES pendientes_personales (id) ON DELETE CASCADE ON UPDATE CASCADE
--//
ALTER TABLE recordatorios ADD UNIQUE KEY uq_record_tarea (usuario_id, tarea_id, avisar_en)
--//
ALTER TABLE recordatorios ADD UNIQUE KEY uq_record_pendiente (usuario_id, pendiente_id, avisar_en)
--//
ALTER TABLE recordatorios ADD CONSTRAINT ck_record_origen CHECK ((tarea_id IS NULL) <> (pendiente_id IS NULL))
-- @@DOWN
ALTER TABLE recordatorios DROP CONSTRAINT IF EXISTS ck_record_origen
--//
DELETE FROM recordatorios WHERE tarea_id IS NULL
--//
ALTER TABLE recordatorios DROP FOREIGN KEY IF EXISTS fk_record_pendiente
--//
ALTER TABLE recordatorios ADD KEY IF NOT EXISTS fk_record_usuario (usuario_id)
--//
ALTER TABLE recordatorios DROP KEY IF EXISTS uq_record_pendiente
--//
ALTER TABLE recordatorios DROP KEY IF EXISTS uq_record_tarea
--//
ALTER TABLE recordatorios DROP COLUMN IF EXISTS pendiente_id
--//
ALTER TABLE recordatorios MODIFY tarea_id INT UNSIGNED NOT NULL
