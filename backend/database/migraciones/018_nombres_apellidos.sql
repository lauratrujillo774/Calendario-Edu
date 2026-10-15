-- Nombres y apellidos por separado. `nombre` sigue siendo el nombre completo (se arma con ambos) para no tocar el resto de la aplicación.
-- @@UP
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS nombres VARCHAR(60) NULL AFTER nombre,
  ADD COLUMN IF NOT EXISTS apellidos VARCHAR(60) NULL AFTER nombres
--//
UPDATE usuarios SET nombres = LEFT(nombre, 60) WHERE nombres IS NULL
-- @@DOWN
ALTER TABLE usuarios DROP COLUMN IF EXISTS apellidos, DROP COLUMN IF EXISTS nombres
