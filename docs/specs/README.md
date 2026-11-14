# Specs de DeepFlow · siguiente etapa

Guía para quien desarrolle la próxima etapa: una nueva página principal, una página para el reto de 7 días de oración y, por primera vez, un backend con base de datos. El alcance es pequeño (hasta ~50 personas, todo en capa gratuita) y debe seguir siéndolo, pero el diseño permite sumar páginas y retos nuevos sin rehacer la base.

## Cómo leer estas specs

Son una **guía flexible, no un contrato**. Cada una explica el porqué de sus decisiones para que puedas apartarte con criterio si encuentras algo mejor. En cada spec verás estos niveles:

| Nivel | Significa |
|---|---|
| **Decidido** | Ya se resolvió, con su razón. Cambiarlo requiere conversarlo |
| **Recomendado** | Es la propuesta, pero se puede cambiar con criterio |
| **Abierto** | Falta decidir; no se rellenó con suposiciones |
| **Delegado** | Lo decide quien tiene a cargo esa tarea |

Cada spec termina con «Fuera de alcance por ahora».

## Índice

| Archivo | Contenido |
|---|---|
| [00-arquitectura.md](00-arquitectura.md) | Visión general, diagrama, **identidad y privacidad** (transversal), operación en capa gratuita y despliegue |
| [01-pagina-principal.md](01-pagina-principal.md) | Nueva página principal: secciones, datos estáticos, cómo agregar temas y actividades |
| [02-reto-7-dias.md](02-reto-7-dias.md) | Reto de 7 días: fechas, reglas, rachas, río, muro, qué vive en el dispositivo |
| [03-api.md](03-api.md) | API en Go: endpoints de identidad y del reto, token, reglas de dominio, errores, estructura del proyecto |
| [04-base-de-datos.md](04-base-de-datos.md) | Postgres: tablas de identidad y del reto, diagrama entidad-relación, restricciones, migraciones, operación |
| [05-peticiones-de-oracion.md](05-peticiones-de-oracion.md) | **Funcionalidad aparte**, posterior al primer lanzamiento. Contiene todo lo suyo: reglas, endpoints y tablas |
| [06-reto-version-local.md](06-reto-version-local.md) | **Primer lanzamiento del reto, sin API**: todo en el dispositivo, reglas y qué pasa en cada escenario |

Orden sugerido: 00 → 01 → 02 → 03 → 04. La 05 se lee solo cuando se vaya a abordar esa funcionalidad.

## Dos funcionalidades distintas: el reto y las peticiones

El **reto de 7 días** y las **peticiones de oración** son funcionalidades **completamente distintas**:

| | Reto de 7 días | Peticiones de oración |
|---|---|---|
| Spec | [02](02-reto-7-dias.md) (y sus endpoints y tablas en [03](03-api.md) y [04](04-base-de-datos.md)) | [05](05-peticiones-de-oracion.md), y solo esa |
| Lanzamiento | **Primer lanzamiento** (sábado 14 de noviembre de 2026) | Posterior, sin fecha |
| Qué guarda el servidor | Solo que el día se completó y si la persona escribió | Texto libre (el cuerpo de la petición) |
| Página | `/hablo-con-dios` | Propia (propuesta `/peticiones`) |

Lo único que comparten es la **identidad** (nickname y token, tabla `users`). No comparten páginas, tablas, endpoints ni lanzamiento, y ninguna depende de la otra. Que el día 6 del reto se llame «Orar por otros» no las conecta.

## Decisiones vigentes

**Identidad y datos**
- Entrada libre: sin grupos, sin código de invitación, sin contraseña. **«Firmar» el compromiso del reto es escribir el nickname**: eso crea la cuenta.
- **Nickname de 3 a 7 caracteres** (`a-z`, `0-9`, `_`), para que no quepa un nombre completo. La API **rechaza nicknames vulgares** con una lista de palabras bloqueadas.
- **El nickname va atado a su token:** un nickname que ya existe se rechaza desde otro dispositivo («no disponible»).
- `users` guarda solo el nickname y el hash del token. Ni nombres ni respuestas: **en el grupo hay menores de edad**.
- Cada persona **acepta el aviso de privacidad al completar su primer día**. El aviso va solo en la página del reto y remite a los líderes del grupo por WhatsApp para borrar la cuenta o resolver dudas.
- **Sin código de recuperación** por ahora, para que entrar tenga la menor fricción posible. Los líderes **pueden liberar nicknames**.

