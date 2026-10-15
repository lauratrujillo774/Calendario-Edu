-- Sesiones del servidor (el navegador solo guarda un token aleatorio; aquí se guarda su hash SHA-256)
-- @@UP
CREATE TABLE IF NOT EXISTS sesiones (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  token_hash CHAR(64) NOT NULL,
  usuario_id INT UNSIGNED NOT NULL,
  csrf CHAR(48) NOT NULL,
  creada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_en DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sesion_token (token_hash),
  KEY idx_sesion_expira (expira_en),
  KEY idx_sesion_usuario (usuario_id),
  CONSTRAINT fk_sesion_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
-- @@DOWN
DROP TABLE IF EXISTS sesiones
