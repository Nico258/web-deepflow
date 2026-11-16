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

Orden sugerido: 00 → 01 → 02 → 03 → 04. La 05 se lee solo cuando se vaya a abordar esa funcionalidad.

## Dos funcionalidades distintas: el reto y las peticiones

El **reto de 7 días** y las **peticiones de oración** son funcionalidades **completamente distintas**:

| | Reto de 7 días | Peticiones de oración |
|---|---|---|
| Spec | [02](02-reto-7-dias.md) (y sus endpoints y tablas en [03](03-api.md) y [04](04-base-de-datos.md)) | [05](05-peticiones-de-oracion.md), y solo esa |
| Lanzamiento | **Primer lanzamiento** (sábado 14 de noviembre de 2026) | Posterior, sin fecha |
| Qué guarda el servidor | Solo que el día se completó y si la persona escribió | Texto libre (el cuerpo de la petición) |
| Página | `/reto-7-dias` (propuesta) | Propia (propuesta `/peticiones`) |

Lo único que comparten es la **identidad** (nickname y token, tabla `users`). No comparten páginas, tablas, endpoints ni lanzamiento, y ninguna depende de la otra. Que el día 6 del reto se llame «Orar por otros» no las conecta.

## Decisiones vigentes

**Identidad y datos**
- Entrada libre: sin grupos, sin código de invitación, sin contraseña. Para unirse basta elegir un **nickname**.
- `users` guarda solo el nickname y el hash del token. Ni nombres ni respuestas: **en el grupo hay menores de edad**.
- **Sin código de recuperación** por ahora, para que entrar tenga la menor fricción posible. Quien pierde el celular pierde la cuenta; un líder puede liberar su nickname.

**Reto de 7 días (primera edición)**
- Del **sábado 14 de noviembre** (día 1, en la reunión) al **viernes 20 de noviembre de 2026** (día 7).
- **Cada día solo se completa ese mismo día** (hora de Bogotá); a medianoche se bloquea. Quien llega tarde solo participa en los días restantes.
- **La inscripción en el reto se crea al completar el primer día.** Solo quien completó al menos un día cuenta en el río y en la racha del grupo.
- Retos genéricos con `kind` y `config`; `wrote_note` como booleano sin guardar texto; río del grupo proporcional y racha del grupo por umbral diario.

**Despliegue:** la elección entre Cloud Run y Render queda delegada a quien tiene a cargo el despliegue.

## Dónde está la documentación

El repo no tenía carpeta de documentación: solo `README.md` y `pasaporte-specs.md` en la raíz (formato `RF-xx`). Se creó `docs/specs/`. Cuando se implemente esta etapa habrá que actualizar el `README.md` raíz, que hoy afirma que no hay base de datos ni cuentas.

## Fuente del diseño

El diseño es el PDF «DeepFlow – Inicio y Tema 6.pdf» (4 páginas: 1–2 página principal, 3–4 reto). **Aviso:** al escribir estas specs se leyó el **texto** del PDF, no su render visual. Los textos y la estructura son fiables; colores, tipografías, espaciados y composición exactos hay que tomarlos del PDF directamente.

## Preguntas abiertas

### Para el lanzamiento del sábado 14

| # | Pregunta | Dónde |
|---|---|---|
| 1 | **Valor del umbral** de la racha del grupo (`group_streak_threshold`, p. ej. 0.8 = 80 % de los inscritos) | [02 §4](02-reto-7-dias.md) |
| 2 | **Firma del compromiso:** el bloque «Mi compromiso» del diseño tiene un espacio «Mi firma». ¿Se dibuja con el dedo, se escribe el nickname, o basta un botón «Me comprometo»? Se guarda solo en el celular | [02 §7](02-reto-7-dias.md) |
| 3 | ¿Qué nivel del río se muestra con **0 días completados**? | [02 §5](02-reto-7-dias.md) |
| 4 | **Contador de quien llega tarde:** ¿«N de 7» o «N de los días desde que llegaste»? | [02 §3](02-reto-7-dias.md) |
| 5 | **Menores de edad:** ¿basta el aviso de privacidad o hace falta autorización de sus padres? ¿Quién es el **responsable del tratamiento** que aparece en el aviso? | [00 §3](00-arquitectura.md) |
| 6 | ¿Los líderes aceptan liberar nicknames de quien perdió su celular? | [00 §3](00-arquitectura.md) |
| 7 | **Rutas:** ¿dónde pasa a vivir el pasaporte (propuesta `/cedula-del-cielo`) y cuál es el slug del reto (`reto-7-dias` en la ruta, `oracion-7-dias` en la base: unificar)? | [01 §4](01-pagina-principal.md) |
| 8 | ¿A dónde llevan «Quiero unirme», «Guía del tema» y «Abrir tema»? El PDF no incluye la página del tema | [01 §5](01-pagina-principal.md) |
| 9 | Formato exacto del nickname (propuesta: 3 a 20 caracteres, minúsculas, números y guion bajo) | [03 §5](03-api.md) |

### Pueden esperar

| # | Pregunta | Dónde |
|---|---|---|
| 10 | «La racha continúa con los retos siguientes»: ¿cuentan los días entre retos? ¿Y el pasaporte, que es local? | [02 §4](02-reto-7-dias.md) |
| 11 | ¿Una clave de administrador por líder o una compartida? ¿Los retos siguientes se crean con script de siembra o con rutas de administración? | [03](03-api.md) |
| 12 | ¿Los despliegues *preview* de Vercel entran en la lista de CORS? | [03 §7](03-api.md) |
| 13 | ¿Qué herramienta de migraciones? | [04 §5](04-base-de-datos.md) |
| 14 | ¿Dónde se guardan los volcados de respaldo y por cuánto tiempo? | [00 §4](00-arquitectura.md) |
| 15 | Peticiones de oración: ¿las ve todo el grupo o solo los líderes? ¿Anónima para el grupo o anonimato total? ¿Pueden publicar los menores? | [05](05-peticiones-de-oracion.md) |

### Resueltas

- **Fecha de inicio:** sábado 14 de noviembre de 2026; cierra el viernes 20.
- **Menores de edad:** sí hay. Por eso no se guardan nombres ni respuestas, solo la participación.
- **Quien llega tarde:** los días se bloquean a medianoche; solo participa en los días restantes.
- **Grupos:** una sola comunidad y entrada libre; no hay tabla de grupos ni código de invitación. Si cambia, se agrega de forma aditiva ([04](04-base-de-datos.md)).
- **Página del reto:** visible para cualquiera; avance y muro solo para registrados.
- **Código de recuperación:** no se implementa por ahora.
- **Cloud Run o Render:** delegado a quien tiene a cargo el despliegue.
