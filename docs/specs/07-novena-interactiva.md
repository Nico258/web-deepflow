# 07 · Novena interactiva: «Camino a Belén»

Un juego en pixel art, con vista desde arriba, que acompaña la Novena de Aguinaldos (16 al 24 de diciembre). **No reemplaza la novena ni incluye sus oraciones**: es un complemento que ayuda a entender y ver de otra manera la historia que se reza esos días. Cada quien juega solo, desde su celular, durante las vacaciones del grupo.

«Camino a Belén» es un nombre provisional.

Código: página en `src/app/novena/`, motor del juego y validador en `src/game/novena/`, contenido en `src/data/novena/`, interfaz en `src/components/novena/`, guardado en `src/hooks/use-novena-progress.ts` y pruebas en `tests/novena/`.

## 1. La idea

### Decidido

- **Es un solo juego, no una serie de minijuegos.** Hay un mapa pequeño de Galilea y Judea donde **cada lugar es un capítulo**. En cada capítulo se maneja a un personaje de la historia: se camina, se habla con la gente, se hacen cosas y en algún momento pasa algo especial. Los minijuegos ocurren **dentro del mundo** (reunir ovejas caminando detrás de ellas, cargar el burro), no en una pantalla aparte.
- **Unos 5 minutos por capítulo.**
- **Nada se bloquea.** Todos los capítulos se pueden jugar desde el primer día, antes del 16 incluso, y en cualquier orden. Para guiar sin obligar, **una estrella marca en el mapa el capítulo que sigue** (el primero sin completar).
- **Juegas como el personaje del capítulo**, no con el monigote del reto.
- **Tono juvenil**, con el encanto de un juego: humor ligero en los diálogos, personajes con personalidad, momentos de asombro.
- **Sin oraciones de la novena.** Al cerrar cada capítulo aparece una cita bíblica (NTV, con el mismo aviso del resto del sitio) y una pregunta corta para pensar.
- **Todo se guarda en el dispositivo**, igual que el pasaporte y el reto. No hay cuentas ni servidor.
- **Lleva música y efectos de sonido** sacados de packs gratuitos (§5).

### Capítulos

| # | Lugar en el mapa | Juegas como | Historia | Momento jugable | Pasaje |
|---|---|---|---|---|---|
| 1 | Templo de Jerusalén | Zacarías | El ángel le anuncia a Juan; Zacarías queda mudo | Recorrer el templo para ofrecer el incienso. Al salir mudo, hacerse entender con gestos | Lc 1:5-25 |
| 2 | Casa de María, Nazaret | María | La Anunciación | Un día normal (el pozo, los vecinos) que se interrumpe con la visita de Gabriel | Lc 1:26-38 |
| 3 | Montañas de Judea | María | Visitación y nacimiento de Juan | Cruzar el camino de montaña. En casa de Isabel, escribir «Su nombre es Juan» | Lc 1:39-80 |
| 4 | Taller de José, Nazaret | José | La duda y el sueño | Terminar un encargo de carpintería; después, una secuencia de sueño | Mt 1:18-25 |
| 5 | Plaza de Nazaret | José | El edicto del censo | Escuchar el pregón, conseguir provisiones y cargar el burro | Lc 2:1-4 |
| 6 | El camino | José | El viaje de unos 150 km | Elegir rutas, encontrar agua y acampar de noche | Lc 2:4-5 |
| 7 | Belén | José | No hay lugar | Tocar puertas por el pueblo hasta llegar al establo | Lc 2:6-7 |
| 8 | Campos de pastores | Un pastor joven | Los ángeles anuncian | Reunir el rebaño de noche; aparecen los ángeles | Lc 2:8-15 |
| 9 | El establo | El mismo pastor | Nochebuena | Llegar al pesebre. Escena contemplativa, casi sin «juego» | Lc 2:16-20 |
| ★ | Desde el oriente | Un mago | Los Reyes Magos | Seguir la estrella | Mt 2:1-12 |

El capítulo ★ entra, pero **con prioridad baja y al final**.

### Abierto

- El nombre definitivo del juego.
- El nombre del pastor joven de los capítulos 8 y 9 (en el prototipo se llama Eliel).

## 2. Tecnología

### Decidido

