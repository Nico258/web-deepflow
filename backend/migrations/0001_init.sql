-- Esquema inicial: identidad y reto de 7 días (specs/04).
--
-- Sin grupos ni código de invitación: una sola comunidad con entrada libre.
-- De cada persona solo se guarda el nickname y el hash de su token; en el grupo
-- hay menores de edad. No hay tabla de rachas: se derivan de los check-ins.
-- Nunca se guarda el texto de las conversaciones.
-- Las tablas de peticiones de oración, si algún día existen, van en su propia
-- migración (specs/05).

-- +goose Up

CREATE TABLE users (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    -- La API lo guarda en minúsculas y filtra vulgaridades; el CHECK es la red de seguridad.
    nickname     text        NOT NULL CONSTRAINT users_nickname_format CHECK (nickname ~ '^[a-z0-9_]{3,7}$'),
    -- SHA-256 del token de dispositivo. Un solo token por cuenta.
    token_hash   bytea       NOT NULL CONSTRAINT users_token_hash_len CHECK (octet_length(token_hash) = 32),
    show_on_wall boolean     NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now(),
    -- store/users.go detecta este nombre para responder nickname_taken.
    CONSTRAINT users_nickname_key   UNIQUE (nickname),
    CONSTRAINT users_token_hash_key UNIQUE (token_hash)
);

CREATE TABLE challenges (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug       text        NOT NULL CONSTRAINT challenges_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    -- Tipo de reto. Hoy solo daily_steps; otro tipo traería su propia tabla de hechos.
    kind       text        NOT NULL,
    -- Día de calendario en Bogotá: la API lo calcula, la base no lo interpreta.
    -- Nulo para tipos sin fecha de inicio.
    starts_on  date,
    -- Lo propio de cada tipo. Claves documentadas en el README.
    config     jsonb       NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT challenges_slug_key UNIQUE (slug),
    -- daily_steps: starts_on obligatorio y config.total_days entero > 0.
    -- Se usa CASE porque Postgres no garantiza el orden de evaluación de AND.
    CONSTRAINT daily_steps_valid CHECK (
        CASE WHEN kind = 'daily_steps' THEN
            starts_on IS NOT NULL
            AND CASE WHEN jsonb_typeof(config -> 'total_days') = 'number'
                     THEN (config ->> 'total_days')::numeric > 0
                      AND (config ->> 'total_days')::numeric = trunc((config ->> 'total_days')::numeric)
                     ELSE false END
        ELSE true END
    )
);

CREATE TABLE enrollments (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    -- RESTRICT: un reto con inscripciones no se borra por accidente.
    challenge_id uuid        NOT NULL REFERENCES challenges (id) ON DELETE RESTRICT,
    -- Se crea con el primer check-in: también registra cuándo la persona aceptó el aviso.
    joined_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT enrollments_user_challenge_key UNIQUE (user_id, challenge_id)
);

-- Consultas del muro y del río.
CREATE INDEX enrollments_challenge_id_idx ON enrollments (challenge_id);

CREATE TABLE checkins (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id uuid        NOT NULL REFERENCES enrollments (id) ON DELETE CASCADE,
    -- El límite superior (config.total_days) lo valida la API.
    day_number    integer     NOT NULL CHECK (day_number >= 1),
    -- Fecha de Bogotá en que se registró: siempre la del propio día (solo se completa hoy).
    completed_on  date        NOT NULL,
    wrote_note    boolean     NOT NULL DEFAULT false,
    created_at    timestamptz NOT NULL DEFAULT now(),
    -- Un check-in por inscripción y día: hace seguros los reintentos y las dobles pulsaciones.
    CONSTRAINT checkins_enrollment_day_key UNIQUE (enrollment_id, day_number)
);

-- Supabase expone el esquema public por su API automática (PostgREST). Nadie debe
-- usarla: RLS activo y sin políticas la deja sin acceso (specs/00 §4).
-- El dueño de las tablas no está sujeto a RLS, así que la API debe conectarse con
-- el mismo rol que corre las migraciones (o con uno que tenga BYPASSRLS).
ALTER TABLE users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges  ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins    ENABLE ROW LEVEL SECURITY;

-- +goose Down

DROP TABLE checkins;
DROP TABLE enrollments;
DROP TABLE challenges;
DROP TABLE users;
