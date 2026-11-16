# 03 · API (Go)

Arquitectura, identidad y operación: [00-arquitectura.md](00-arquitectura.md). Reglas del reto: [02-reto-7-dias.md](02-reto-7-dias.md). Tablas: [04-base-de-datos.md](04-base-de-datos.md).

Esto es una guía de forma, no un contrato exhaustivo: nombres de campos y códigos pueden ajustarse al implementar, siempre que front y API queden de acuerdo.

> **Esta spec cubre la identidad y el reto de 7 días.** Las **peticiones de oración son una funcionalidad completamente distinta**: sus endpoints, reglas y moderación están solo en [05-peticiones-de-oracion.md](05-peticiones-de-oracion.md) y no forman parte del primer lanzamiento. La API las tendrá algún día como un módulo aparte que comparte únicamente la identidad (token y `users`).

## 1. Principios

**Decidido**

- Único acceso a la base de datos. Versionada bajo `/v1`, JSON sobre HTTPS.
- Tres capas: **middleware** (CORS con lista de orígenes, rate limit, validación del token), **handlers REST** (identidad, retos y check-ins) y **lógica de dominio** (rachas, cálculo del día).
- El servidor decide «hoy» en `America/Bogota`.
- La racha **se calcula** a partir de los check-ins; no hay contador guardado.
- Los líderes se autentican con una **clave de administrador**.

**Recomendado**

- Biblioteca estándar de Go (`net/http` con el enrutador por patrones de Go 1.22+) y `pgx` para Postgres: pocas dependencias, suficiente para este tamaño.
- Los handlers son delgados: validan entrada, llaman al dominio, serializan. Toda regla va en dominio, que es lo que se prueba con tests unitarios sin base de datos.

## 2. Autenticación

### Token de dispositivo

| Paso | Cómo |
|---|---|
| Generación | Al unirse, la API crea un token aleatorio de 32 bytes (CSPRNG), codificado en base64url, y lo devuelve **una sola vez** |
| Viaje | Cabecera `Authorization: Bearer <token>` en cada petición. Nunca en la URL ni en la query |
| Almacenamiento en servidor | Solo el hash (SHA-256) en `users.token_hash`, con índice único |
| Validación | El middleware hashea el token recibido, busca al usuario y lo pone en el contexto de la petición. Sin coincidencia → `401` |

*Por qué SHA-256 y no bcrypt:* el token es aleatorio y de alta entropía, no una contraseña elegida por una persona; un hash rápido es suficiente y permite buscar por igualdad.

### Entrada libre (sin código de invitación ni contraseña)

**Decidido:** no hay código de invitación, ni grupos, ni contraseña: cualquiera con el enlace puede registrarse con solo un nickname, para que entrar tenga la menor fricción posible. Sin esa barrera, la defensa contra registros masivos o de spam es el **rate limit estricto** de `POST /v1/join` (§5) y la posibilidad de que un líder borre cuentas (directamente en la base mientras no exista `DELETE /v1/admin/users/{id}`, ver §8). Además, quien se registra y nunca completa un día no cuenta en las medidas del grupo ([02 §4](02-reto-7-dias.md)).

### Nickname repetido

**Abierto** (opciones y riesgos en [00 §3](00-arquitectura.md)): si `POST /v1/join` con un nickname ya usado responde `409 nickname_taken` (opción A, recomendada) o entrega un token nuevo para esa cuenta e invalida el anterior (opción B). La base de datos sirve igual para las dos. Mientras no se decida, implementar A: es la que no deja entrar en cuentas ajenas, y pasar a B después solo cambia este endpoint.

**No hay código de recuperación ni contraseña** (decidido; ver [00 §3](00-arquitectura.md)). Un líder puede liberar nicknames.

### Líderes (clave de administrador)

- Una clave larga en variable de entorno, enviada como `Authorization: Bearer <clave>` solo a rutas `/v1/admin/*`. Comparación en tiempo constante.
- Mientras no exista panel de líderes, se usa con `curl` o una herramienta; la clave nunca va al front.
- **Recomendado:** rate limit más estricto aún en `/admin`, y poder rotar la clave sin tocar la base.
- **Abierto:** si habrá una clave por líder (para saber quién hizo qué) o una sola compartida. Para ~50 personas una sola basta, pero no distingue quién moderó.

## 3. Endpoints del primer lanzamiento

«Cualquiera» = sin token. «Miembro» = token válido de una persona registrada. Las rutas con `{slug}` usan el identificador del reto (p. ej. `oracion-7-dias`).