- **Phaser 3** (en el prototipo, 3.90) dentro del sitio de Next.js, como una página más (`/novena`). Se descartó Godot porque su exportación web pesa varios MB, ha dado problemas en iPhone y obligaría a aprender otro lenguaje y otra herramienta; Phaser usa TypeScript, pesa alrededor de 1 MB y comparte tipografías, colores y guardado con el sitio.
- **Reparto de responsabilidades:**
  - **Phaser** dibuja el mundo: mapa, personajes, movimiento, ovejas, luz y cámara.
  - **React** dibuja lo que va encima: diálogos, objetivo actual, menú, mapa de capítulos y cierre del capítulo. Así el texto queda nítido, es accesible y se edita como cualquier página.
  - Se comunican por un bus de eventos pequeño (`src/game/novena/bus.ts`).
- **Phaser se carga solo en el navegador** (`import()` dinámico dentro de un `useEffect`), porque no funciona en el servidor.
- **Controles:**
  - En el celular: **tocar para caminar**. Se toca un punto y el personaje va hasta allá; si se toca a alguien, camina hasta su lado y le habla. **Mantener el dedo** hace que camine hacia él mientras no se suelte (sirve para arrear ovejas).
  - En el computador: flechas o WASD para caminar, y Espacio, Enter o E para hablar.
- **Movimiento por casillas** de 16 px. Es más simple de programar y de diseñar, y basta para este juego.
- **Zoom entero** según la pantalla (×2 en el celular, ×3 o más en el computador), para que el pixel art se vea nítido.

### Recomendado

- **Mapas con Tiled** cuando llegue el arte. En el prototipo los mapas son texto (una letra por casilla, §4), que se edita sin herramientas y sirve de boceto. Tiled exporta JSON que Phaser lee directamente; el cambio afecta solo cómo se dibuja el mapa, no los guiones de los capítulos.
- Quedarse en Phaser 3 mientras dure este proyecto. Ya salió Phaser 4, pero casi toda la documentación y los ejemplos son de la 3.

## 3. Cómo funciona un capítulo

Un capítulo es **un archivo de datos**, sin lógica de juego: `src/data/novena/capitulos/08-pastores.ts` es el ejemplo completo y `_plantilla.ts` el punto de partida. El motor (`src/game/novena/chapter-scene.ts`) es el mismo para todos.

Un capítulo tiene:

| Parte | Qué es |
|---|---|
| `map` | El mapa como filas de texto (§4) y si es de día o de noche |
| `player` | Nombre, color y casilla de inicio del personaje que se maneja |
| `actors` | Las demás personas (y ángeles, animales que hablan…): casilla, color, si empiezan ocultos y qué dicen en cada paso |
| `dialogs` | Todas las conversaciones, cada una como una lista de líneas `{ who, text }` |
| `steps` | **Los pasos del capítulo, en orden.** Cada paso tiene un objetivo visible y una meta |
| `herd` | (Opcional) la configuración del minijuego de reunir ovejas |
| `ending` | Versículo, referencia y pregunta del cierre |

### Metas de un paso

| Meta | Se cumple cuando… |
|---|---|
| `auto` | Apenas terminan sus acciones de inicio (para introducciones) |
| `talk` | Se habla con cierto personaje |
| `reach` | El jugador llega a cierta zona del mapa |
| `herd` | Todas las ovejas están en el corral y la puerta se cerró |

### Acciones (en `onStart` y `onDone`)

`say` (abre un diálogo), `show` / `hide` (aparece o desaparece un personaje), `flash` (destello de luz), `lighting` (cambia la luz: `day`, `night`, `glory`), `pan` / `follow` (mueve la cámara a un punto y vuelve al jugador), `wait` (pausa) y `sfx` (efecto de sonido).

### Reunir ovejas (`herd`)

Las ovejas huyen del jugador: hay que ponerse detrás de ellas para empujarlas hacia la puerta del corral. Cuando todas están adentro y el jugador sale, la puerta se cierra. Mientras faltan ovejas, unas flechas en el borde de la pantalla apuntan a las que no se ven.

| Campo | Qué es |
|---|---|
| `sheep` | Casilla de inicio de cada oveja |
| `pen` | Interior del corral (zona) |
| `gate` | Casillas de la puerta: deben ser `g` en el mapa |
| `fleeRadius` | A cuántas casillas del jugador se asustan. Recomendado: 3 |
| `paceMs` | (Opcional) cada cuántos ms decide una oveja si da un paso. Más alto, más lentas. Por defecto 320 |
| `homing` | (Opcional) de 0 a 1: al huir, cuánto prefieren el lado del corral al principio. Por defecto 0,2 |
| `helpAfterMs` | (Opcional) desde cuándo empieza a crecer la ayuda. Por defecto 45 000 (45 s); 0 la desactiva |
| `helpRampMs` | (Opcional) cuánto tarda la ayuda en llegar al máximo. Por defecto 60 000 (1 min) |
| `helpDialog` | (Opcional) diálogo que se abre una vez cuando empieza la ayuda |

