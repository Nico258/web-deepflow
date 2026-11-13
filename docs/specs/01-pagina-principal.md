# 01 · Página principal

Fuente de verdad visual y de textos: páginas 1 y 2 del PDF de diseño («DeepFlow – Inicio y Tema 6.pdf»). Esta spec describe estructura, contenido y comportamiento; **no** colores ni medidas, porque al preparar la spec solo se pudo leer el texto del PDF, no ver su render (ver nota en el README).

Identidad transversal y privacidad: [00-arquitectura.md §3](00-arquitectura.md). Esta página **no necesita la API**: es contenido estático.

## 1. Qué es y por qué es estática

La página principal presenta el grupo, el tema actual y las actividades. Todo su contenido (temas, textos, reuniones) **vive en el front**, en archivos de datos.

**Decidido:** el contenido es estático y está en el front. *Razón:* son ~50 personas y el contenido cambia una vez por tema; una base de datos o un CMS no se justifican. Además la página principal sigue funcionando aunque la API esté caída o dormida.

## 2. Secciones (según el PDF)

| # | Sección | Contenido | Notas |
|---|---|---|---|
| 1 | Navegación | Marca DeepFlow; enlaces **Quiénes somos, Contenido, Actividades, Reuniones**; etiqueta «Ezequiel 47:1-12» | Anclas dentro de la misma página (`#quienes-somos`, `#contenido`, `#actividades`, `#reuniones`) |
| 2 | Portada | Etiqueta «Grupo de conexión · Tengo un propósito y nadie me separa de Dios»; titular «Conecta con Dios y con otros, cada vez más profundo»; párrafo breve; botones **Ver el contenido** y **Quiero unirme** | |
| 3 | Tema actual | «Tema actual · Serie Conexión»: **Tema 6. Hablo con Dios cada día** y su descripción (desmontar mitos de la oración y llevar a un diálogo personal con Dios); botones **Guía del tema**, **Actividad: reto de 7 días**, **Abrir tema** | «Actividad…» lleva a la página del reto ([02](02-reto-7-dias.md)) |
| 4 | Quiénes somos | «Un grupo que avanza junto hacia lo profundo»; explicación del río de Ezequiel; los **cuatro niveles**: 1 Hasta los tobillos, 2 Hasta las rodillas, 3 Hasta la cintura, 4 Un río para nadar | Los mismos cuatro niveles sirven de medidor en el reto |
| 5 | Contenido | «Lo que estudiamos en cada tema»; cuatro bloques de lo que reúne cada tema (**Objetivo**, **Preguntas para la microcélula**, **Ministración**, **Fuentes de consulta**); tarjetas de temas | Tema 6 disponible («Abrir»); Temas 1–5 con título pendiente y «Próximamente» |
| 6 | Actividades para casa | «Para vivir cada tema entre reuniones». Tarjetas: **Reto de 7 días: hablo con Dios** (Tema 6, «Empezar el reto»), **Cédula del Cielo** (pasaporte, «Abrir pasaporte»; el diseño la rotula «Otro tema») y una tarjeta «Próximamente: más actividades para tu semana» | Cada tema nuevo puede traer su reto o dinámica |
| 7 | Reuniones | «Ven a conectar con nosotros»; botón **Quiero unirme**; tres datos: **Día y hora**, **Lugar**, **Contacto** | En el diseño son marcadores por definir |
| 8 | Pie de página | Marca, lema, «© 2026 DeepFlow» | |

## 3. Cómo se agregan temas y actividades sin rediseñar

El truco es que **la página se dibuja a partir de datos**, no de HTML repetido.

### Recomendado

Siguiendo el patrón actual de `src/data/` (`stamps.ts`, `themes.ts`), crear:

| Archivo | Qué contiene |
|---|---|
| `src/data/topics.ts` | Lista de temas: número, título, descripción corta, estado (`available` / `soon`), ruta si está disponible y, cuando exista, objetivo / preguntas / ministración / fuentes |
| `src/data/activities.ts` | Lista de actividades: título, tema al que acompañan, texto del botón, ruta y estado |
| `src/data/meetings.ts` | Día y hora, lugar, contacto |

