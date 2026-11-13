# 03 · API (Go)

Arquitectura, identidad y operación: [00-arquitectura.md](00-arquitectura.md). Reglas del reto: [02-reto-7-dias.md](02-reto-7-dias.md). Tablas: [04-base-de-datos.md](04-base-de-datos.md).

Esto es una guía de forma, no un contrato exhaustivo: nombres de campos y códigos pueden ajustarse al implementar, siempre que front y API queden de acuerdo.

## 1. Principios

**Decidido**

- Único acceso a la base de datos. Versionada bajo `/v1`, JSON sobre HTTPS.
- Tres capas: **middleware** (CORS con lista de orígenes, rate limit, validación del token), **handlers REST** (retos, check-ins, peticiones) y **lógica de dominio** (rachas, cálculo del día).
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

*Por qué SHA-256 y no bcrypt:* el token es aleatorio y de alta entropía, no una contraseña elegida por una persona; un hash rápido es suficiente y permite buscar por igualdad. Lo mismo no vale para el código de invitación (ver abajo).

### Código de invitación

- Se envía solo en `POST /v1/groups/join`. Es corto y legible (se comparte por WhatsApp), por lo tanto de baja entropía.
- **Recomendado:** guardarlo como HMAC-SHA256 con un secreto del servidor (variable de entorno) en `groups.invite_code_hash`. Permite buscar el grupo por igualdad y, sin el secreto, un volcado de la base no deja adivinar los códigos. La defensa contra adivinar es el **rate limit estricto** de ese endpoint (§5).
- Comparación en tiempo constante. Respuesta de error **idéntica** si el código no existe, para no revelar nada.
- **Abierto:** rotación del código (invalida el anterior) y expiración.

### Líderes (clave de administrador)

- Una clave larga en variable de entorno, enviada como `Authorization: Bearer <clave>` solo a rutas `/v1/admin/*`. Comparación en tiempo constante.
- Mientras no exista panel de líderes, se usa con `curl` o una herramienta; la clave nunca va al front.
- **Recomendado:** rate limit más estricto aún en `/admin`, y poder rotar la clave sin tocar la base.
- **Abierto:** si habrá una clave por líder (para saber quién hizo qué) o una sola compartida. Para ~50 personas una sola basta, pero no distingue quién moderó.

## 3. Endpoints del primer lanzamiento

«Cualquiera» = sin token. «Miembro» = token válido de una persona del grupo. Las rutas con `{slug}` usan el identificador del reto (p. ej. `oracion-7-dias`).

| Método y ruta | Quién | Propósito | Petición → respuesta (forma general) |
|---|---|---|---|
| `GET /v1/health` | Cualquiera | Salud; **consulta la BD** para mantenerla despierta ([00 §4](00-arquitectura.md)) | → `{ "status": "ok" }`; `503` si la BD no responde. No devuelve datos internos |
| `POST /v1/groups/join` | Cualquiera (rate limit estricto) | Registrarse con código de invitación | `{ invite_code, display_name, nickname }` → `201 { token, user }`. Errores: código inválido, nickname ya usado, formato inválido |
| `GET /v1/me` | Miembro | Perfil propio | → `{ id, display_name, nickname, show_on_wall }` |
| `PATCH /v1/me` | Miembro | Cambiar si aparece en el muro (y, si se decide, el nombre) | `{ show_on_wall }` → perfil |
| `DELETE /v1/me` | Miembro | Borrar la cuenta y todos sus datos en cascada | → `204` |
| `GET /v1/challenges/{slug}` | Miembro | Datos del reto y **qué día es hoy** | → `{ slug, starts_on, total_days, today, day_number, status, enrolled }` donde `today` es la fecha de Bogotá y `status` ∈ aún no empieza / en curso / terminado |
| `POST /v1/challenges/{slug}/enrollment` | Miembro | Inscribirse al reto (una por persona y reto) | → `201` o `200` si ya estaba inscrito |
| `GET /v1/challenges/{slug}/me` | Miembro inscrito | Mi estado: días completados, si escribí cada día, racha personal | → `{ checkins: [{ day_number, wrote_note }], completed_count, written_count, streak }` |
| `PUT /v1/challenges/{slug}/checkins/{day}` | Miembro inscrito | Marcar un día como completado (idempotente; permite actualizar `wrote_note`) | `{ wrote_note }` → `201` primera vez, `200` si ya existía; devuelve el check-in |
| `GET /v1/challenges/{slug}/wall` | Miembro | Muro del grupo | → `{ members: [{ nickname, completed_count, streak, last_activity_at }] }`; query `?order=recent\|alpha`. Solo quienes tienen `show_on_wall` |
| `GET /v1/challenges/{slug}/river` | Miembro | Río del grupo y racha del grupo | → `{ total_checkins, possible_checkins, group_streak }` |

