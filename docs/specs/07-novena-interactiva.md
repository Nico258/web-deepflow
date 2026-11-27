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
- **Nada queda debajo de la barra y el objetivo de arriba.** React le avisa al juego cuánto ocupan, y la cámara deja ese espacio libre: cerca del borde superior del mapa se ve una franja oscura en vez de esconder al jugador o las primeras filas del mapa.

### Recomendado

- **Mapas con Tiled** cuando llegue el arte. En el prototipo los mapas son texto (una letra por casilla, §4), que se edita sin herramientas y sirve de boceto. Tiled exporta JSON que Phaser lee directamente; el cambio afecta solo cómo se dibuja el mapa, no los guiones de los capítulos.
- Quedarse en Phaser 3 mientras dure este proyecto. Ya salió Phaser 4, pero casi toda la documentación y los ejemplos son de la 3.

## 3. Cómo funciona un capítulo

Un capítulo es **un archivo de datos**, sin lógica de juego: `src/data/novena/capitulos/08-pastores.ts` es el ejemplo completo y `_plantilla.ts` el punto de partida. El motor (`src/game/novena/chapter-scene.ts`) es el mismo para todos.

Un capítulo tiene:

| Parte | Qué es |
|---|---|
| `map` | El mapa principal como filas de texto (§4), si es de día o de noche y sus salidas |
| `items` | (Opcional) lo que se puede llevar, que se ve arriba mientras se tiene (ver «Objetos») |
| `maps` | (Opcional) otros mapas: el interior de una casa, otra parte del camino (ver «Varios mapas») |
| `player` | Nombre, color y casilla de inicio del personaje que se maneja |
| `actors` | Las demás personas (y ángeles, animales que hablan…) y los objetos: casilla, color, si empiezan ocultos y qué dicen en cada paso |
| `dialogs` | Todas las conversaciones, cada una como una lista de líneas `{ who, text }` |
| `steps` | **Los pasos del capítulo, en orden.** Cada paso tiene un objetivo visible y una meta |
| `herd` | (Opcional) la configuración del minijuego de reunir ovejas |
| `ending` | Versículo, referencia y pregunta del cierre |

### Metas de un paso

| Meta | Se cumple cuando… |
|---|---|
| `auto` | Apenas terminan sus acciones de inicio (para introducciones) |
| `talk` | Se habla con cierto personaje |
| `reach` | El jugador llega a cierta zona (`zone`) del mapa; `map` dice de cuál, si no es el principal |
| `herd` | Todas las ovejas están en el corral y la puerta se cerró |
| `flags` | Están marcadas todas las banderas de `all`, en cualquier orden (ver «Banderas») |

En `herd` y `flags`, el `objective` puede llevar `{n}` y `{total}` para mostrar cuánto va: «Toca las puertas ({n}/{total})».

### Acciones (en `onStart` y `onDone`)

`say` (abre un diálogo), `show` / `hide` (aparece o desaparece un personaje), `flash` (destello de luz), `lighting` (cambia la luz: `day`, `night`, `glory`), `pan` / `follow` (mueve la cámara a un punto y vuelve al jugador), `wait` (pausa), `sfx` (efecto de sonido), `set` / `unset` (marca o desmarca banderas) y `travel` (lleva al jugador a otro mapa o casilla, con un fundido: `{ type: "travel", map: "casa", at: [4, 3] }`).

Para que la escena se mueva:

| Acción | Qué hace |
|---|---|
| `move` | Un personaje (o `"player"`) camina hasta una casilla de su mapa y se espera a que llegue: `{ type: "move", actor: "posadero", to: [12, 6] }`. `ms` es lo que tarda cada paso (por defecto 220). Los que flotan van en línea recta |
| `join` / `leave` | Alguien empieza o deja de **acompañar** al jugador: camina detrás de él, no le tapa el paso y pasa con él a otros mapas (María con José, el burro). Se le puede hablar como siempre |
| `zoom` | Acerca (más de 1) o aleja (menos de 1) la cámara respecto de lo normal; `1` la deja como estaba. Por ejemplo, `{ type: "zoom", to: 0.5, ms: 1200 }` para ver el cielo lleno de ángeles |

Cualquier acción puede llevar `when` (la misma condición de «Banderas», más abajo): solo se hace si se cumple. Por ejemplo, `{ type: "say", dialog: "nos-vemos", when: { flags: ["va-a-la-fiesta"] } }`.

### Banderas y diálogos según lo que pasó

