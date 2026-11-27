// Leyenda de los mapas en texto (spec 07 §4). La usan el motor y el validador;
// no importa Phaser para que el validador funcione también fuera del navegador.

import type { Chapter, GameMap, Tile, Zone } from "./types";

/** Todas las letras válidas de un mapa. */
export const LETTERS = new Set([".", ",", "_", "g", "d", "#", "T", "b", "f", "~", "*"]);

/** Id del mapa principal (`chapter.map`). */
export const MAIN_MAP = "main";

/** Un mapa del capítulo por su id: "main" es `chapter.map`; los demás están en `chapter.maps`. */
export const mapOf = (chapter: Chapter, id: string): GameMap | undefined => (id === MAIN_MAP ? chapter.map : chapter.maps?.[id]);

/** Todos los mapas del capítulo, empezando por el principal. */
export const allMaps = (chapter: Chapter): [string, GameMap][] => [[MAIN_MAP, chapter.map], ...Object.entries(chapter.maps ?? {})];

/** Letras que no se pueden pisar. */
export const SOLID = new Set(["#", "T", "b", "f", "~", "*"]);

/** Las filas pueden tener distinto largo: se completan con `#`. */
export function toGrid(rows: string[]) {
  const width = Math.max(0, ...rows.map((r) => r.length));
  return rows.map((r) => r.padEnd(width, "#").split(""));
}

export const DIRS: Tile[] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

export const same = (a: Tile, b: Tile) => a[0] === b[0] && a[1] === b[1];
export const manhattan = (a: Tile, b: Tile) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
export const inZone = (t: Tile, z: Zone) => t[0] >= z.x && t[0] < z.x + z.w && t[1] >= z.y && t[1] < z.y + z.h;