**Reto de 7 días (primera edición)**
- Del **sábado 14 de noviembre** (día 1, en la reunión) al **viernes 20 de noviembre de 2026** (día 7).
- **Cada día solo se completa ese mismo día** (hora de Bogotá); a medianoche se bloquea. Quien llega tarde solo participa en los días restantes.
- **La inscripción en el reto se crea al completar el primer día.** Solo quien completó al menos un día cuenta en el río y en la racha del grupo.
- **Umbral del grupo: 60 %.** Un día cuenta como ganado en equipo si al menos el 60 % de los inscritos lo completó; si no, la racha del grupo vuelve a cero.
- Retos genéricos con `kind` y `config`; `wrote_note` como booleano sin guardar texto; río del grupo proporcional.

**Delegado**
- A quien hace la **página del reto**: qué mostrar con 0 días (idea: un personaje fuera del agua, esperando), cómo se ve qué día es hoy y el contador de quien llega tarde.
- A quien tiene el **despliegue**: Cloud Run o Render.

**Rutas (ya implementadas en la página principal):** `/` página principal, `/quienes-somos`, `/cedula-del-cielo` (pasaporte) y `/hablo-con-dios` (reto de 7 días, versión local: ver [06](06-reto-version-local.md)). El slug del reto en la API y la base es `oracion-7-dias` ([01 §4](01-pagina-principal.md)).

## Dónde está la documentación

El repo no tenía carpeta de documentación: solo `README.md` y `pasaporte-specs.md` en la raíz (formato `RF-xx`). Se creó `docs/specs/`. Cuando se implemente esta etapa habrá que actualizar el `README.md` raíz, que hoy afirma que no hay base de datos ni cuentas.

## Fuente del diseño

El diseño es el PDF «DeepFlow – Inicio y Tema 6.pdf» (4 páginas: 1–2 página principal, 3–4 reto). **Aviso:** al escribir estas specs se leyó el **texto** del PDF, no su render visual. Los textos y la estructura son fiables; colores, tipografías, espaciados y composición exactos hay que tomarlos del PDF directamente.

## Preguntas abiertas

### Para el lanzamiento del sábado 14

Ninguna de estas bloquea crear la base de datos: el esquema de [04 §4](04-base-de-datos.md) sirve para cualquier respuesta.

| # | Pregunta | Dónde |
|---|---|---|
| 1 | La **lista de palabras bloqueadas** para nicknames: alguien tiene que armarla y probarla con nombres comunes | [03 §5](03-api.md) |

### Pueden esperar

| # | Pregunta | Dónde |
|---|---|---|
| 2 | «La racha continúa con los retos siguientes»: ¿cuentan los días entre retos? ¿Y el pasaporte, que es local? | [02 §4](02-reto-7-dias.md) |
| 3 | ¿Una clave de administrador por líder o una compartida? ¿Los retos siguientes se crean con script de siembra o con rutas de administración? | [03](03-api.md) |
| 4 | ¿Los despliegues *preview* de Vercel entran en la lista de CORS? | [03 §7](03-api.md) |
| 5 | ¿Qué herramienta de migraciones? | [04 §5](04-base-de-datos.md) |
| 6 | ¿Dónde se guardan los volcados de respaldo y por cuánto tiempo? | [00 §4](00-arquitectura.md) |
| 7 | Peticiones de oración: ¿las ve todo el grupo o solo los líderes? ¿Anónima para el grupo o anonimato total? ¿Pueden publicar los menores? | [05](05-peticiones-de-oracion.md) |

### Resueltas

- **Fecha de inicio:** sábado 14 de noviembre de 2026; cierra el viernes 20.
- **Menores de edad:** sí hay. Se guarda solo un nickname corto y la participación; cada quien acepta el aviso al completar su primer día.
- **Responsable de los datos:** los líderes del grupo DeepFlow. El aviso, solo en la página del reto, dice que se escriba a un líder por el grupo de WhatsApp, sin dar nombres ni teléfonos.
- **Quien llega tarde:** los días se bloquean a medianoche; solo participa en los días restantes.
- **Umbral del grupo:** 60 %, evaluado cada día.
- **Firma del compromiso:** es escribir el nickname (registrarse).
- **Formato del nickname:** 3 a 7 caracteres, con filtro de vulgaridades.
- **Liberar nicknames:** permitido para los líderes.
- **Nickname que ya existe:** va atado a su token; desde otro dispositivo se rechaza con «Ese nickname no está disponible».
- **Grupos:** una sola comunidad y entrada libre; no hay tabla de grupos ni código de invitación. Si cambia, se agrega de forma aditiva ([04](04-base-de-datos.md)).
- **Página del reto:** visible para cualquiera; avance y muro solo para registrados.
- **Código de recuperación:** no se implementa por ahora.
- **0 días, día actual y contador de quien llega tarde:** delegado a quien hace la página del reto.
- **Rutas y botones de la página principal:** resueltos en la página principal ([01](01-pagina-principal.md)).
- **Cloud Run o Render:** delegado a quien tiene a cargo el despliegue.
