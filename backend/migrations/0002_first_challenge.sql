-- Datos: primera edición del reto «Hablo con Dios cada día» (specs/04 §3).
--
-- Del sábado 14 (día 1, en la reunión) al viernes 20 de noviembre de 2026.
-- Umbral de la racha del grupo: 60 % de las personas inscritas.
-- Va en una migración de datos aparte de la de esquema (specs/04 §5).
-- Los retos siguientes se crean con cmd/seed o con una migración nueva.

-- +goose Up

INSERT INTO challenges (slug, kind, starts_on, config)
VALUES ('oracion-7-dias', 'daily_steps', '2026-11-14',
        '{"total_days": 7, "group_streak_threshold": 0.6}');

-- +goose Down

-- Falla a propósito si el reto ya tiene inscripciones (ON DELETE RESTRICT).
DELETE FROM challenges WHERE slug = 'oracion-7-dias';
