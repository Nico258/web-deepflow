// Formato de un capítulo de la novena. Un capítulo es solo datos: el motor
// (chapter-scene.ts) es el mismo para todos. Ver docs/specs/07-novena-interactiva.md §3.

/** Casilla del mapa: [columna, fila], contadas desde 0 en la esquina superior izquierda. */
export type Tile = [number, number];

/** Rectángulo de casillas, con los bordes incluidos. */
export type Zone = { x: number; y: number; w: number; h: number };

export type Lighting = "day" | "night" | "glory";

/** Quién dice una línea: el id de un personaje, "player" o "narrator". */
export type Line = { who: string; text: string };

export type Action =
  | { type: "say"; dialog: string }
  /** Uno o varios personajes a la vez. */
  | { type: "show"; actor: string | string[] }
  | { type: "hide"; actor: string | string[] }
  | { type: "flash"; color?: number }
  | { type: "lighting"; mode: Lighting }
  | { type: "pan"; to: Tile; ms?: number }
  | { type: "follow" }
  | { type: "wait"; ms: number }
  | { type: "sfx"; key: string };

export type Goal =
  | { type: "auto" }
  | { type: "talk"; actor: string }
  | { type: "reach"; zone: Zone }
  | { type: "herd" };

export type Step = {
  id: string;
  /** Lo que se ve arriba como objetivo. En `herd`, {n} y {total} se reemplazan por el conteo. */
  objective?: string;
  goal: Goal;
  onStart?: Action[];
  onDone?: Action[];
};

export type Actor = {
  id: string;
  /** Se ve en los diálogos y encima del personaje cuando el jugador está a 3 casillas o menos. */
  name: string;
  at: Tile;
  /** Color del cuadro mientras no haya sprite. */
  color: number;
  /** Empieza oculto hasta una acción `show`. */
  hidden?: boolean;
  /** Flota y no bloquea el paso (ángeles). No lleva nombre encima: se presenta en el diálogo. */
  floating?: boolean;
  /** Qué diálogo abre al hablarle, según el id del paso actual; `default` para el resto. */
  talk?: Record<string, string>;
};

/**
 * Minijuego de reunir ovejas (meta `herd`). Las ovejas huyen del jugador: hay que ponerse
 * detrás de ellas para empujarlas hacia la puerta del corral. Ver spec 07 §3.
 */
export type HerdConfig = {
  /** Dónde empieza cada oveja. */
  sheep: Tile[];
  /** Interior del corral. */
  pen: Zone;
  /** Casillas de la puerta, que pasan a ser cerca al cerrar. */
  gate: Tile[];
  /** A cuántas casillas del jugador (contando en línea recta, sin diagonales) se asustan y se alejan. Recomendado: 3. */
  fleeRadius: number;
  /** Cada cuántos milisegundos decide una oveja si da un paso. Más alto, más lentas. Por defecto 320. */
  paceMs?: number;
  /**
   * De 0 a 1: al huir, cuánto prefieren el lado del corral cuando tienen dos caminos parecidos.
   * Con 0 solo huyen del jugador. Es el valor del principio: la ayuda lo sube con el tiempo. Por defecto 0,2.
   */
  homing?: number;
  /**
   * Ayuda para que nadie se quede trabado. Pasado este tiempo en el paso `herd`, la tendencia a huir
   * hacia el corral empieza a crecer. Solo actúa cuando el jugador se acerca a una oveja: ninguna vuelve
   * sola. En milisegundos; 0 la desactiva. Por defecto 45000 (45 s).
   */
  helpAfterMs?: number;
  /** Cuánto tarda la ayuda en llegar al máximo, en milisegundos. Por defecto 60000 (1 min). */
  helpRampMs?: number;
  /** De 0 a 1: probabilidad de que una oveja tranquila dé un paso en cada `paceMs` (pasta cerca de donde la dejaron). Por defecto 0.2. */
  wander?: number;
  /** Diálogo que se abre una vez cuando empieza la ayuda, para contar qué pasa. */
  helpDialog?: string;
};

export type Chapter = {
  map: { rows: string[]; lighting: Lighting };
  player: { name: string; color: number; at: Tile };
  actors: Actor[];
  dialogs: Record<string, Line[]>;
  steps: Step[];
  herd?: HerdConfig;
  ending: { verse: string; reference: string; reflection: string };
};

/** Datos del capítulo que se ven en el mapa general. */
export type ChapterInfo = {
  number: number;
  /** Para el capítulo extra. */
  bonus?: boolean;
  slug: string;
  title: string;
  place: string;
  playAs: string;
  passage: string;
  summary: string;
  /** Posición del lugar en el mapa general, en porcentaje. */
  mapAt: { x: number; y: number };
  /** Carga el guion del capítulo. Si no existe, el capítulo sale como «Próximamente». */
  load?: () => Promise<Chapter>;
};
