-- Materias que ve cada estudiante: las registra él mismo (además de las del plan de estudios de su grado).
-- @@UP
CREATE TABLE IF NOT EXISTS estudiante_materias (
  usuario_id INT UNSIGNED NOT NULL,
  materia_id INT UNSIGNED NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, materia_id),
  KEY idx_em_materia (materia_id),
  CONSTRAINT fk_em_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_em_materia FOREIGN KEY (materia_id) REFERENCES materias (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@DOWN
DROP TABLE IF EXISTS estudiante_materias
