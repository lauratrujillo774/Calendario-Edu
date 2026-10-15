-- Diario personal: emociones, cómo me siento, qué salió bien, qué mejorar y nivel de energía (además de gratitud, reflexión y memo).
-- @@UP
ALTER TABLE diario_dias
  ADD COLUMN IF NOT EXISTS emociones VARCHAR(200) NULL AFTER animo,
  ADD COLUMN IF NOT EXISTS sentir TEXT NULL AFTER emociones,
  ADD COLUMN IF NOT EXISTS bien TEXT NULL AFTER gratitud,
  ADD COLUMN IF NOT EXISTS mejorar TEXT NULL AFTER bien,
  ADD COLUMN IF NOT EXISTS energia TINYINT UNSIGNED NULL AFTER mejorar
--//
ALTER TABLE diario_dias ADD CONSTRAINT ck_diario_energia CHECK (energia IS NULL OR (energia >= 1 AND energia <= 5))
-- @@DOWN
ALTER TABLE diario_dias DROP CONSTRAINT IF EXISTS ck_diario_energia
--//
ALTER TABLE diario_dias DROP COLUMN IF EXISTS energia, DROP COLUMN IF EXISTS mejorar, DROP COLUMN IF EXISTS bien, DROP COLUMN IF EXISTS sentir, DROP COLUMN IF EXISTS emociones