Al huir, una oveja prefiere alejarse en línea recta, evita pegarse a muros y cercas (si no, se desliza por el borde hasta una esquina) y, entre caminos parecidos, elige el lado del corral. Tranquila (con el jugador lejos), casi no se mueve y nunca vuelve sola.

La **ayuda** existe para que nadie se quede trabado: es un juego para acompañar la novena, no para frustrarse. Desde `helpAfterMs`, la preferencia por el corral crece poco a poco durante `helpRampMs`; al máximo, una oveja va hacia el corral aunque tenga que pasar cerca del jugador (por ejemplo, para salir de un muro). Solo actúa cuando el jugador se acerca a la oveja.

Para un momento jugable nuevo (cargar el burro, tocar puertas…), primero hay que preguntarse si se arma con estas piezas. Si no, se agrega una meta nueva al motor, como se hizo con `herd`, para que quede disponible para los demás capítulos.

### Probar un capítulo

> **Recomendado:** antes de subir cualquier cambio a un capítulo, al motor (`src/game/novena/`) o a la interfaz de la novena (`src/components/novena/`), corre `pnpm test:novena` y revisa que pase. No corre solo: ni `pnpm build` ni GitHub lo ejecutan, así que depende de quien hace el cambio (persona o agente). Si alguna prueba falla, el mensaje dice en qué capítulo y en qué paso.

- **Empezar a medias:** en desarrollo (`pnpm dev`), `/novena?cap=8&paso=volver` abre el capítulo 8 directamente en ese paso. Los pasos anteriores se dan por hechos sin diálogos (las ovejas aparecen en el corral, los personajes ya mostrados aparecen). En producción no funciona.
- **Validador** (`src/game/novena/validate.ts`): revisa el guion sin jugarlo. Encuentra lo que rompe el capítulo o lo deja trabado: un diálogo o personaje que no existe, una letra desconocida en el mapa, alguien parado sobre un árbol, hablar con alguien que está oculto o que no tiene diálogo para ese paso, una zona a la que no se puede llegar… También avisa de descuidos, como un diálogo que nadie usa o un paso sin objetivo. En desarrollo corre solo al abrir un capítulo y escribe en la consola del navegador.
- **Pruebas automáticas** (`pnpm test:novena`, en `tests/novena/`): para **cada capítulo que tenga `load`** en `chapters.ts`, corren el validador y recorren el capítulo de punta a punta en escritorio y en celular (390 × 780, táctil). No se juega de verdad: los diálogos se cierran al instante, a quien hay que hablarle se le toca de verdad y las demás metas se cumplen de una vez (llegar a la zona, meter las ovejas al corral). Pasan si aparece el cierre con el versículo, se guarda el capítulo y no hay errores en la consola. Tardan unos 15 segundos por capítulo. **Al agregar un capítulo no hay que escribir pruebas nuevas.**
  - La primera vez hay que instalar un navegador para las pruebas: `pnpm exec playwright install chromium`. Si se prefiere usar uno ya instalado, sin descargar nada: `PW_CHANNEL=msedge pnpm test:novena` (Edge) o `PW_CHANNEL=chrome`.
  - Si ya hay un `pnpm dev` abierto en el puerto 3000, las pruebas lo usan; si no, lo abren solas.
- **Consola:** en desarrollo, `window.__novena` tiene herramientas de depuración: `state()` (paso actual, meta, posición), `completeStep()` (cumple la meta actual), `teleport([x, y])`, `actorTile(id)` y `scene` (la escena de Phaser). Las pruebas usan solo estas funciones; si el motor cambia, se ajustan ahí (`NovenaDebug` en `chapter-scene.ts`).

## 4. Mapas en texto (prototipo)

Cada letra es una casilla de 16 × 16 px:

| Letra | Casilla | ¿Se puede pisar? |
|---|---|---|
| `.` | Pasto | Sí |
| `,` | Camino de tierra | Sí |
| `_` | Suelo de piedra o de casa | Sí |
| `g` | Puerta del corral (abierta) | Sí, hasta que se cierra |
| `#` | Roca o muro | No |
| `T` | Árbol | No |
| `b` | Arbusto | No |
| `f` | Cerca | No |
| `~` | Agua | No |
| `*` | Fogata | No |

Las filas pueden tener distinto largo: el motor completa con `#`. Los personajes no se marcan en el mapa sino en `actors`, con su casilla `[columna, fila]` contada desde 0 en la esquina superior izquierda.

