-- Vistas seguras (INVOKER), sin borradores, con estados separados (pendiente / entregada / calificada)
-- y verificando que el estudiante siga matriculado en el grupo. Triggers sin duplicados.
-- @@UP
CREATE OR REPLACE ALGORITHM=UNDEFINED SQL SECURITY INVOKER VIEW v_tareas_estudiante AS
SELECT e.estudiante_id AS estudiante_id, t.id AS tarea_id, t.titulo AS titulo, t.descripcion AS descripcion,
       t.tipo AS tipo, t.prioridad AS prioridad, t.fecha_limite AS fecha_limite, t.hora_limite AS hora_limite,
       m.nombre AS materia, m.color AS color, g.nombre AS grupo, p.nombre AS profesor,
       e.estado AS estado, e.calificacion AS calificacion,
       e.id AS entrega_id, e.fecha_entrega AS fecha_entrega, e.comentario_profesor AS comentario_profesor,
       a.id AS asignacion_id, m.id AS materia_id, g.id AS grupo_id
FROM entregas e
JOIN tareas t ON t.id = e.tarea_id AND t.publicada = 1
JOIN asignaciones a ON a.id = t.asignacion_id
JOIN matriculas mt ON mt.estudiante_id = e.estudiante_id AND mt.grupo_id = a.grupo_id
JOIN materias m ON m.id = a.materia_id
JOIN grupos g ON g.id = a.grupo_id
JOIN usuarios p ON p.id = a.profesor_id
--//
CREATE OR REPLACE ALGORITHM=UNDEFINED SQL SECURITY INVOKER VIEW v_pendientes_estudiante AS
SELECT estudiante_id, tarea_id, titulo, descripcion, tipo, prioridad, fecha_limite, hora_limite,
       materia, color, grupo, profesor, estado, calificacion
FROM v_tareas_estudiante
WHERE estado = 'pendiente'
ORDER BY fecha_limite ASC, hora_limite ASC
--//
CREATE OR REPLACE ALGORITHM=UNDEFINED SQL SECURITY INVOKER VIEW v_estadisticas_estudiante AS
SELECT estudiante_id,
       COUNT(*) AS total,
       SUM(estado = 'pendiente') AS pendientes,
       SUM(estado <> 'pendiente') AS completadas,
       ROUND(SUM(estado <> 'pendiente') * 100 / COUNT(*), 0) AS progreso,
       SUM(estado = 'entregada') AS entregadas,
       SUM(estado = 'calificada') AS calificadas
FROM v_tareas_estudiante
GROUP BY estudiante_id
--//
CREATE OR REPLACE ALGORITHM=UNDEFINED SQL SECURITY INVOKER VIEW v_tareas_profesor AS
SELECT a.profesor_id AS profesor_id, t.id AS tarea_id, t.titulo AS titulo, t.tipo AS tipo,
       t.fecha_limite AS fecha_limite, t.hora_limite AS hora_limite, m.nombre AS materia, g.nombre AS grupo,
       COUNT(e.id) AS total_estudiantes,
       COALESCE(SUM(e.estado = 'pendiente'), 0) AS pendientes,
       COALESCE(SUM(e.estado = 'entregada'), 0) AS entregadas,
       t.publicada AS publicada,
       COALESCE(SUM(e.estado = 'calificada'), 0) AS calificadas
FROM tareas t
JOIN asignaciones a ON a.id = t.asignacion_id
JOIN materias m ON m.id = a.materia_id
JOIN grupos g ON g.id = a.grupo_id
LEFT JOIN entregas e ON e.tarea_id = t.id
     AND e.estudiante_id IN (SELECT mt.estudiante_id FROM matriculas mt WHERE mt.grupo_id = a.grupo_id)