Una **bandera** es un nombre que el capítulo marca para recordar algo: «toco-casa-1», «tiene-pan», «hablo-con-el-posadero». Empiezan sin marcar y se olvidan al salir del capítulo. Se marcan con las acciones `set` / `unset` (una o varias: `{ type: "set", flag: ["a", "b"] }`) o al terminar un diálogo.

`talk` de un personaje tiene dos formas:

- **Simple**, como en el capítulo 8: `{ idDelPaso: "dialogo", default: "otro" }`, según el paso actual.
- **Por casos**: una lista; se usa **el primer caso cuya condición se cumpla**. Cada caso tiene `dialog` y, si se quiere, `when` (la condición), `set` / `unset` (banderas que se marcan o desmarcan al terminar ese diálogo) y `do` (acciones que se hacen después, como `hide`). Un caso sin `when` sirve siempre, así que va al final.

| `when` | Se cumple si… |
|---|---|
| `step` | El paso actual es este (o uno de una lista) |
| `flags` | Están marcadas todas estas banderas |
| `not` | No está marcada ninguna de estas |

Ejemplo, tocar puertas en Belén (capítulo 7): cada posadero dice que no hay lugar y marca su bandera; si se le vuelve a tocar, dice otra cosa. El paso termina con la meta `flags` cuando se tocaron las tres, en cualquier orden.

```ts
// En actors:
{ id: "posadero1", name: "Posadero", at: [10, 4], color: 0x8a5a3c, talk: [
  { when: { not: ["toco-casa-1"] }, dialog: "no-hay-lugar-1", set: "toco-casa-1" },
  { dialog: "ya-te-dije" },
] },
// En steps:
{ id: "puertas", objective: "Busca dónde pasar la noche ({n}/{total})",
  goal: { type: "flags", all: ["toco-casa-1", "toco-casa-2", "toco-casa-3"] } },
```

### Varios mapas

Además del mapa principal (`map`, cuyo id es `"main"`), un capítulo puede tener otros en `maps`, cada uno con sus filas, su luz y sus salidas. Una **salida** (`exits`) es una casilla: al pisarla, el jugador pasa a otro mapa con un fundido.

| Campo de la salida | Qué es |
|---|---|
| `at` | La casilla que se pisa. Lo normal es una puerta (`d`) o el borde del camino |
| `to` | El id del mapa al que lleva (`"main"` para volver al principal) |
| `arrive` | Dónde aparece el jugador en ese mapa. Mejor **al lado** de la salida de vuelta, no encima |
| `when` | (Opcional) solo se puede pasar si se cumple (por ejemplo, después de hablar con alguien) |
| `closed` | (Opcional) diálogo que se abre al pisarla mientras `when` no se cumple («La puerta está cerrada») |

Cada personaje dice en qué mapa está con `map` (por defecto, el principal) y solo se ve cuando el jugador está ahí. Una meta `reach` en otro mapa lleva `map`. Las ovejas van siempre en el mapa principal. Un mapa más chico que la pantalla, como una casa, se ve centrado. `_plantilla.ts` trae una casa con su puerta.

```ts
map: { lighting: "day", rows: [/* … */], exits: [{ at: [10, 0], to: "casa", arrive: [4, 3] }] },
maps: {
  casa: { lighting: "day", rows: [/* … */], exits: [{ at: [4, 4], to: "main", arrive: [10, 1] }] },
},
```

El validador sigue las salidas para saber a qué se puede llegar, y avisa si una lleva a un mapa que no existe o a una casilla que no se puede pisar.

### Objetos

Un personaje con `kind: "object"` es una cosa del mapa: un cántaro, una canasta, la carga del burro. Se dibuja como una caja, se toca y se «habla» con él igual que con una persona (el texto lo dice `narrator`), y bloquea el paso. Sin `talk`, es solo decoración y no lleva nombre encima.

No hay inventario (§9): **tener algo es una bandera**. Recoger es marcarla y ocultar el objeto; usarlo es un caso de `talk` que pide esa bandera.

Para que se note lo que se lleva, el capítulo lo declara en `items`: mientras la bandera esté marcada, el objeto se ve como un ícono arriba a la derecha. Al tocarlo aparece su nombre y `hint`, que recuerda para qué sirve. Es solo informativo: no se abre nada ni se usa desde ahí. Al desmarcar la bandera (por ejemplo, al entregarlo), desaparece.

```ts
items: [{ flag: "tiene-pan", name: "Pan", color: 0xc9a25a, hint: "Para cargarlo en el burro." }],
```