| Método y ruta | Quién | Propósito | Petición → respuesta (forma general) |
|---|---|---|---|
| `GET /v1/health` | Cualquiera | Salud; **consulta la BD** para mantenerla despierta ([00 §4](00-arquitectura.md)) | → `{ "status": "ok" }`; `503` si la BD no responde. No devuelve datos internos |
| `POST /v1/join` | Cualquiera (rate limit estricto) | Registrarse con un nickname (es la «firma» del compromiso) | `{ nickname }` → `201 { token, user }`. Errores: formato inválido (`400 invalid_nickname`), contenido no permitido (`400 nickname_not_allowed`), nickname ya usado (`409`, según la decisión abierta de §2) |
| `GET /v1/me` | Miembro | Perfil propio | → `{ id, nickname, show_on_wall }` |
| `PATCH /v1/me` | Miembro | Cambiar si aparece en el muro | `{ show_on_wall }` → perfil |
| `DELETE /v1/me` | Miembro | Borrar la cuenta y todos sus datos en cascada | → `204` |
| `GET /v1/challenges/{slug}` | Miembro | Datos del reto y **qué día es hoy** | → `{ slug, kind, starts_on, total_days, today, day_number, status, enrolled }` donde `total_days` sale de `challenges.config`, `today` es la fecha de Bogotá y `status` ∈ aún no empieza / en curso / terminado |
| `GET /v1/challenges/{slug}/me` | Miembro | Mi estado: días completados, si escribí cada día, racha personal | → `{ enrolled, joined_day, checkins: [{ day_number, wrote_note }], completed_count, written_count, streak }`. Si aún no completó ningún día: `enrolled: false` y listas vacías (no es un error) |
| `PUT /v1/challenges/{slug}/checkins/{day}` | Miembro | Marcar **el día de hoy** como completado (idempotente; permite actualizar `wrote_note`). **Si es su primer día, crea la inscripción** en la misma transacción | `{ wrote_note, accepted_terms }` → `201` primera vez, `200` si ya existía; devuelve el check-in. En el primer día `accepted_terms` debe ser `true` (la persona aceptó el aviso en pantalla); si no, `400 terms_not_accepted`. La fecha de la inscripción (`joined_at`) queda como registro de cuándo aceptó |
| `GET /v1/challenges/{slug}/wall` | Miembro | Muro del grupo | → `{ members: [{ nickname, completed_count, streak, last_activity_at }] }`; query `?order=recent\|alpha`. Solo personas inscritas con `show_on_wall` |
| `GET /v1/challenges/{slug}/river` | Miembro | Río del grupo y racha del grupo | → `{ total_checkins, possible_checkins, group_streak }` |

Notas de diseño:

- **No hay endpoint de inscripción.** La inscripción se crea sola con el primer check-in ([02 §3](02-reto-7-dias.md)). Así no hace falta un paso extra y quien solo se registra no cuenta como inscrito.
- **El muro y el río** podrían ser una sola respuesta para ahorrar una petición del polling cada 30–60 s. Dos endpoints son más claros; uno solo es más barato. A esta escala da igual: es una decisión de implementación.
- **Nunca** aparece contenido en ninguna respuesta (no existe en el servidor) ni `user_id` en el muro.
- La API **no devuelve nombres de nivel**: devuelve conteos y el front los traduce ([02 §5](02-reto-7-dias.md)).
- `PUT` (y no `POST`) para el check-in porque es idempotente: pulsar dos veces o reintentar tras un corte de red no duplica ni falla.
- **Abierto:** cómo se crean los retos. Para el primer lanzamiento basta una migración o un script de siembra (`INSERT` con su `kind`, `starts_on` y `config`) ejecutado por quien administra; no hace falta endpoint. Si se prefiere crearlos por API, serían rutas `/v1/admin/*`.

## 4. Reglas de dominio

Se implementan en la capa de dominio y se validan en el servidor **siempre**, aunque el front ya las oculte.

| Regla | Cómo |
|---|---|
| **Un check-in por persona, reto y día** | Restricción única en la base (`enrollment_id, day_number`). El `PUT` hace *upsert*: no hay error por repetir |
| **Hoy en Bogotá** | `today = fecha actual en America/Bogota`; `day_number = (today − starts_on) + 1`. Con `time/tzdata` incrustado |
| **Solo el día de hoy** | Aceptar únicamente `day == day_number`. Día futuro → `409 day_in_future`. Día pasado → `409 day_closed` (los días se bloquean a medianoche y no se pueden completar después) |
| **Rango del reto** | `1 ≤ day ≤ total_days` (`total_days` se lee de `config`, así que este tope lo valida la API) |
| **Configuración del reto** | Al leer un reto, la API valida que su `config` tenga la forma que exige su `kind` (`daily_steps`: `total_days` entero > 0 y, opcional, `group_streak_threshold` entre 0 y 1) |
| **Reto aún no iniciado / ya terminado** | Aún no: `409 challenge_not_started`. Después del último día: `409 challenge_closed` |
| **Inscripción implícita** | Si la persona no tiene inscripción en el reto, el primer check-in válido la crea (`joined_at` = ahora). Inscripción y check-in van en la misma transacción |
| **Racha derivada** | Ver abajo |
| **`completed_on`** | Se guarda la fecha de Bogotá en que se registró. Con la regla de «solo el día de hoy», coincide siempre con el día al que pertenece el check-in; se guarda igual como registro del hecho |

