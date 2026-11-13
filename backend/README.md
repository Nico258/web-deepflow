# API DeepFlow

API en Go del reto de 7 días de DeepFlow, «Hablo con Dios cada día»: registro con solo un nickname, check-ins diarios, rachas, muro y río del grupo. Es el único acceso a la base (Postgres en Supabase); el front en Next.js la consume por HTTPS + JSON bajo `/v1`.

Las specs están en [specs/](specs/README.md). Esta API implementa el primer lanzamiento de [specs/03-api.md](specs/03-api.md) sobre el esquema de [specs/04-base-de-datos.md](specs/04-base-de-datos.md). Las **peticiones de oración** son otra funcionalidad, posterior ([specs/05](specs/05-peticiones-de-oracion.md)), y no están aquí.

**Primera edición del reto:** `oracion-7-dias`, del **sábado 14** (día 1, en la reunión) al **viernes 20 de noviembre de 2026**. La crea la migración `0002_first_challenge.sql`.

## Endpoints

Todas las rutas, salvo `health` y `join`, exigen `Authorization: Bearer <token>`. «Hoy» lo decide el servidor en hora de Bogotá.

| Método y ruta | Cuerpo | Respuesta |
|---|---|---|
| `GET /v1/health` | | `200 {status:"ok"}` · `503` si la BD no responde |
| `POST /v1/join` | `{nickname}` | `201 {token, user}`: el token se devuelve **una sola vez** |
| `GET /v1/me` | | `200 {id, nickname, show_on_wall}` |
| `PATCH /v1/me` | `{show_on_wall}` | `200` perfil |
| `DELETE /v1/me` | | `204`: borra la cuenta, su inscripción y sus check-ins; el nickname queda libre |
| `GET /v1/challenges/{slug}` | | `200 {slug, kind, starts_on, total_days, today, day_number, status, enrolled}` |
| `GET /v1/challenges/{slug}/me` | | `200 {enrolled, joined_day, checkins:[{day_number, wrote_note}], completed_count, written_count, streak}` |
| `PUT /v1/challenges/{slug}/checkins/{day}` | `{wrote_note, accepted_terms}` | `201` primera vez · `200` si ya existía; `{day_number, wrote_note}` |
| `GET /v1/challenges/{slug}/wall?order=recent\|alpha` | | `200 {members:[{nickname, completed_count, streak, last_activity_at}]}` |
| `GET /v1/challenges/{slug}/river` | | `200 {total_checkins, possible_checkins, group_streak}` |

Notas para el front:

- **Registrarse es «firmar» el compromiso**: en el espacio «Mi firma» la persona escribe su nickname, y con eso se crea la cuenta. No hay código de invitación, nombre ni contraseña. El nickname tiene de 3 a 7 caracteres (`a-z`, `0-9`, `_`) y la API lo pasa a minúsculas. Si ya existe, responde `409 nickname_taken` y la persona elige otro.
- **No hay ruta de inscripción.** La persona queda inscrita al completar su **primer día**, y en ese check-in debe enviar `accepted_terms: true` (aceptó el aviso de privacidad en pantalla); si no, `400 terms_not_accepted`. Desde el segundo día ya no se pide.
- **Solo se completa el día de hoy.** A medianoche de Bogotá el día se bloquea: marcar un día pasado responde `409 day_closed` y uno futuro `409 day_in_future`. Si la persona tenía el día abierto en pantalla y pasó la medianoche, explicarlo con un mensaje amable y conservar su texto.
- **`status`** ∈ `not_started` · `in_progress` · `finished`. **`day_number`** es el día en que va el grupo: ≤ 0 antes del sábado 14 y 8 o más después del viernes 20. Se puede marcar `day_number` mientras `status` sea `in_progress`.
- **`GET …/me` antes del primer día** responde `enrolled: false`, `joined_day: null` y listas vacías: no es un error. `joined_day` es el día del reto en que la persona hizo su primer check-in; sirve para mostrar los días anteriores como «antes de que llegaras».
- **El check-in se puede repetir** el mismo día sin duplicar nada; `wrote_note` toma el último valor enviado.
- **El muro** lista solo a quienes completaron al menos un día y tienen `show_on_wall`; nunca expone ids. Por defecto se ordena por actividad reciente (`recent`); no hay ranking por puntaje.
- **El río** se mide contra las personas inscritas, también las que ocultan su muro. `possible_checkins` cuenta, por cada persona, los días desde el de su inscripción hasta hoy (o hasta el día 7), así que quien llega tarde no baja el río. El nivel del río lo traduce el front.
- **Las rachas** cuentan días seguidos que terminan hoy o ayer: que hoy aún no esté marcado no la rompe. La del grupo cuenta un día como «ganado en equipo» si lo completó al menos el 60 % de las personas inscritas hasta ese día.
- **Polling** del muro y el río: cada 30–60 s, pausado si la pestaña no está visible. Volver a pedir el reto al recuperar el foco para que el día nuevo se abra (y el anterior se bloquee) sin recargar.

### Errores

