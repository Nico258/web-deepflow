import type { Chapter } from "@/game/novena/types";

// Capítulo 8 · Los pastores y los ángeles (Lucas 2:8-15).
// Es el capítulo de ejemplo: úsalo como molde para los demás (ver _plantilla.ts y la spec 07 §3).
//
// Las palabras del ángel y de los ángeles son de la Nueva Traducción Viviente (NTV).

const chapter: Chapter = {
  map: {
    lighting: "night",
    // Campos a las afueras de Belén. El corral está a la izquierda, la fogata en el centro
    // y el camino a Belén sale por la derecha. Leyenda de letras en la spec 07 §4.
    rows: [
      "########################################",
      "#...T.....b.........T......##.....T....#",
      "#.......T.......b.........T.#.......b..#",
      "#..b..........................T........#",
      "#........##........T...............T...#",
      "#...T....#....b...........b............#",
      "#.....................................T#",
      "#.b..........T.............T...........#",
      "#..ffffffffff..........................#",
      "#..f........f..................b.......#",
      "#..f........f..........................#",
      "#..f........g.........................,,",
      "#..f........g,,,,,,*,,,,,,,,,,,,,,,,,,,,",
      "#..f........g.........................,,",
      "#..f........f....................~.....#",
      "#..f........f...........T.......~......#",
      "#..f........f....b.............~.....T.#",
      "#..ffffffffff..................~.......#",
      "#..............T...............~.##....#",
      "#...................b..........~..#....#",
      "#......b.......................~.......#",
      "#....#.........................~.......#",
      "#...............##...........b.~.......#",
      "#.T...................T........~.......#",
      "#..........T...................~.......#",
      "########################################",
    ],
  },

  player: { name: "Eliel", color: 0x3d6fb6, at: [21, 11] },

  actors: [
    {
      id: "ruben",
      name: "Abuelo Rubén",
      at: [18, 13],
      color: 0x8a5a3c,
      talk: { "hablar-ruben": "ruben-encargo", rebano: "ruben-pista", default: "ruben-espera" },
    },
    {
      id: "tamar",
      name: "Tamar",
      at: [21, 13],
      color: 0xb5487a,
      talk: { "hablar-ruben": "tamar-inicio", rebano: "tamar-rebano", default: "tamar-espera" },
    },
    { id: "angel", name: "Ángel", at: [19, 8], color: 0xfffbe8, hidden: true, floating: true },
    { id: "coro", name: "Ángeles", at: [14, 6], color: 0xfff4d6, hidden: true, floating: true },
    { id: "coro2", name: "", at: [24, 6], color: 0xfff4d6, hidden: true, floating: true },
    { id: "coro3", name: "", at: [16, 4], color: 0xfff4d6, hidden: true, floating: true },
    { id: "coro4", name: "", at: [22, 4], color: 0xfff4d6, hidden: true, floating: true },
    { id: "coro5", name: "", at: [11, 9], color: 0xfff4d6, hidden: true, floating: true },
    { id: "coro6", name: "", at: [27, 9], color: 0xfff4d6, hidden: true, floating: true },
  ],

  herd: {
    sheep: [
      [7, 3],
      [22, 4],
      [33, 8],
      [25, 20],
      [9, 22],
    ],
    pen: { x: 4, y: 9, w: 8, h: 8 },
    gate: [
      [12, 11],
      [12, 12],
      [12, 13],
    ],
    fleeRadius: 3,
    // Si a los 45 segundos faltan ovejas, empiezan a hacer más caso al acercarse (ver HerdConfig en types.ts).
    helpDialog: "ovejas-ayuda",
  },

  steps: [
    { id: "intro", goal: { type: "auto" }, onStart: [{ type: "say", dialog: "intro" }] },
    {
      id: "hablar-ruben",
      objective: "Habla con el abuelo Rubén, junto a la fogata",
      hint: "Rubén está junto a la fogata, en el centro del campamento. Tócalo para ir a hablarle.",
      goal: { type: "talk", actor: "ruben" },
    },
    {
      id: "rebano",
      objective: "Lleva las ovejas al corral ({n}/{total})",
      hint: "Las ovejas huyen de ti: ponte del lado contrario al corral y empújalas hacia la puerta. Las flechas del borde señalan las que faltan.",
      goal: { type: "herd" },
      onDone: [{ type: "say", dialog: "corral-listo" }],
    },
    {
      id: "volver",
      objective: "Vuelve a la fogata",
      hint: "La fogata está en el centro del campamento: busca el brillo naranja.",
      goal: { type: "reach", zone: { x: 16, y: 10, w: 7, h: 5 } },
      onDone: [
        { type: "say", dialog: "fogata" },
        { type: "wait", ms: 500 },
        { type: "pan", to: [19, 9], ms: 1200 },
        { type: "lighting", mode: "glory" },
        { type: "flash" },
        { type: "show", actor: "angel" },
        { type: "say", dialog: "anuncio" },
        { type: "flash", color: 0xfff1c4 },
        { type: "show", actor: ["coro", "coro2", "coro3", "coro4", "coro5", "coro6"] },
        { type: "say", dialog: "gloria" },
        { type: "wait", ms: 600 },
        { type: "hide", actor: ["angel", "coro", "coro2", "coro3", "coro4", "coro5", "coro6"] },
        { type: "lighting", mode: "night" },
        { type: "follow" },
        { type: "say", dialog: "despues" },
      ],
    },
    {
      id: "a-belen",
      objective: "Ve a Belén por el camino del este",
      hint: "Sigue el camino de tierra hasta el borde derecho del mapa.",
      goal: { type: "reach", zone: { x: 38, y: 11, w: 2, h: 3 } },
      onDone: [{ type: "say", dialog: "salida" }],
    },
  ],

  dialogs: {
    intro: [
      { who: "narrator", text: "Campos a las afueras de Belén. Es de noche y hace frío." },
      { who: "narrator", text: "Eliel tiene catorce años, y esta es su primera noche cuidando el rebaño con los grandes." },
    ],
    "tamar-inicio": [
      { who: "tamar", text: "El abuelo te está buscando. Creo que alguien perdió unas ovejas…" },
      { who: "tamar", text: "…y no fui yo." },
    ],
    "ruben-encargo": [
      { who: "ruben", text: "¡Eliel! Ya te iba a mandar a buscar. Conté el rebaño y faltan cinco ovejas." },
      { who: "player", text: "¿Cinco? Pero si hace un rato estaban todas…" },
      { who: "ruben", text: "Las ovejas no se escapan, muchacho. Se distraen. Una hierbita por aquí, otra por allá… y cuando se dan cuenta, ya están lejos." },
      { who: "ruben", text: "Llévalas al corral. Y un consejo: no las persigas de frente. Ponte detrás de ellas y empújalas hacia donde quieres que vayan." },
      { who: "player", text: "Por detrás, no de frente. Entendido." },
    ],
    "ruben-pista": [
      { who: "ruben", text: "Ponte detrás de ellas. Si las persigues de frente, se te van para el otro lado." },
      { who: "ruben", text: "La puerta del corral está a la izquierda, mirando hacia la fogata." },
    ],
    "tamar-rebano": [
      { who: "tamar", text: "¿Cinco ovejas? Ay, primo, ¿no que eras el mejor pastor de Belén?" },
      { who: "player", text: "Yo nunca dije eso." },
      { who: "tamar", text: "Lo dijo tu mamá. En todo el mercado." },
    ],
    "ovejas-ayuda": [
      { who: "narrator", text: "En el corral, las ovejas que ya volvieron empiezan a balar." },
      { who: "narrator", text: "Las que faltan las escuchan. Acércate a ellas: cada vez te harán más caso." },
    ],
    "corral-listo": [
      { who: "narrator", text: "La puerta del corral se cierra. Todas las ovejas están a salvo." },
      { who: "player", text: "Cinco de cinco. Ahora sí, a calentarme en la fogata." },
    ],
    "ruben-espera": [{ who: "ruben", text: "Anda, muchacho. Belén queda por el camino del este." }],
    "tamar-espera": [{ who: "tamar", text: "¿Qué esperas? ¡Corre! Yo voy detrás de ti." }],
    fogata: [
      { who: "ruben", text: "Bien hecho, muchacho." },
      { who: "tamar", text: "Abuelo, en el pueblo dicen que los pastores somos lo último. Que olemos a oveja y que nadie importante se acordaría de nosotros." },
      { who: "ruben", text: "La gente dice muchas cosas." },
      { who: "ruben", text: "Mi abuelo me contaba lo que escribió el profeta Miqueas: que de Belén, este pueblito, saldría alguien que guiaría al pueblo de Dios como un pastor." },
      { who: "player", text: "¿Como un pastor? ¿Como nosotros?" },
      { who: "ruben", text: "Como nosotros. Llevamos siglos esperándolo." },
      { who: "tamar", text: "Pues ojalá llegue pronto. Y que traiga cobijas." },
    ],
    anuncio: [
      { who: "narrator", text: "De repente, la noche se llena de luz." },
      { who: "player", text: "¿Qué… qué es eso?" },
      { who: "angel", text: "No tengan miedo. Les traigo buenas noticias que darán gran alegría a toda la gente." },
      { who: "angel", text: "¡El Salvador —sí, el Mesías, el Señor— ha nacido hoy en Belén, la ciudad de David!" },
      { who: "angel", text: "Y lo reconocerán por la siguiente señal: encontrarán a un niño envuelto en tiras de tela, acostado en un pesebre." },
    ],
    gloria: [
      { who: "narrator", text: "Y de pronto, una multitud de ángeles llena el cielo." },
      { who: "coro", text: "Gloria a Dios en el cielo más alto y paz en la tierra para aquellos en quienes Dios se complace." },
    ],
    despues: [
      { who: "tamar", text: "Primo. Dime que tú también viste eso." },
      { who: "player", text: "Lo vi. Lo vi y lo escuché." },
      { who: "ruben", text: "Un pesebre… El Mesías, en un pesebre. Como el de nuestros animales." },
      { who: "ruben", text: "¿Y a quién se lo vinieron a contar primero? A unos pastores, en el turno de la noche." },
      { who: "player", text: "¡Vamos a Belén a ver esto que el Señor nos anunció!" },
      { who: "ruben", text: "Ve tú adelante, muchacho. Estas piernas viejas te alcanzan." },
    ],
    salida: [
      { who: "narrator", text: "Eliel corre por el camino. A lo lejos se ven las luces de Belén." },
      { who: "narrator", text: "La historia continúa en el capítulo 9: El establo." },
    ],
  },

  ending: {
    verse:
      "«No tengan miedo —dijo—. Les traigo buenas noticias que darán gran alegría a toda la gente. ¡El Salvador —sí, el Mesías, el Señor— ha nacido hoy en Belén, la ciudad de David!»",
    reference: "Lucas 2:10-11",
    reflection:
      "Dios le dio la mejor noticia de la historia primero a unos pastores a los que muchos despreciaban. ¿En qué parte de tu vida te cuesta creer que Dios quiere encontrarte?",
  },
};

export default chapter;