### Cálculo de rachas

No hay tabla ni contador de rachas; se calcula al consultar. Con ~50 personas y ≤7 check-ins por reto, el costo es despreciable y no requiere caché.

- **Personal:** tomar los check-ins de la persona (de **todos** los retos), convertir cada uno a su día de actividad (`starts_on + day_number − 1`), quitar duplicados, ordenar y contar los días consecutivos que terminan hoy o ayer.
- **Del grupo (umbral diario):** para cada día, personas inscritas hasta ese día que lo completaron / personas inscritas hasta ese día; el día «cuenta» si esa fracción alcanza `group_streak_threshold` de `challenges.config`; racha = días consecutivos que cuentan. «Inscrita» = completó al menos un día ([02 §4](02-reto-7-dias.md)). **El valor del umbral está abierto.**
- **Río del grupo (proporcional):** `total_checkins / possible_checkins`, donde `possible_checkins` suma, por cada persona inscrita, los días transcurridos desde el día de su inscripción hasta hoy (o hasta el último día del reto).
- **Abierto:** qué pasa entre retos ([02 §4](02-reto-7-dias.md)).

## 5. Rate limit y tamaños

**Recomendado** (las cifras son un punto de partida para ajustar):

| Qué | Límite sugerido |
|---|---|
| General | Por IP, con bucket en memoria (p. ej. unas decenas de peticiones por minuto) |
| `POST /v1/join` | Muy estricto por IP (p. ej. pocas decenas por hora): es la principal defensa contra registros masivos, al no haber código de invitación. **Ojo:** el sábado de la reunión muchas personas se registrarán a la vez desde el mismo wifi (misma IP); el límite debe dejar pasar a todo el grupo presente |
| Rutas con token | También por usuario, además de por IP (varias personas pueden compartir IP en una reunión por wifi) |
| `/v1/admin/*` | Estricto |
| Cuerpo de petición | Máximo pequeño, p. ej. 4 KB (`http.MaxBytesReader`) |
| `nickname` | **Decidido:** 3 a 7 caracteres, solo `a-z`, `0-9` y `_`. La API recorta espacios y pasa a minúsculas antes de validar, así que `Juan` y `juan` son el mismo nickname |

- Con varias instancias (Cloud Run) un límite en memoria es **por instancia**; limitar `max-instances` lo mantiene útil. Si algún día hiciera falta un límite global, requeriría un almacén compartido; hoy no se justifica.
- Detrás del proxy de Cloud Run/Render, la IP real viene en `X-Forwarded-For`: confiar solo en ese salto.
- Respuesta al exceder: `429` con `Retry-After`.

### Filtro de nicknames vulgares

**Decidido:** la API rechaza nicknames con contenido vulgar u ofensivo (`400 nickname_not_allowed`).

**Recomendado:**

- Una **lista de palabras bloqueadas** en el repo (p. ej. `backend/internal/domain/nickname_blocklist.go`), en español colombiano: groserías, insultos y términos sexuales comunes, más algunas en inglés. La mantiene el equipo y se amplía cuando se cuele algo.
- **Normalizar antes de comparar**, para atrapar variaciones: minúsculas; quitar `_`; cambiar números por letras parecidas (`0→o`, `1→i`, `3→e`, `4→a`, `5→s`, `7→t`); y reducir letras repetidas (`puuuta` → `puta`).
- Rechazar si el nickname normalizado **contiene** alguna palabra de la lista, no solo si es igual. Con 7 caracteres casi no hay falsos positivos, pero hay que probar la lista con nombres comunes antes de lanzar.
- El mensaje al usuario es neutro («Ese nickname no está permitido, prueba con otro»), sin repetir la palabra.
- Ningún filtro es perfecto: lo que se cuele lo quita un líder borrando la cuenta (liberar nicknames está permitido).
- Es lógica pura de dominio: va con tests unitarios (casos bloqueados y nombres comunes que deben pasar).

## 6. Errores

**Recomendado:** un formato único y simple, con código legible por máquina y mensaje en español para mostrar:

```json
{ "error": { "code": "day_closed", "message": "Ese día ya se cerró." } }
```