Formato único: `{"error": {"code": "day_closed", "message": "Ese día ya se cerró."}}`. El `message` está en español para mostrarlo tal cual; el `code` es estable. El catálogo completo está en [internal/httpapi/errors.go](internal/httpapi/errors.go).

| HTTP | Códigos |
|---|---|
| 400 | `invalid_body`, `invalid_query`, `invalid_nickname`, `nickname_not_allowed`, `terms_not_accepted`, `invalid_day` |
| 401 | `unauthorized` (falta el token, no es válido o la cuenta se borró) |
| 404 | `not_found` |
| 409 | `nickname_taken`, `challenge_not_started`, `challenge_closed`, `day_in_future`, `day_closed` |
| 413 · 429 | `body_too_large` · `rate_limited` (con `Retry-After`) |
| 500 · 503 | `internal` · `unavailable` |

## Estructura

```
cmd/
  api/          arranque: config, pool de BD, rutas, servidor
  migrate/      aplica migrations/ con goose (up | down | status)
  seed/         crea retos daily_steps (los siguientes y los de prueba)
internal/
  config/       variables de entorno (+ carga de .env en local)
  httpapi/      router, middleware, handlers, errores; define la interfaz Store
  domain/       reglas puras sin I/O: fechas en Bogotá, bloqueo diario, rachas,
                río, nickname y filtro de vulgaridades (nickname_blocklist.go)
  store/        consultas a Postgres con pgx; implementa httpapi.Store
  token/        token de dispositivo y su hash SHA-256
migrations/     0001_init.sql (esquema), 0002_first_challenge.sql (datos)
specs/          especificaciones del proyecto
```

Dependencias entre paquetes: `httpapi → domain, token`; `store → domain`; `domain` no importa nada del proyecto. Así lo delicado (fechas y rachas) se prueba sin base ni red.

## Desarrollo local

Requisitos: Go 1.26 y un Postgres local (Docker o una instalación propia).

```powershell
# 1. Variables de entorno
Copy-Item .env.example .env

# 2. Postgres local (o usar uno propio y ajustar DATABASE_URL)
docker compose up -d

# 3. Esquema y primer reto
go run ./cmd/migrate               # up; también: status, down

# 4. API en http://localhost:8080
go run ./cmd/api
```

> Si ya tenías una base local con el esquema anterior (con grupos y código de invitación), recréala: `docker compose down -v` y vuelve a migrar. La migración 0001 se reescribió antes de aplicarse en ningún entorno real.

Probar:

```powershell
curl.exe http://localhost:8080/v1/health
curl.exe -X POST http://localhost:8080/v1/join -d '{\"nickname\":\"ana\"}'
curl.exe http://localhost:8080/v1/challenges/oracion-7-dias -H "Authorization: Bearer <token>"
```

### Probar días sin esperar

Dos opciones (specs/04 §4):

- **Fijar «hoy»**: con `APP_ENV=development` y `DEV_TODAY=2026-11-16` en `.env`, la API se comporta como si en Bogotá fuera el lunes 16 (día 3). La API se niega a arrancar si `DEV_TODAY` está definida sin `APP_ENV=development`.
- **Sembrar un reto de prueba** con fecha en el pasado: `go run ./cmd/seed -slug prueba -starts-on 2026-11-10 [-total-days 7] [-threshold 0.6]`.

### Tests

```powershell
go test ./...                       # unitarios: domain, token, httpapi (sin base de datos)

# Integración de internal/store contra Postgres. Cada test crea y borra su propio
# esquema; no toca public. Nunca apuntar a producción.
$env:TEST_DATABASE_URL = "postgres://deepflow:deepflow@localhost:5432/deepflow?sslmode=disable"
go test ./internal/store/
```

En CI ([ci.yml](.github/workflows/ci.yml)) corren todos, incluidos los de integración contra un Postgres de servicio, más gofmt, vet y una subida y bajada de las migraciones.

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Postgres. En Supabase, el **pooler en modo transacción** |
| `CORS_ALLOWED_ORIGINS` | No | Orígenes permitidos, separados por coma. Nunca `*` |
| `PORT` | No | Por defecto `8080` (Cloud Run y Render lo inyectan) |
| `TRUSTED_PROXY_HOPS` | No | Proxies de confianza delante de la API para leer `X-Forwarded-For`. `0` en local. **Verificar en el hosting real** antes de fijarlo: si queda mal, todo el grupo comparte un solo cupo de rate limit |
| `MIGRATIONS_DATABASE_URL` | No | Solo para `cmd/migrate`. En Supabase, el pooler en **modo sesión** |
| `APP_ENV`, `DEV_TODAY` | No | Solo desarrollo: fijar «hoy» (ver arriba) |
| `TEST_DATABASE_URL` | No | Solo para los tests de integración de `internal/store` |

## Tipos de reto y `challenges.config`

Cada reto tiene un `kind` y un `config` (jsonb) con lo propio de ese tipo. La API valida el `config` al leer el reto y la base valida lo esencial con un `CHECK`. Hoy solo existe `daily_steps`:

