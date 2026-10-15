-- Horario del día (calendario): lo que cada persona escribe en una hora, con una casilla de "cumplido".
-- Es independiente de los pendientes: no aparece en la lista de pendientes.
-- @@UP
CREATE TABLE IF NOT EXISTS horario_entradas (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  texto VARCHAR(150) NOT NULL,
  cumplido TINYINT(1) NOT NULL DEFAULT 0,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_horario_dia (usuario_id, fecha, hora),
  CONSTRAINT fk_horario_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@DOWN
DROP TABLE IF EXISTS horario_entradas
