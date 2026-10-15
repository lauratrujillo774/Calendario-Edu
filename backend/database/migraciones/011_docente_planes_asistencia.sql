-- Herramientas del docente: planeación de clases y asistencia. Los estudiantes pueden ver el plan de sus clases y su propia asistencia.
-- @@UP
CREATE TABLE IF NOT EXISTS planes_clase (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  asignacion_id INT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  tema VARCHAR(200) NOT NULL,
  objetivos TEXT NULL,
  actividades TEXT NULL,
  recursos TEXT NULL,
  evaluacion TEXT NULL,
  estado ENUM('planeada','dictada') NOT NULL DEFAULT 'planeada',
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_plan_asignacion_fecha (asignacion_id, fecha),
  CONSTRAINT fk_plan_asignacion FOREIGN KEY (asignacion_id) REFERENCES asignaciones (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--//
CREATE TABLE IF NOT EXISTS asistencias (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  asignacion_id INT UNSIGNED NOT NULL,
  estudiante_id INT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  estado ENUM('presente','ausente','tarde','excusa') NOT NULL,
  nota VARCHAR(200) NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_asistencia (asignacion_id, estudiante_id, fecha),
  KEY idx_asistencia_estudiante (estudiante_id, fecha),
  CONSTRAINT fk_asist_asignacion FOREIGN KEY (asignacion_id) REFERENCES asignaciones (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_asist_estudiante FOREIGN KEY (estudiante_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@DOWN
DROP TABLE IF EXISTS asistencias
--//
DROP TABLE IF EXISTS planes_clase