| HTTP | Cuándo | Ejemplos de `code` |
|---|---|---|
| 400 | Entrada mal formada o inválida | `invalid_body`, `invalid_nickname`, `nickname_not_allowed`, `terms_not_accepted` |
| 401 | Falta token o es inválido | `unauthorized` |
| 403 | Token válido sin permiso (p. ej. administrar) | `forbidden` |
| 404 | No existe | `not_found` |
| 409 | Choca con una regla o estado | `nickname_taken`, `challenge_not_started`, `challenge_closed`, `day_in_future`, `day_closed` |
| 413 | Cuerpo demasiado grande | `body_too_large` |
| 429 | Rate limit | `rate_limited` |
| 500/503 | Error interno / BD no disponible | `internal`, `unavailable` |

No devolver detalles internos (consultas, trazas) al cliente. Los registros del servidor **no** deben incluir tokens.

## 7. CORS

**Decidido:** CORS con **lista de orígenes permitidos** (en variable de entorno), no `*`.

**Recomendado:** como no se usan cookies, no hace falta `Access-Control-Allow-Credentials`; solo permitir la cabecera `Authorization` y los métodos usados.
**Abierto:** si los despliegues *preview* de Vercel (URLs cambiantes) entran en la lista o se prueba contra la API local.

## 8. Endpoints posteriores del reto y de cuentas

Quedan **fuera del primer lanzamiento**. Los endpoints de **peticiones de oración no están aquí**: son otra funcionalidad y se definen solo en [05-peticiones-de-oracion.md](05-peticiones-de-oracion.md).

| Funcionalidad | Método y ruta (propuesta) | Quién | Propósito |
|---|---|---|---|
| Reto: ánimo | `POST /v1/challenges/{slug}/encouragements` | Miembro | Enviar ánimo a otra persona del muro (requiere tabla nueva, no definida) |
| Cuentas (líder) | `DELETE /v1/admin/users/{id}` | Líder (clave admin) | Borrar una cuenta, p. ej. para liberar un nickname. **Mientras no exista, se hace directamente en la base** |
| Panel de líderes | `/v1/admin/...` | Líder | Fuera de alcance mientras no haya panel visual |

## 9. Estructura del proyecto Go (recomendación)

```
backend/
├── cmd/
│   └── api/main.go            # arranque: config, pool de BD, rutas, servidor
├── internal/
│   ├── config/                # lectura de variables de entorno
│   ├── httpapi/               # router, middleware (cors, ratelimit, auth), handlers y errores
│   ├── domain/                # reglas puras: día en Bogotá, día bloqueado, rachas, nickname y filtro; sin I/O
│   ├── store/                 # consultas a Postgres (pgx); implementa las interfaces que pide domain/httpapi
│   └── token/                 # generar y hashear tokens
├── migrations/                # 0001_init.sql, 0002_...sql (versionadas; ver 04)
├── Dockerfile
├── go.mod
└── README.md
```

Criterio: `domain` no importa `store` ni `httpapi`, de modo que lo más delicado (fechas y rachas) se prueba sin base ni red. `internal/` impide que otros paquetes lo importen sin querer.

Cuando se construyan las peticiones de oración, sus handlers, reglas y consultas deberían ir en archivos o paquetes propios (p. ej. `domain/prayer`), separados de los del reto, para que un cambio en una funcionalidad no toque la otra.

### ¿Mismo repo o repo aparte? *(abierto)*

| | Mismo repo (carpeta `backend/`) | Repo aparte |
|---|---|---|
| A favor | Una sola historia y un solo PR para cambios que tocan front y API; las specs y los tipos conviven; menos cosas que mantener | Despliegues y permisos independientes; el repo del front no se llena de archivos de Go |
| En contra | Hay que indicar a Vercel la raíz del front y a Cloud Run/Render la subcarpeta; un solo CI mezcla ambos | Dos repos que mantener coordinados; las specs deben vivir en uno |

Recomendación: **mismo repo**, por tamaño del grupo y del equipo. Un detalle: **no nombrar la carpeta `api/`**, porque Vercel trata esa carpeta como funciones serverless del front. Las migraciones van junto a la API (`backend/migrations/`) porque es la API quien las necesita.

## 10. Fuera de alcance por ahora

- Todo lo de **peticiones de oración** (funcionalidad aparte, [05](05-peticiones-de-oracion.md)).
- Código de recuperación de cuenta (decidido no implementarlo por ahora).
- Completar días pasados (los días se bloquean a medianoche).
- Contrato exhaustivo (OpenAPI). Si el equipo lo prefiere, se genera a partir del código cuando la API se estabilice.
- Websockets, SSE, colas, caché distribuida.
- Roles de líder diferenciados, paneles, auditoría.
- Endpoints de ánimo y de administración de cuentas (§8).
- Paginación (con ~50 personas la lista completa cabe en una respuesta).
