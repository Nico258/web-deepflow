import type { Chapter } from "@/game/novena/types";

// Plantilla para un capítulo nuevo. Pasos:
// 1. Copia este archivo como `NN-nombre.ts` (por ejemplo `02-anunciacion.ts`).
// 2. Dibuja el mapa con letras (leyenda en docs/specs/07-novena-interactiva.md §4).
// 3. Pon a los personajes en `actors` con su casilla [columna, fila].
// 4. Escribe los diálogos y arma los pasos en orden.
// 5. En src/data/novena/chapters.ts, agrega `load` al capítulo para que deje de salir como «Próximamente».
// 6. Pruébalo con `pnpm dev` en /novena?cap=N (y &paso=id para empezar en un paso).
//    Si hay errores en el guion, el validador los muestra en la consola del navegador.
// 7. Corre `pnpm test:novena` antes de subir el capítulo (y después de cualquier cambio):
//    revisa el guion y lo recorre de punta a punta en escritorio y en celular. No corre solo
//    con el build, y no hay que escribir pruebas nuevas (spec 07 §3).
//
// El capítulo 8 (08-pastores.ts) es el ejemplo completo. El estándar (forma, tono, citas NTV y
// lo que el motor todavía no tiene) está en la spec 07 §3, «Escribir un capítulo nuevo».

const chapter: Chapter = {
  map: {
    lighting: "day",
    rows: [
      "##########d#########",
      "#..................#",
      "#....T........b....#",
      "#..................#",
      "#........,,,,,,,,,,,",
      "#..................#",
      "#....b.......T.....#",
      "#..................#",
      "####################",
    ],
    // Pisar la puerta (`d`) en [10, 0] lleva a la casa y aparece en [4, 3].
    exits: [{ at: [10, 0], to: "casa", arrive: [4, 3] }],
  },

  // Otros mapas, por id. Se entra y se sale por sus `exits`; los personajes dicen en qué mapa
  // están con `map`. Si el mapa es más chico que la pantalla, se ve centrado.
  maps: {
    casa: {
      lighting: "day",
      rows: [
        "##########",
        "#________#",
        "#________#",
        "#________#",
        "####d#####",
      ],
      exits: [{ at: [4, 4], to: "main", arrive: [10, 1] }],
    },
  },

  player: { name: "Personaje", color: 0x3d6fb6, at: [3, 4] },

  actors: [
    // Forma simple de `talk`: qué diálogo abre según el paso (`default` para el resto). La pregunta
    // de «saludo» se hace solo en el paso «hablar»; después dice otra cosa, para no repetirla.
    { id: "vecino", name: "Vecino", at: [8, 2], color: 0x8a5a3c, talk: { hablar: "saludo", default: "vecino-camino" } },
    // Forma por casos: se usa el primero que se cumpla. La primera vez marca la bandera
    // «saludo-vecina»; después dice otra cosa.
    {
      id: "vecina",
      name: "Vecina",
      at: [11, 6],
      color: 0xb0603a,
      talk: [
        { when: { not: ["saludo-vecina"] }, dialog: "vecina", set: "saludo-vecina" },
        { dialog: "vecina-otra-vez" },
      ],
    },
    // Un objeto (`kind: "object"`) se toca igual que una persona. Este se recoge: marca la bandera
    // y `do` lo oculta. Sin `talk`, un objeto es solo decoración (como la mesa).
    {
      id: "canasta",
      name: "Canasta",
      kind: "object",
      map: "casa",
      at: [7, 1],
      color: 0xc9a25a,
      talk: [{ dialog: "canasta", set: "tiene-canasta", do: [{ type: "hide", actor: "canasta" }] }],
    },
    { id: "mesa", name: "Mesa", kind: "object", at: [6, 2], color: 0x7a5230 },
  ],

  // Lo que se lleva: mientras su bandera esté marcada, se ve a la derecha, debajo del objetivo. Al tocarlo,
  // `hint` recuerda para qué sirve.
  items: [{ flag: "tiene-canasta", name: "Canasta", color: 0xc9a25a, hint: "Pan para la fiesta de esta noche." }],

  steps: [
    { id: "intro", goal: { type: "auto" }, onStart: [{ type: "say", dialog: "intro" }] },
    {
      id: "hablar",
      objective: "Habla con el vecino",
      goal: { type: "talk", actor: "vecino" },
      // Desde aquí el vecino te acompaña: camina detrás, también dentro de la casa.
      onDone: [{ type: "join", actor: "vecino" }],
    },
    // Meta `flags`: se cumple cuando están marcadas todas, en cualquier orden. {n} y {total}
    // muestran cuántas van.
    {
      id: "saludar",
      objective: "Saluda a la vecina y recoge la canasta en la casa ({n}/{total})",
      goal: { type: "flags", all: ["saludo-vecina", "tiene-canasta"] },
    },
    {
      id: "salir",
      objective: "Sal por el camino",
      goal: { type: "reach", zone: { x: 18, y: 4, w: 2, h: 1 } },
      onDone: [
        // El vecino deja de acompañar y camina solo hasta una casilla; la cámara se aleja.
        { type: "leave", actor: "vecino" },
        { type: "move", actor: "vecino", to: [15, 5] },
        { type: "zoom", to: 0.5, ms: 1200 },
        // Con `when`, la acción solo se hace si se cumple: aquí, si se eligió ir a la fiesta.
        { type: "say", dialog: "camino-a-la-fiesta", when: { flags: ["va-a-la-fiesta"] } },
      ],
    },
  ],

  dialogs: {
    intro: [{ who: "narrator", text: "Aquí empieza el capítulo." }],
    // La última línea puede traer respuestas para elegir (`choices`). Cada una puede marcar
    // banderas y abrir otro diálogo con `next`.
    saludo: [
      { who: "vecino", text: "¡Hola!" },
      {
        who: "vecino",
        text: "¿Vienes a la fiesta esta noche?",
        choices: [
          { text: "¡Claro que sí!", set: "va-a-la-fiesta", next: "fiesta-si" },
          { text: "Hoy no puedo.", next: "fiesta-no" },
        ],
      },
    ],
    "fiesta-si": [{ who: "vecino", text: "¡Qué bien! Te guardo un pan." }],
    "fiesta-no": [{ who: "vecino", text: "Bueno, otro día será." }],
    "vecino-camino": [{ who: "vecino", text: "¡Vamos, que se hace tarde!" }],
    "camino-a-la-fiesta": [{ who: "narrator", text: "Y ahora, a la fiesta." }],
    vecina: [{ who: "vecina", text: "¡Qué gusto verte! Saluda a tu mamá de mi parte." }],
    canasta: [{ who: "narrator", text: "Recoges la canasta. Huele a pan recién hecho." }],
    "vecina-otra-vez": [{ who: "vecina", text: "¿No se te olvida algo? Ah, no: ya me saludaste." }],
  },

  ending: {
    verse: "Texto del versículo (NTV).",
    reference: "Libro 1:1",
    reflection: "Pregunta corta para pensar.",
  },
};

export default chapter;