Notas de diseño:

- **El muro y el río** podrían ser una sola respuesta para ahorrar una petición del polling cada 30–60 s. Dos endpoints son más claros; uno solo es más barato. A esta escala da igual: es una decisión de implementación.
- **Nunca** aparece contenido en ninguna respuesta (no existe en el servidor) ni `user_id` en el muro.
- La API **no devuelve nombres de nivel**: devuelve conteos y el front los traduce ([02 §5](02-reto-7-dias.md)).
- `PUT` (y no `POST`) para el check-in porque es idempotente: pulsar dos veces o reintentar tras un corte de red no duplica ni falla.
- **Abierto:** cómo se crean grupos y retos. Para el primer lanzamiento basta una migración o un script de siembra (`INSERT` + hash del código) ejecutado por quien administra; no hace falta endpoint. Si se prefiere crearlos por API, serían rutas `/v1/admin/*`.

## 4. Reglas de dominio

Se implementan en la capa de dominio y se validan en el servidor **siempre**, aunque el front ya las oculte.

| Regla | Cómo |
|---|---|
| **Un check-in por persona, reto y día** | Restricción única en la base (`enrollment_id, day_number`). El `PUT` hace *upsert*: no hay error por repetir |
| **Hoy en Bogotá** | `today = fecha actual en America/Bogota`; `day_number = (today − starts_on) + 1`. Con `time/tzdata` incrustado |
| **No días futuros** | Rechazar si `day > day_number` |
| **Ventana de un día** | Permitir solo `day == day_number` o `day == day_number − 1`; además `1 ≤ day ≤ total_days` |
| **Reto aún no iniciado / ya terminado** | Aún no: `409` (`challenge_not_started`). Terminado: la ventana sigue valiendo un día más tras el último; luego `409` (`challenge_closed`) |
| **Inscripción previa** | Sin inscripción no se aceptan check-ins |
| **Racha derivada** | Ver abajo |
| **`completed_on`** | Se guarda la fecha real de Bogotá en que se registró (distinta del día al que pertenece si fue un día tardío) |

### Cálculo de rachas

No hay tabla ni contador de rachas; se calcula al consultar. Con ~50 personas y ≤7 check-ins por reto, el costo es despreciable y no requiere caché.

- **Personal (recomendado):** tomar los check-ins de la persona (de **todos** los retos), convertir cada uno al «día de actividad» (`starts_on + day_number − 1`), quitar duplicados, ordenar, y contar los días consecutivos que terminan hoy o ayer. El fundamento de contar por día de actividad y no por `completed_on` está en [02 §4](02-reto-7-dias.md).
- **Del grupo:** para cada día, personas inscritas que lo completaron / personas inscritas ese día; el día «cuenta» si cumple el umbral; racha = días consecutivos que cuentan. **El umbral está abierto** (pregunta 2 del README) y es, de momento, un valor de configuración por reto (`challenges.config`).
- **Abierto:** qué pasa entre retos ([02 §4](02-reto-7-dias.md)).

## 5. Rate limit y tamaños

**Recomendado** (las cifras son un punto de partida para ajustar):

| Qué | Límite sugerido |
|---|---|
| General | Por IP, con bucket en memoria (p. ej. unas decenas de peticiones por minuto) |
| `POST /v1/groups/join` | Muy estricto por IP (p. ej. pocas decenas por hora) para frenar adivinar el código |
| Rutas con token | También por usuario, además de por IP (varias personas pueden compartir IP en una reunión por wifi) |
| `/v1/admin/*` | Estricto |
| Cuerpo de petición | Máximo pequeño, p. ej. 4 KB (`http.MaxBytesReader`) |
| `display_name` | 1 a 40 caracteres; sin saltos de línea |
| `nickname` | 3 a 20 caracteres; minúsculas, números y guion bajo (el formato exacto está **abierto**); único por grupo sin distinguir mayúsculas |
| Texto libre | En lo posterior (peticiones): ver [05](05-peticiones-de-oracion.md) |

- Con varias instancias (Cloud Run) un límite en memoria es **por instancia**; limitar `max-instances` lo mantiene útil. Si algún día hiciera falta un límite global, requeriría un almacén compartido; hoy no se justifica.
- Detrás del proxy de Cloud Run/Render, la IP real viene en `X-Forwarded-For`: confiar solo en ese salto.
- Respuesta al exceder: `429` con `Retry-After`.

## 6. Errores

**Recomendado:** un formato único y simple, con código legible por máquina y mensaje en español para mostrar:

```json
{ "error": { "code": "day_in_future", "message": "Ese día todavía no se abre." } }
```