```ts
// Recoger: marca la bandera y desaparece.
{ id: "pan", name: "Pan", kind: "object", at: [12, 5], color: 0xc9a25a, talk: [
  { dialog: "recoges-el-pan", set: "tiene-pan", do: [{ type: "hide", actor: "pan" }] },
] },
// Usar: el burro dice otra cosa si llevas el pan.
{ id: "burro", name: "Burro", at: [20, 8], color: 0x8b7d6b, talk: [
  { when: { flags: ["tiene-pan"] }, dialog: "cargas-el-pan", set: "burro-cargado", unset: "tiene-pan" },
  { dialog: "burro-espera" },
] },
```

### Elegir una respuesta

La **última línea** de un diálogo puede traer `choices`: respuestas que se muestran como botones. Cada una tiene `text` y, si se quiere, `set` / `unset` (banderas que marca o desmarca al elegirla) y `next` (el diálogo que se abre después). `next` puede apuntar al mismo diálogo que pregunta, para volver a preguntar hasta acertar.

Ejemplo, el nombre del niño (capítulo 3):

```ts
"que-nombre": [
  { who: "vecina", text: "¿Y cómo se va a llamar? ¿Zacarías, como su papá?" },
  { who: "narrator", text: "Zacarías pide una tablilla y escribe…", choices: [
    { text: "«Su nombre es Juan»", set: "nombre-juan", next: "se-llama-juan" },
    { text: "«Zacarías»", next: "no-ese-no" },
  ] },
],
"no-ese-no": [{ who: "narrator", text: "Zacarías borra la tablilla. Eso no fue lo que dijo el ángel." }],
```

Una pregunta se repite cada vez que se abre su diálogo. Si no debe repetirse, el personaje dice otra cosa después: en la forma simple, la pregunta va solo en su paso y `default` dice otra cosa (como el vecino de `_plantilla.ts`); por casos, un caso con `not` sobre la bandera de la respuesta.

La elección se combina con lo demás: una meta `flags` se cumple si una respuesta marca su bandera, y un caso de `talk` o una acción con `when` dicen otra cosa según lo elegido. En el celular se toca la respuesta; en el computador se elige con las flechas y Enter, o con su número.

El validador avisa si una meta o un `when` usa una bandera que nada marca (casi siempre es un error de escritura), si una meta `flags` pide una bandera que en ese paso nadie puede marcar, o si se marca una bandera que nada usa. `_plantilla.ts` trae un ejemplo con las dos formas.

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
| `wander` | (Opcional) de 0 a 1: cuánto pastan las ovejas tranquilas (probabilidad de dar un paso cada `paceMs`). Por defecto 0,2 |
| `helpAfterMs` | (Opcional) desde cuándo empieza a crecer la ayuda. Por defecto 45 000 (45 s); 0 la desactiva |
| `helpRampMs` | (Opcional) cuánto tarda la ayuda en llegar al máximo. Por defecto 60 000 (1 min) |
| `helpDialog` | (Opcional) diálogo que se abre una vez cuando empieza la ayuda |

Al huir, una oveja prefiere alejarse en línea recta, evita pegarse a muros y cercas (si no, se desliza por el borde hasta una esquina) y, entre caminos parecidos, elige el lado del corral. Tranquila (con el jugador lejos), pasta: da pasitos al azar a no más de 2 casillas de donde la dejaron, sin acercarse al jugador, así que ni se pierde ni vuelve sola al corral.

La **ayuda** existe para que nadie se quede trabado: es un juego para acompañar la novena, no para frustrarse. Desde `helpAfterMs`, la preferencia por el corral crece poco a poco durante `helpRampMs`; al máximo, una oveja va hacia el corral aunque tenga que pasar cerca del jugador (por ejemplo, para salir de un muro). Solo actúa cuando el jugador se acerca a la oveja.

Para un momento jugable nuevo (cargar el burro, tocar puertas…), primero hay que preguntarse si se arma con estas piezas. Si no, se agrega una meta nueva al motor, como se hizo con `herd`, para que quede disponible para los demás capítulos.

### Probar un capítulo

> **Recomendado:** antes de subir cualquier cambio a un capítulo, al motor (`src/game/novena/`) o a la interfaz de la novena (`src/components/novena/`), corre `pnpm test:novena` y revisa que pase. No corre solo: ni `pnpm build` ni GitHub lo ejecutan, así que depende de quien hace el cambio (persona o agente). Si alguna prueba falla, el mensaje dice en qué capítulo y en qué paso.

