# 01 · Página principal

Fuente de verdad visual y de textos: páginas 1 y 2 del PDF de diseño («DeepFlow – Inicio y Tema 6.pdf»). Esta spec describe estructura, contenido y comportamiento; **no** colores ni medidas, porque al preparar la spec solo se pudo leer el texto del PDF, no ver su render (ver nota en el README).

Identidad transversal y privacidad: [00-arquitectura.md §3](00-arquitectura.md). Esta página **no necesita la API**: es contenido estático.

## 1. Qué es y por qué es estática

La página principal presenta el grupo y las actividades disponibles. Su contenido **vive en el front**; por ahora muestra una sola actividad y no requiere API.

**Decidido:** el contenido es estático y está en el front. *Razón:* son ~50 personas y el contenido cambia poco; una base de datos o un CMS no se justifican. Además la página principal sigue funcionando aunque la API esté caída o dormida.

## 2. Secciones implementadas

| # | Sección | Contenido | Notas |
|---|---|---|---|
| 1 | Encabezado | Marca DeepFlow y etiqueta «Ezequiel 47:1-12» | Encabezado compartido por la portada, «Quiénes somos» y el pasaporte |
| 2 | Portada | Etiqueta del grupo, titular «Conecta con Dios y con otros, cada vez más profundo» y descripción | Sin botones ni tarjeta de tema actual |
| 3 | Quiénes somos | Banner «Un grupo que avanza junto hacia lo profundo», una breve descripción y enlace **Conocer al grupo** | Abre `/quienes-somos` |
| 4 | Actividades | Una sola tarjeta: **Pasaporte del Cielo**, con enlace **Abrir pasaporte** | No mostrar el reto de 7 días ni actividades próximas hasta que estén disponibles |
| 5 | Información práctica | **Sábados a las 3:00 pm**; **SuPresencia, sede Castellana, salón teatro 303** | Franja breve sin sección de reuniones, contacto ni botón |
| 6 | Pie de página | Marca, lema, «© 2026 DeepFlow» | |

No se muestra la sección «Lo que estudiamos en cada tema» ni se agrega contenido de temas o reuniones. Se conserva solo la información práctica de día, hora y lugar solicitada.

La página `/quienes-somos` presenta la identidad de DeepFlow, la inspiración del río de Ezequiel en un recuadro propio, lo que hacemos, los nombres de las líderes (Laura Diaz, Paola Morales, Valentina Perico e Ivan Camilo) y de los developers (Nico, Johny y Dani). Los nombres se muestran sin campos ni espacios para fotografías.

## 3. Cómo ampliar la página más adelante

Cuando existan varios temas o actividades, se pueden definir en archivos de datos y renderizar sus tarjetas a partir de esas listas, en lugar de repetir HTML.

### Recomendado

Siguiendo el patrón actual de `src/data/` (`stamps.ts`, `themes.ts`), crear:

| Archivo | Qué podría contener |
|---|---|
| `src/data/topics.ts` | Lista de temas: número, título, descripción corta, estado (`available` / `soon`), ruta si está disponible y, cuando exista, objetivo / preguntas / ministración / fuentes |
| `src/data/activities.ts` | Lista de actividades: título, tema al que acompañan, texto del botón, ruta y estado |
| `src/data/meetings.ts` | Si en el futuro se agrega una sección de reuniones, sus datos |

La tarjeta actual de actividad es estática. Si se agregan más actividades, se puede convertir en una lista basada en `activities.ts`. Por ahora no se muestra contenido de temas, retos próximos ni reuniones.

Componentes sugeridos (carpeta `src/components/`, como el resto): `site-header`, `site-footer`, `topic-card`, `activity-card`. El encabezado y el pie se reutilizan en la página del reto, que en el PDF repite la barra superior (con «Volver al inicio»).

Reutilizable de lo que ya existe: el logo (`public/deepflowlogo.png`, clase `.brand-mark`), las fuentes del layout, los botones `.primary-btn` / `.secondary-btn` y la paleta base (`--navy`, `--sky`, `--gold`). El patrón de `.topbar` + `.main-wrap` (ancho máx. 1180 px) coincide con una barra superior de este tipo. No hay hoy componentes de tarjeta ni de navegación entre rutas.

### Cómo se maneja el contenido pendiente

Los textos entre corchetes del diseño (`[Título del tema]`, `[Día y hora de la reunión]`, `[Lugar o enlace]`, `[WhatsApp o líder de contacto]`) son marcadores, no texto final. **Recomendado:** que el dato vacío en `topics.ts` / `meetings.ts` deje la tarjeta o el campo en estado «por definir» en lugar de publicar corchetes literales.

## 4. Rutas

**Decidido:**

| Ruta | Página |
|---|---|
| `/` | Página principal |
| `/quienes-somos` | Quiénes somos |
| `/cedula-del-cielo` | Pasaporte del Cielo |

La ruta `/reto-7-dias` se podrá agregar cuando ese reto esté creado.

**Un efecto a vigilar:** el pasaporte guarda su progreso en IndexedDB del navegador. Cambiar su ruta **no** pierde datos (IndexedDB es por origen, no por ruta), pero sí rompe enlaces ya compartidos a `/`: quien tenga el enlace llegará a la página principal y tendrá que pasar por la tarjeta. Aceptable con ~50 personas, pero conviene avisarlo.

## 5. Preguntas abiertas de esta página

- **Colores, tipografías y layout exactos:** salen del PDF, no de esta spec.

## 6. Fuera de alcance por ahora

- Páginas de contenido por tema (guías, preguntas de microcélula, fuentes).
- Datos desde API o CMS para temas y actividades.
- Sección de reuniones, contacto o inscripción.
- Mostrar estado del grupo (río del grupo, rachas) en la página principal.
- Buscador, blog, i18n.
