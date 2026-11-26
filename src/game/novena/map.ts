// Leyenda de los mapas en texto (spec 07 §4). La usan el motor y el validador;
// no importa Phaser para que el validador funcione también fuera del navegador.

import type { Tile, Zone } from "./types";

/** Todas las letras válidas de un mapa. */
export const LETTERS = new Set([".", ",", "_", "g", "#", "T", "b", "f", "~", "*"]);

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