- **Empezar a medias:** en desarrollo (`pnpm dev`), `/novena?cap=8&paso=volver` abre el capítulo 8 directamente en ese paso. Los pasos anteriores se dan por hechos sin diálogos (las ovejas aparecen en el corral, los personajes ya mostrados aparecen, quedan marcadas las banderas de sus acciones, de sus metas `flags` y de los diálogos de sus metas `talk`, y si la última meta era en otro mapa, el jugador empieza allá). `/novena?cap=plantilla` juega `_plantilla.ts` (sirve para probar el motor sin tocar un capítulo; no se guarda como completada). En producción no funciona.
- **Validador** (`src/game/novena/validate.ts`): revisa el guion sin jugarlo. Encuentra lo que rompe el capítulo o lo deja trabado: un diálogo o personaje que no existe, una letra desconocida en el mapa, alguien parado sobre un árbol, hablar con alguien que está oculto o que no tiene diálogo para ese paso, una zona a la que no se puede llegar… También avisa de descuidos, como un diálogo que nadie usa o un paso sin objetivo. En desarrollo corre solo al abrir un capítulo y escribe en la consola del navegador.
- **Pruebas automáticas** (`pnpm test:novena`, en `tests/novena/`): para **cada capítulo que tenga `load`** en `chapters.ts`, corren el validador y recorren el capítulo de punta a punta en escritorio y en celular (390 × 780, táctil). No se juega de verdad: los diálogos se cierran al instante, a quien hay que hablarle se le toca de verdad (en `flags`, a quien marca una bandera que falta, al hablarle o con una respuesta), las respuestas se van probando en orden (si una vuelve a preguntar, la siguiente vez elige otra) y las demás metas se cumplen de una vez (llegar a la zona, meter las ovejas al corral). Pasan si aparece el cierre con el versículo, se guarda el capítulo y no hay errores en la consola. Tardan unos 15 segundos por capítulo. **Al agregar un capítulo no hay que escribir pruebas nuevas.**
  - La primera vez hay que instalar un navegador para las pruebas: `pnpm exec playwright install chromium`. Si se prefiere usar uno ya instalado, sin descargar nada: `PW_CHANNEL=msedge pnpm test:novena` (Edge) o `PW_CHANNEL=chrome`.
  - Si ya hay un `pnpm dev` abierto en el puerto 3000, las pruebas lo usan; si no, lo abren solas.
- **Consola:** en desarrollo, `window.__novena` tiene herramientas de depuración: `state()` (paso actual, meta, mapa, posición, banderas marcadas), `completeStep()` (cumple la meta actual; si hace falta, primero pasa al jugador al mapa de la persona o de la zona), `teleport([x, y])`, `actorTile(id)` y `scene` (la escena de Phaser). Las pruebas usan solo estas funciones; si el motor cambia, se ajustan ahí (`NovenaDebug` en `chapter-scene.ts`).

### Escribir un capítulo nuevo (el estándar)

Así se arman los capítulos 1 a 7, 9 y ★ mientras el capítulo 8 se sigue puliendo. **Primero todo funcional, con cuadros de colores; el arte se agrega y se adapta después** (§5), sin tocar los guiones.

**Cómo trabajar**

- Una rama y un PR por capítulo, desde `main` (por ejemplo `feature/novena-cap-2`). El PR toca solo `src/data/novena/capitulos/NN-nombre.ts` y el `load` en `chapters.ts`.
- Se parte de `_plantilla.ts` y se mira `08-pastores.ts` como ejemplo completo.
- Si un momento jugable no se puede armar con las metas y acciones que existen, **no se fuerza el motor dentro del capítulo**: se arma una versión simple con lo que hay y se pide la pieza nueva aparte, para que la agregue quien lleva el motor y quede para todos.
- Antes de pedir revisión: el validador sin errores en la consola y `pnpm test:novena` pasando.

**Forma del capítulo**

- **Unos 5 minutos** jugando sin apuro. Como medida, el capítulo 8 tiene 5 pasos y unas 40 líneas de diálogo.
- Un orden que funciona: un paso `auto` de introducción (dónde estamos, quién soy, qué pasa), 3 o 4 pasos con metas, **un momento especial** y el cierre.
- Cada paso con meta tiene un `objective` corto en imperativo («Habla con Rubén», «Lleva las ovejas al corral»). Nadie debería quedarse sin saber qué hacer.
- El mapa, pequeño: lo justo para el capítulo (el del 8 es de 40 × 26 casillas). Mejor pocos lugares con algo que hacer que mucho mapa vacío.