| Clave | Tipo | Obligatoria | Uso |
|---|---|---|---|
| `total_days` | entero > 0 | Sí | Cantidad de días del reto |
| `group_streak_threshold` | número 0..1 | No (por defecto `0.6`) | Fracción de las personas inscritas que debe completar un día para que cuente en la racha del grupo |

Otro tipo de reto definiría sus propias claves y su propia tabla de hechos.

## Filtro de nicknames

[internal/domain/nickname_blocklist.go](internal/domain/nickname_blocklist.go) rechaza nicknames con contenido vulgar u ofensivo (`400 nickname_not_allowed`), con una lista en español colombiano y algunas palabras en inglés. Antes de comparar normaliza: minúsculas, sin `_`, números por letras (`0→o`, `1→i`, `3→e`, `4→a`, `5→s`, `7→t`) y letras repetidas (`puuuta` cae como `puta`). Rechaza si el nickname **contiene** una palabra de la lista.

Para que nombres comunes no queden bloqueados por contener una palabra (p. ej. «vergara»), hay una lista corta de partes permitidas. Al ampliar cualquiera de las dos listas, agregar el caso al test y comprobar que los nombres comunes del test siguen pasando. Lo que se cuele lo quita un líder borrando la cuenta (abajo).

## Tareas de líderes (mientras no haya rutas de administración)

Se hacen directamente en la base, desde el editor SQL de Supabase:

```sql
-- Liberar un nickname (celular perdido o nickname inapropiado).
-- Borra en cascada su inscripción y sus check-ins.
DELETE FROM users WHERE nickname = 'xxx';
```

`DELETE /v1/admin/users/{id}` con clave de administrador está previsto para después (specs/03 §8).

## Decisiones tomadas sobre puntos abiertos o delegados

| Tema (spec) | Elección | Razón |
|---|---|---|
| Nickname ya usado (00 §3) | Opción A: `409 nickname_taken` | La recomendada; con B cualquiera entraría en cuentas ajenas. Pasar a B solo cambia `POST /v1/join` |
| Mismo repo o aparte (03 §9) | Repo aparte; el módulo vive en la raíz, no en `backend/` | Este repo existe solo para la API |
| Herramienta de migraciones (04 §5) | goose como librería, desde `cmd/migrate` | Archivos `0001_init.sql` como pide la spec; funciona en Windows sin instalar nada |
| Siembra del primer reto (04 §5) | Migración de datos aparte, `0002_first_challenge.sql` | Un solo `migrate up` deja Supabase listo; los retos siguientes van con `cmd/seed` o con otra migración |
| Fijar «hoy» en desarrollo (04 §4) | `DEV_TODAY`, solo con `APP_ENV=development` | Probar el bloqueo diario sin esperar días; la API no arranca si se olvida en producción |
| Instantes del registro | La API fija `joined_at` y `created_at` con su reloj | Mantiene coherentes el río y el muro también con `DEV_TODAY` |
| Muro y río (03 §3) | Dos endpoints separados | Más claros; a esta escala el costo da igual |
| IP detrás del proxy (03 §5) | `TRUSTED_PROXY_HOPS` configurable | Cloud Run y Render agregan un número distinto de saltos |
| Días entre retos (02 §4) | Rompen la racha personal | Es lo que da el cálculo; en la primera edición no afecta |

## Rate limit

Pensado para la reunión del sábado 14, cuando todo el grupo se registra y marca el día 1 a la vez desde el mismo wifi, es decir, desde una sola IP ([ratelimit.go](internal/httpapi/ratelimit.go), `DefaultLimits`):

- **Registro** (`POST /v1/join`): ráfaga de 60 por IP y después 60 por hora. Sin código de invitación, es la principal defensa contra registros masivos.
- **General**: 600 por minuto por IP, con ráfaga de 200.
- **Por persona**: 60 por minuto.

Hay un test que registra a 55 personas desde una IP y les hace marcar el día 1.

## Despliegue

- **Imagen**: `docker build -t deepflow-api .` (binario estático en `distroless`, zonas horarias incrustadas).
- **Supabase**: la API se conecta por el pooler en modo transacción; las migraciones, por el modo sesión. Las tablas tienen RLS activo y sin políticas para cerrar la API automática de Supabase: la API debe usar el **mismo rol que corrió las migraciones** (dueño de las tablas) o uno con `BYPASSRLS`.
- **Hosting**: la elección entre Cloud Run y Render está delegada a quien despliega (specs/00 §5). Cloud Run: `min-instances 0`, `max-instances` bajo (1–3) para que el rate limit en memoria siga sirviendo, y alerta de presupuesto. Render: despertar el servicio antes de la reunión del sábado.
- **GitHub Actions**: [health-ping.yml](.github/workflows/health-ping.yml) llama a `/v1/health` cada 2 días para que Supabase no pause la base. Requiere el secreto `API_URL`.
- **Pendiente de operación**: el `pg_dump` programado (specs/04 §6). El volcado contiene nicknames e historial de participación: guardarlo en privado y con retención corta.
