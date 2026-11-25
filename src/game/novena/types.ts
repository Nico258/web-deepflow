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
  name: string;
  at: Tile;
  /** Color del cuadro mientras no haya sprite. */
  color: number;
  /** Empieza oculto hasta una acción `show`. */
  hidden?: boolean;
  /** Flota y no bloquea el paso (ángeles). */
  floating?: boolean;
  /** Qué diálogo abre al hablarle, según el id del paso actual; `default` para el resto. */
  talk?: Record<string, string>;
};

export type HerdConfig = {
  /** Dónde empieza cada oveja. */
  sheep: Tile[];
  /** Interior del corral. */
  pen: Zone;
  /** Casillas de la puerta, que pasan a ser cerca al cerrar. */
  gate: Tile[];
  /** A cuántas casillas del jugador se asustan y se alejan. */
  fleeRadius: number;
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