| HTTP | Cuándo | Ejemplos de `code` |
|---|---|---|
| 400 | Entrada mal formada o inválida | `invalid_body`, `invalid_nickname` |
| 401 | Falta token o es inválido | `unauthorized` |
| 403 | Token válido sin permiso (p. ej. administrar) | `forbidden` |
| 404 | No existe | `not_found` |
| 409 | Choca con una regla o estado | `nickname_taken`, `challenge_not_started`, `day_in_future`, `day_out_of_window`, `not_enrolled` |
| 413 | Cuerpo demasiado grande | `body_too_large` |
| 429 | Rate limit | `rate_limited` |
| 500/503 | Error interno / BD no disponible | `internal`, `unavailable` |

No devolver detalles internos (consultas, trazas) al cliente. Los registros del servidor **no** deben incluir tokens ni códigos de invitación.

## 7. CORS

**Decidido:** CORS con **lista de orígenes permitidos** (en variable de entorno), no `*`.

**Recomendado:** como no se usan cookies, no hace falta `Access-Control-Allow-Credentials`; solo permitir la cabecera `Authorization` y los métodos usados.
**Abierto:** si los despliegues *preview* de Vercel (URLs cambiantes) entran en la lista o se prueba contra la API local.

## 8. Endpoints posteriores

Todos quedan **fuera del primer lanzamiento**. Los de peticiones de oración pertenecen a otra funcionalidad y se detallan en [05-peticiones-de-oracion.md](05-peticiones-de-oracion.md); aquí solo se listan para que la API los tenga previstos.

| Funcionalidad | Método y ruta (propuesta) | Quién | Propósito |
|---|---|---|---|
| Reto: ánimo | `POST /v1/challenges/{slug}/encouragements` | Miembro | Enviar ánimo a otra persona del muro (requiere tabla nueva, no definida) |
| Cuenta | `POST /v1/me/recovery` · `POST /v1/recover` | Miembro / cualquiera | Código de recuperación: mostrarlo una vez; usarlo en otro dispositivo para emitir un token nuevo |
| Peticiones | `GET/POST /v1/prayer-requests`, `DELETE /v1/prayer-requests/{id}` | Miembro | Ver ([05](05-peticiones-de-oracion.md)) |
| Peticiones | `PUT/DELETE /v1/prayer-requests/{id}/support` | Miembro | «Estoy orando» (contador) |
| Moderación | `GET /v1/admin/prayer-requests`, `PATCH /v1/admin/prayer-requests/{id}`, `DELETE /v1/admin/users/{id}` | Líder (clave admin) | Revisar, ocultar, borrar; borrar cuentas |
| Panel de líderes | `/v1/admin/...` | Líder | Fuera de alcance mientras no haya panel visual |

## 9. Estructura del proyecto Go (recomendación)

```
backend/
├── cmd/
│   └── api/main.go            # arranque: config, pool de BD, rutas, servidor
├── internal/
│   ├── config/                # lectura de variables de entorno
│   ├── httpapi/               # router, middleware (cors, ratelimit, auth), handlers y errores
│   ├── domain/                # reglas puras: día en Bogotá, ventana, rachas, niveles; sin I/O
│   ├── store/                 # consultas a Postgres (pgx); implementa las interfaces que pide domain/httpapi
│   └── token/                 # generar y hashear tokens y códigos
├── migrations/                # 0001_init.sql, 0002_...sql (versionadas; ver 04)
├── Dockerfile
├── go.mod
└── README.md
```

Criterio: `domain` no importa `store` ni `httpapi`, de modo que lo más delicado (fechas y rachas) se prueba sin base ni red. `internal/` impide que otros paquetes lo importen sin querer.

### ¿Mismo repo o repo aparte? *(abierto)*

| | Mismo repo (carpeta `backend/`) | Repo aparte |
|---|---|---|
| A favor | Una sola historia y un solo PR para cambios que tocan front y API; las specs y los tipos conviven; menos cosas que mantener | Despliegues y permisos independientes; el repo del front no se llena de archivos de Go |
| En contra | Hay que indicar a Vercel la raíz del front y a Cloud Run/Render la subcarpeta; un solo CI mezcla ambos | Dos repos que mantener coordinados; las specs deben vivir en uno |

Recomendación: **mismo repo**, por tamaño del grupo y del equipo. Un detalle: **no nombrar la carpeta `api/`**, porque Vercel trata esa carpeta como funciones serverless del front. Las migraciones van junto a la API (`backend/migrations/`) porque es la API quien las necesita.

## 10. Fuera de alcance por ahora

- Contrato exhaustivo (OpenAPI). Si el equipo lo prefiere, se genera a partir del código cuando la API se estabilice.
- Websockets, SSE, colas, caché distribuida.
- Roles de líder diferenciados, paneles, auditoría.
- Endpoints de peticiones, ánimo, recuperación y moderación (§8).
- Paginación (con ~50 personas la lista completa cabe en una respuesta).
