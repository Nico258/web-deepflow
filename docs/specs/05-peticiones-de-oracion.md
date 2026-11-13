# 05 · Peticiones de oración

> **Esta es una funcionalidad aparte del reto de 7 días**, con su propio alcance, su propia página y su propio lanzamiento. No forma parte de [02-reto-7-dias.md](02-reto-7-dias.md) ni depende de él (ni él de esta). Si en el futuro se quisiera enlazar desde el día 6 del reto («Orar por otros»), sería una decisión nueva que tomar en su momento; no está contemplada aquí ni allí.

Identidad y privacidad: [00-arquitectura.md §3](00-arquitectura.md). Tablas: [04-base-de-datos.md §5](04-base-de-datos.md). Rutas: [03-api.md §8](03-api.md).

## 1. Por qué es una funcionalidad separada

Las peticiones son lo que tiene más riesgo de todo el proyecto: moderación, anonimato y contenido delicado (salud, familia, crisis). El reto, en cambio, solo guarda «el día se completó». Mezclarlos haría que un problema de moderación frenara el reto. Por eso:

- Comparten solo la **identidad** (nickname, token, grupo).
- Se lanzan por separado, y **después** del reto.
- No comparten tablas con el reto (solo `groups` y `users`).

**Decidido:** las peticiones quedan fuera del primer lanzamiento. *Razón:* el riesgo descrito.

## 2. Qué es (el comportamiento propuesto)

Personas del grupo publican peticiones de oración; otras indican «estoy orando» (un contador, sin comentarios). El estado y la moderación los gestionan los líderes.

Lo **ya definido** viene del planteamiento de la funcionalidad; lo demás es una propuesta que puede cambiar.

### Recomendado

| Tema | Propuesta | Razón |
|---|---|---|
| Interacción | Un contador de «estoy orando», **sin comentarios** | Menos moderación y menos riesgo de consejos o juicios fuera de lugar |
| Límites | Límite de caracteres por petición y de publicaciones por día | Frena abuso y mantiene las peticiones legibles |
| Moderación | Los líderes pueden ocultar o borrar | Contenido delicado |
| Casos delicados | Definir **quién revisa** las peticiones sensibles | Hay peticiones que requieren trato pastoral, no solo moderación |
| Autoría | Guardar el autor internamente aunque la petición sea anónima | Permite que la persona borre la suya y manejar abusos |
| Anonimato | **Anónima = anónima para el grupo**, y así se dice en pantalla | No prometer un anonimato que la base no ofrece |

### Abierto

| Pregunta | Nota |
|---|---|
| ¿La ven todos o solo los líderes? (pregunta 4 del README) | Cambia el endpoint de lectura y la propuesta de moderación |
| ¿Anónima para el grupo o anonimato total? (pregunta 5) | Con anonimato total no hay autor en la base: nadie puede borrar su petición ni se puede identificar abuso |
| Valores de `status` y flujo de moderación | |
| Si hay menores, ¿quedan excluidos de publicar? (pregunta 3) | |
| ¿Se permite ver peticiones antiguas o solo las activas? ¿Cuánto duran? | |
| ¿Hay un tope de «estoy orando» por persona/petición, y se puede retirar? | Se propone un solo apoyo por persona y petición (clave `request_id + user_id`) |
| Idea para más adelante: peticiones respondidas que se vuelven testimonio | No definida |

## 3. API prevista

Detalle del método y quién llama en [03 §8](03-api.md). Resumen:

| Ruta | Quién | Propósito |
|---|---|---|
| `GET /v1/prayer-requests` | Miembro (o solo líder, según pregunta 4) | Listar peticiones visibles; incluye contador de «estoy orando» |
| `POST /v1/prayer-requests` | Miembro | Publicar `{ body, is_anonymous }` |
| `DELETE /v1/prayer-requests/{id}` | Su autor | Borrar la propia |
| `PUT/DELETE /v1/prayer-requests/{id}/support` | Miembro | Agregar o retirar «estoy orando» |
| `GET/PATCH /v1/admin/prayer-requests…` | Líder (clave admin) | Revisar, ocultar |

Reglas de dominio propuestas: máximo de caracteres por petición (valor a definir), máximo de peticiones por persona y por día, rate limit propio, y que una petición anónima **nunca** devuelva el autor al grupo.

## 4. Datos y privacidad

- Tablas `prayer_requests` y `prayer_supports` ([04 §5](04-base-de-datos.md)). **A diferencia del reto, aquí el servidor sí guarda texto libre** (el cuerpo de la petición). Eso cambia el aviso de privacidad y exige más cuidado: las peticiones pueden revelar salud, familia, convicciones (dato sensible, Ley 1581 de 2012).
- Al borrar la cuenta, sus peticiones se borran (recomendado), salvo que se decida anonimato total, caso en que no hay a quién enlazarlas.
- Las peticiones no se exponen en el volcado público de la base ni en registros del servidor.

## 5. Dónde vive en el front

**Abierto:** ruta (propuesta `/peticiones`) y si lleva enlace en la navegación de la página principal. No se diseña en el PDF actual, por lo que esta spec no describe pantallas.

## 6. Fuera de alcance por ahora

- **Toda la funcionalidad**: no entra en el primer lanzamiento.
- Comentarios o respuestas a las peticiones.
- Notificaciones («alguien oró por ti»).
- Peticiones privadas entre dos personas o mensajería.
- Panel de líderes visual.
- Conexión con el reto de 7 días.