Las tarjetas de «Contenido» y de «Actividades» son un `map` sobre esos arrays. Para publicar el Tema 7 se agrega un objeto; para sumar un reto, otro. La tarjeta «Próximamente» de actividades puede ser siempre la última; es una decisión de diseño menor.

Componentes sugeridos (carpeta `src/components/`, como el resto): `site-header`, `site-footer`, `topic-card`, `activity-card`. El encabezado y el pie se reutilizan en la página del reto, que en el PDF repite la barra superior (con «Volver al inicio»).

Reutilizable de lo que ya existe: el logo (`public/deepflowlogo.png`, clase `.brand-mark`), las fuentes del layout, los botones `.primary-btn` / `.secondary-btn` y la paleta base (`--navy`, `--sky`, `--gold`). El patrón de `.topbar` + `.main-wrap` (ancho máx. 1180 px) coincide con una barra superior de este tipo. No hay hoy componentes de tarjeta ni de navegación entre rutas.

### Cómo se maneja el contenido pendiente

Los textos entre corchetes del diseño (`[Título del tema]`, `[Día y hora de la reunión]`, `[Lugar o enlace]`, `[WhatsApp o líder de contacto]`) son marcadores, no texto final. **Recomendado:** que el dato vacío en `topics.ts` / `meetings.ts` deje la tarjeta o el campo en estado «por definir» en lugar de publicar corchetes literales.

## 4. Rutas

**Decidido:** hay una nueva página principal y el pasaporte debe seguir existiendo (tiene su tarjeta en la sección 6).

**Recomendado** (hoy el pasaporte ocupa `/`):

| Ruta | Página |
|---|---|
| `/` | Página principal (nueva) |
| `/reto-7-dias` | Reto de 7 días ([02](02-reto-7-dias.md)) |
| `/cedula-del-cielo` | El pasaporte actual (mover `PassportApp` a esta ruta) |

El slug del reto y el de la ruta podrían coincidir con `challenges.slug` en la base para no mantener dos nombres. Al mover el pasaporte hay que actualizar `metadata` de `layout.tsx` (hoy dice «Pasaporte del Cielo | Deepflow» para todo el sitio) y repartir el título por página.

**Un efecto a vigilar:** el pasaporte guarda su progreso en IndexedDB del navegador. Cambiar su ruta **no** pierde datos (IndexedDB es por origen, no por ruta), pero sí rompe enlaces ya compartidos a `/`: quien tenga el enlace llegará a la página principal y tendrá que pasar por la tarjeta. Aceptable con ~50 personas, pero conviene avisarlo.

## 5. Preguntas abiertas de esta página

- **Destino de «Quiero unirme»** (aparece en portada y en Reuniones). ¿Lleva a la sección Reuniones, abre WhatsApp del contacto, o abre el formulario de código de invitación del reto? Depende de qué significa «unirme» (¿al grupo presencial o a la app?).
- **Destino de «Guía del tema» y «Abrir tema».** El PDF no incluye la página del tema (objetivo, preguntas, ministración, fuentes). ¿Se hará una página por tema? Esta spec asume que **no existe todavía** y la deja fuera de alcance.
- **Contenido real de los Temas 1–5** (títulos) y datos de **Reuniones**: el diseño solo tiene marcadores.
- **Tema 6 «Disponible»:** ¿la tarjeta lleva a la guía del tema o a las actividades?
- **Ruta del pasaporte** (propuesta en §4).
- **Colores, tipografías y layout exactos:** salen del PDF, no de esta spec.

## 6. Fuera de alcance por ahora

- Páginas de contenido por tema (guías, preguntas de microcélula, fuentes).
- Datos desde API o CMS para temas y actividades.
- Sección «Reuniones» con calendario, mapa o confirmación de asistencia.
- Mostrar estado del grupo (río del grupo, rachas) en la página principal.
- Buscador, blog, i18n.