GROUP BY t.id, a.profesor_id, t.titulo, t.tipo, t.fecha_limite, t.hora_limite, t.publicada, m.nombre, g.nombre
ORDER BY t.fecha_limite ASC, t.hora_limite ASC
--//
DROP TRIGGER IF EXISTS trg_tarea_crea_entregas
--//
CREATE TRIGGER trg_tarea_crea_entregas AFTER INSERT ON tareas FOR EACH ROW
BEGIN
  INSERT IGNORE INTO entregas (tarea_id, estudiante_id)
  SELECT NEW.id, mt.estudiante_id
  FROM asignaciones a
  JOIN matriculas mt ON mt.grupo_id = a.grupo_id
  WHERE a.id = NEW.asignacion_id;
END
--//
DROP TRIGGER IF EXISTS trg_tarea_no_cambia_asignacion
--//
CREATE TRIGGER trg_tarea_no_cambia_asignacion BEFORE UPDATE ON tareas FOR EACH ROW
BEGIN
  IF NEW.asignacion_id <> OLD.asignacion_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se puede cambiar la materia/grupo de una tarea ya creada';
  END IF;
END
-- @@DOWN
DROP TRIGGER IF EXISTS trg_tarea_no_cambia_asignacion
--//
DROP TRIGGER IF EXISTS trg_tarea_crea_entregas
--//
CREATE TRIGGER trg_tarea_crea_entregas AFTER INSERT ON tareas FOR EACH ROW
BEGIN
  INSERT INTO entregas (tarea_id, estudiante_id)
  SELECT NEW.id, mt.estudiante_id
  FROM asignaciones a
  JOIN matriculas mt ON mt.grupo_id = a.grupo_id
  WHERE a.id = NEW.asignacion_id;
END
--//
CREATE OR REPLACE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW v_tareas_profesor AS
SELECT a.profesor_id AS profesor_id, t.id AS tarea_id, t.titulo AS titulo, t.tipo AS tipo, t.fecha_limite AS fecha_limite,
       t.hora_limite AS hora_limite, m.nombre AS materia, g.nombre AS grupo, COUNT(e.id) AS total_estudiantes,
       SUM(e.estado = 'pendiente') AS pendientes, SUM(e.estado <> 'pendiente') AS entregadas
FROM tareas t JOIN asignaciones a ON a.id = t.asignacion_id JOIN materias m ON m.id = a.materia_id
JOIN grupos g ON g.id = a.grupo_id LEFT JOIN entregas e ON e.tarea_id = t.id
GROUP BY t.id, a.profesor_id, t.titulo, t.tipo, t.fecha_limite, t.hora_limite, m.nombre, g.nombre
ORDER BY t.fecha_limite ASC, t.hora_limite ASC
--//
CREATE OR REPLACE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW v_estadisticas_estudiante AS
SELECT estudiante_id, COUNT(0) AS total, SUM(estado = 'pendiente') AS pendientes, SUM(estado <> 'pendiente') AS completadas,
       ROUND(SUM(estado <> 'pendiente') * 100 / COUNT(0), 0) AS progreso
FROM entregas GROUP BY estudiante_id
--//
CREATE OR REPLACE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW v_tareas_estudiante AS
SELECT e.estudiante_id AS estudiante_id, t.id AS tarea_id, t.titulo AS titulo, t.descripcion AS descripcion, t.tipo AS tipo,
       t.prioridad AS prioridad, t.fecha_limite AS fecha_limite, t.hora_limite AS hora_limite, m.nombre AS materia,
       m.color AS color, g.nombre AS grupo, p.nombre AS profesor, e.estado AS estado, e.calificacion AS calificacion
FROM entregas e JOIN tareas t ON t.id = e.tarea_id JOIN asignaciones a ON a.id = t.asignacion_id
JOIN materias m ON m.id = a.materia_id JOIN grupos g ON g.id = a.grupo_id JOIN usuarios p ON p.id = a.profesor_id
--//
CREATE OR REPLACE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW v_pendientes_estudiante AS
SELECT estudiante_id, tarea_id, titulo, descripcion, tipo, prioridad, fecha_limite, hora_limite, materia, color, grupo,
       profesor, estado, calificacion
FROM v_tareas_estudiante WHERE estado = 'pendiente' ORDER BY fecha_limite ASC, hora_limite ASC