## 5. Arte y sonido

### Decidido

- **Quien diseña tiene de 5 a 10 horas por semana**, así que solo hace piezas puntuales. Lo demás sale de packs gratuitos.
- **Lo que diseña el equipo:**
  1. Personajes para caminar: Zacarías, María, José, el pastor joven, Isabel y el ángel. Son 4 direcciones con 2 o 3 cuadros cada una, sobre una base de 16 × 16 o 16 × 24 px.
  2. Un retrato por personaje para los diálogos (unos 48 × 48 px).
  3. El mapa general de capítulos.
  4. Las piezas de impacto: el ángel y la multitud de ángeles en el cielo, el establo y la estrella.
- **Los personajes secundarios** (vecinos, posaderos, pastores, gente del templo) salen de **recolorear una misma base**.
- **De packs:** terreno, árboles, rocas, casas, animales, objetos, música y efectos.

### Recomendado

- Elegir **una sola paleta y un solo pack base de terreno** desde el principio, para que todo se vea de una misma mano. Hace falta un estilo cálido y de Medio Oriente (arena, piedra, olivos), que es menos común que el estilo «granja verde».
- Preferir licencias **CC0**, que no exigen crédito. Si un pack pide crédito, se nombra en una sección de créditos dentro de `/novena`.
- Fuentes sugeridas para buscar: itch.io (filtrando por «top-down», «16x16» y licencia), OpenGameArt.org, Kenney.nl (todo CC0) y, para sonido, Freesound (solo CC0) y OpenGameArt.
- **Música:** una pista suave para el mapa, una por ambiente (día, noche, ciudad) y una especial para los ángeles y el establo. Es mejor repetir pistas entre capítulos que tener una por capítulo.

### Abierto

- Cuál pack base se usa. Es una decisión de diseño y hay que tomarla antes de que el diseño empiece a dibujar personajes, para que el tamaño y la paleta coincidan.

## 6. Qué se guarda

### Decidido

- `localStorage`, clave `deepflow:novena:v1`: los capítulos completados, con su fecha. Nada más: no hay nombre ni textos.
- No se guarda el avance **dentro** de un capítulo: si se sale a la mitad, se empieza de nuevo. Con 5 minutos por capítulo no vale la pena la complejidad. Por eso el botón «Mapa» pregunta antes de salir, y el juego se detiene mientras tanto.
- Si `localStorage` no está disponible (modo privado estricto), el juego funciona igual, pero no recuerda qué se completó.

## 7. Plan de trabajo

Programa una persona. El primer capítulo (el 8) queda como **molde** para que otra persona replique el resto.

| Fase | Fecha objetivo | Qué sale |
|---|---|---|
| 1. Prototipo | ~1 de dic | Motor, mapa de capítulos y **capítulo 8 completo con cuadros de colores**. Lista de piezas de arte. *(hecho en esta rama)* |
| 2. Molde | ~4 de dic | Probar el capítulo 8 en celulares reales, ajustar controles y ritmo, y elegir el pack base de arte |
| 3. Capítulos | ~5 al 12 de dic | Capítulos 1 a 7 y 9 con cuadros de colores, entre dos personas. Diseño en paralelo |
| 4. Arte y sonido | ~8 al 14 de dic | Integrar los sprites, el mapa general, la música y los efectos |
| 5. Lanzamiento | 15 de dic | Tarjeta en la página principal y pruebas finales |
| Después | Antes del 6 de ene | Capítulo ★ |

**Plan B:** si no alcanza, los capítulos se publican de a poco (por ejemplo, del 1 al 4 el 16 de diciembre y uno nuevo cada día). Los capítulos que aún no existen se ven en el mapa como «Próximamente».

## 8. Pendientes

- Probar el capítulo 8 en iPhone y Android: comodidad de tocar para caminar, tamaño del texto y duración real.
- Tarjeta de la actividad en la página principal (cuando haya al menos 3 capítulos jugables).
- Guion de los capítulos 1 a 7, 9 y ★: diálogos y pasos, siguiendo el formato del capítulo 8.
- Botón para silenciar el sonido, cuando haya sonido.

## 9. Fuera de alcance por ahora

- Las oraciones de la novena.
- Guardar el avance dentro de un capítulo.
- Jugar en grupo, puntajes o cualquier cosa que necesite servidor.
- Inventario, dinero, combate o cualquier sistema que no sirva directamente a contar la historia.
- Imagen para compartir al terminar (se puede agregar después, como en el pasaporte y el reto).
