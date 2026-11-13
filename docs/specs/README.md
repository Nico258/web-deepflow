# Specs de DeepFlow · siguiente etapa

Guía para quien desarrolle la próxima etapa: una nueva página principal, una página para el reto de 7 días de oración y, por primera vez, un backend con base de datos. El alcance es pequeño (hasta ~50 personas, todo en capa gratuita) y debe seguir siéndolo, pero el diseño permite sumar páginas y retos nuevos sin rehacer la base.

## Cómo leer estas specs

Son una **guía flexible, no un contrato**. Cada una explica el porqué de sus decisiones para que puedas apartarte con criterio si encuentras algo mejor. En cada spec verás tres niveles:

| Nivel | Significa |
|---|---|
| **Decidido** | Ya se resolvió, con su razón. Cambiarlo requiere conversarlo |
| **Recomendado** | Es la propuesta, pero se puede cambiar con criterio |
| **Abierto** | Falta decidir; no se rellenó con suposiciones |

Cada spec termina con «Fuera de alcance por ahora».

## Índice

| Archivo | Contenido |
|---|---|
| [00-arquitectura.md](00-arquitectura.md) | Visión general, diagrama, **identidad y privacidad** (transversal), operación en capa gratuita y despliegue |
| [01-pagina-principal.md](01-pagina-principal.md) | Nueva página principal: secciones, datos estáticos, cómo agregar temas y actividades |
| [02-reto-7-dias.md](02-reto-7-dias.md) | Reto de 7 días: reglas, rachas, río, muro, qué vive en el dispositivo |
| [03-api.md](03-api.md) | API en Go: endpoints, token, reglas de dominio, errores, estructura del proyecto |
| [04-base-de-datos.md](04-base-de-datos.md) | Postgres: tablas, diagrama entidad-relación, restricciones, migraciones, operación |
| [05-peticiones-de-oracion.md](05-peticiones-de-oracion.md) | **Funcionalidad aparte** del reto, posterior al primer lanzamiento |

Orden sugerido: 00 → 01 → 02 → 03 → 04. La 05 se lee cuando se vaya a abordar esa funcionalidad.

### Una distinción importante

El **reto de 7 días** y las **peticiones de oración** son funcionalidades diferentes, con alcances diferentes. Comparten solo la identidad (nickname, token, grupo). Por eso las peticiones tienen su propia spec (05), y el primer lanzamiento contiene el reto pero no las peticiones.

### Dónde está la documentación

El repo no tenía carpeta de documentación: solo `README.md` y `pasaporte-specs.md` en la raíz (formato `RF-xx`). Se creó `docs/specs/`. Cuando se implemente esta etapa habrá que actualizar el `README.md` raíz, que hoy afirma que no hay base de datos ni cuentas.

## Fuente del diseño

El diseño es el PDF «DeepFlow – Inicio y Tema 6.pdf» (4 páginas: 1–2 página principal, 3–4 reto). **Aviso:** al escribir estas specs se leyó el **texto** del PDF, no su render visual. Los textos y la estructura son fiables; colores, tipografías, espaciados y composición exactos hay que tomarlos del PDF directamente.

## Preguntas abiertas

Pendientes, sin respuesta asumida.

1. ¿El reto arranca el día de la reunión para todos, o ya hay gente haciéndolo por su cuenta?
2. ¿Cuántas personas tiene el grupo? Define el umbral de la racha del grupo.
3. ¿Hay menores de edad en el grupo?
4. ¿Las peticiones de oración las ve todo el grupo o solo los líderes?
5. ¿Anónima para el grupo o anonimato total?
6. ¿Va a haber más de un grupo de conexión usando la app?
7. ¿Cloud Run o Render para la API?

### Preguntas surgidas al explorar el repo y el diseño

Estas no estaban en la lista original; salieron al encajar las specs con lo que existe.

| # | Pregunta | Dónde |
|---|---|---|
| 8 | ¿Dónde pasa a vivir el pasaporte (hoy ocupa `/`)? Propuesta: `/cedula-del-cielo` | [01](01-pagina-principal.md) |
| 9 | ¿A dónde llevan «Quiero unirme», «Guía del tema» y «Abrir tema»? El PDF no incluye la página del tema | [01](01-pagina-principal.md) |
| 10 | Quien llega tarde al reto: ¿qué pasa con los días anteriores a su llegada? | [02](02-reto-7-dias.md) |
| 11 | ¿Qué nivel del río se muestra con 0 días completados? | [02](02-reto-7-dias.md) |
| 12 | «La racha continúa con los retos siguientes»: ¿cuentan los días entre retos? ¿Y el pasaporte, que es local? | [02](02-reto-7-dias.md) |
| 13 | ¿Cómo se hace la firma del compromiso (dibujada, escrita)? | [02](02-reto-7-dias.md) |
| 14 | ¿La página del reto se ve sin código, en modo solo lectura? | [02](02-reto-7-dias.md) |
| 15 | ¿Quién crea grupos, retos y códigos (script de siembra o rutas de administración)? ¿Una clave de administrador por líder o una compartida? | [03](03-api.md) |
| 16 | ¿Los despliegues *preview* de Vercel entran en la lista de CORS? | [03](03-api.md) |
| 17 | ¿Qué claves lleva `challenges.config`? ¿Qué herramienta de migraciones? | [04](04-base-de-datos.md) |
| 18 | ¿Dónde se guardan los volcados de respaldo y por cuánto tiempo? | [00](00-arquitectura.md) |
| 19 | ¿Quién es el responsable del tratamiento de datos (para el aviso y los borrados)? | [00](00-arquitectura.md) |
| 20 | ¿Qué pasa si alguien pierde el celular antes de que exista el código de recuperación? | [00](00-arquitectura.md) |
