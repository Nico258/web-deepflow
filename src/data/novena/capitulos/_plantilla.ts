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
      "####################",
      "#..................#",
      "#....T........b....#",
      "#..................#",
      "#........,,,,,,,,,,,",
      "#..................#",
      "#....b.......T.....#",
      "#..................#",
      "####################",
    ],
  },

  player: { name: "Personaje", color: 0x3d6fb6, at: [3, 4] },

  actors: [
    // Forma simple de `talk`: qué diálogo abre según el paso (`default` para el resto).
    { id: "vecino", name: "Vecino", at: [8, 2], color: 0x8a5a3c, talk: { default: "saludo" } },
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
  ],

  steps: [
    { id: "intro", goal: { type: "auto" }, onStart: [{ type: "say", dialog: "intro" }] },
    { id: "hablar", objective: "Habla con el vecino", goal: { type: "talk", actor: "vecino" } },
    // Meta `flags`: se cumple cuando están marcadas todas, en cualquier orden. Aquí hay una sola;
    // con varias («toco-casa-1», «toco-casa-2»…), {n} y {total} muestran cuántas van.
    { id: "saludar", objective: "Saluda a la vecina ({n}/{total})", goal: { type: "flags", all: ["saludo-vecina"] } },
    { id: "salir", objective: "Sal por el camino", goal: { type: "reach", zone: { x: 18, y: 4, w: 2, h: 1 } } },
  ],

  dialogs: {
    intro: [{ who: "narrator", text: "Aquí empieza el capítulo." }],
    saludo: [
      { who: "vecino", text: "¡Hola!" },
      { who: "player", text: "¡Hola!" },
    ],
    vecina: [{ who: "vecina", text: "¡Qué gusto verte! Saluda a tu mamá de mi parte." }],
    "vecina-otra-vez": [{ who: "vecina", text: "¿No se te olvida algo? Ah, no: ya me saludaste." }],
  },

  ending: {
    verse: "Texto del versículo (NTV).",
    reference: "Libro 1:1",
    reflection: "Pregunta corta para pensar.",
  },
};

export default chapter;