**Diálogos**

- Tono juvenil, con humor ligero y personajes con personalidad, sin burlarse de la historia ni de los personajes bíblicos.
- Líneas cortas: una o dos oraciones (en el celular se leen en una caja pequeña). Mejor varias líneas cortas que una larga.
- `narrator` para describir lo que pasa; `player` para el personaje que se maneja.
- Lo que se cuenta sigue el pasaje del capítulo. Se pueden inventar personajes secundarios y conversaciones del día a día (un vecino, un pastor compañero), pero no hechos que contradigan el relato.

**Citas bíblicas**

- Las palabras de la Biblia que dicen los personajes y el versículo del cierre van **tal cual en la NTV**, con la referencia exacta. Se copian del texto oficial; **nunca se citan de memoria ni se inventan**. Si no se tiene el texto a mano, se deja anotado en el PR para revisarlo.
- El cierre (`ending`) tiene el versículo, la referencia y **una pregunta corta** para pensar, que conecte la historia con la vida de quien juega.

**Lo que todavía no existe en el motor**

Está en el plan (§7) y llegará sin romper los capítulos ya escritos, porque son campos opcionales nuevos. Mientras tanto, se arma el capítulo con lo que hay:

- Personajes que caminan solos todo el tiempo (por ahora caminan con `move`, en una escena).
- Música por momento.

## 4. Mapas en texto (prototipo)

Cada letra es una casilla de 16 × 16 px:

| Letra | Casilla | ¿Se puede pisar? |
|---|---|---|
| `.` | Pasto | Sí |
| `,` | Camino de tierra | Sí |
| `_` | Suelo de piedra o de casa | Sí |
| `g` | Puerta del corral (abierta) | Sí, hasta que se cierra |
| `d` | Puerta de una casa (para las salidas entre mapas) | Sí |
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
| 3. Capítulos | ~5 al 12 de dic | Capítulos 1 a 7 y 9 con cuadros de colores, entre dos personas, siguiendo el estándar de §3. Diseño en paralelo |
| 4. Arte y sonido | ~8 al 14 de dic | Integrar los sprites, el mapa general, la música y los efectos |
| 5. Lanzamiento | 15 de dic | Tarjeta en la página principal y pruebas finales |
| Después | Antes del 6 de ene | Capítulo ★ |

**Primero funcional, después el arte.** Los capítulos se escriben y se prueban con cuadros de colores. El arte entra después en el motor (capa de dibujo y manifiesto de sprites), sin cambiar los guiones. Mientras tanto, el capítulo 8 se sigue puliendo como molde y el motor suma piezas en etapas pequeñas:

1. Indicadores: «!» sobre quien tiene algo que decir, marca del destino al tocar, menú de pausa y pistas (`hint`) por paso.
2. Diálogos más accesibles (lector de pantalla, menos movimiento) y con pausas en la puntuación.
3. Escena de los ángeles del capítulo 8: acercar la cámara y luz.
4. Motor: banderas, diálogos según banderas, elecciones, objetos, personajes que caminan o acompañan, acercar la cámara y varios mapas. *(hecho)*
5. Arte: capa de dibujo, manifiesto de sprites y tamaño de casilla configurable. Después, mapas de Tiled (opcional).
6. Sonido: música por momento y botón para silenciar.

**Plan B:** si no alcanza, los capítulos se publican de a poco (por ejemplo, del 1 al 4 el 16 de diciembre y uno nuevo cada día). Los capítulos que aún no existen se ven en el mapa como «Próximamente».

## 8. Pendientes

- Probar el capítulo 8 en iPhone y Android: comodidad de tocar para caminar, tamaño del texto y duración real.
- Tarjeta de la actividad en la página principal (cuando haya al menos 3 capítulos jugables).
- Guion de los capítulos 1 a 7, 9 y ★: diálogos y pasos, siguiendo el estándar de §3.
- Revisar contra el texto oficial de la NTV las citas del capítulo 8 (Lucas 2:10-12 en el anuncio, Lucas 2:14 en el canto y el versículo del cierre).
- Botón para silenciar el sonido, cuando haya sonido.

## 9. Fuera de alcance por ahora

- Las oraciones de la novena.
- Guardar el avance dentro de un capítulo.
- Jugar en grupo, puntajes o cualquier cosa que necesite servidor.
- Inventario, dinero, combate o cualquier sistema que no sirva directamente a contar la historia.
- Imagen para compartir al terminar (se puede agregar después, como en el pasaporte y el reto).
