// Reglas de banderas y de qué dice cada personaje, sin Phaser: las usan el motor y el validador.
// Ver docs/specs/07-novena-interactiva.md §3.

import type { Actor, Condition, Flags, TalkCase } from "./types";

/** Una bandera o varias, siempre como lista. */
export const flagList = (f: Flags | undefined): string[] => (f === undefined ? [] : Array.isArray(f) ? f : [f]);

/** Los casos de `talk` de un personaje. La forma simple se convierte en casos por paso, con `default` al final. */
export function talkCases(actor: Actor): TalkCase[] {
  const talk = actor.talk;
  if (!talk) return [];
  if (Array.isArray(talk)) return talk;
  const cases: TalkCase[] = Object.entries(talk)
    .filter(([key]) => key !== "default")
    .map(([key, dialog]) => ({ when: { step: key }, dialog }));
  if (talk.default) cases.push({ dialog: talk.default });
  return cases;
}

/** Si una condición se cumple en este paso y con estas banderas. Sin condición, siempre. */
export function matches(cond: Condition | undefined, step: string | undefined, flags: ReadonlySet<string>): boolean {
  if (!cond) return true;
  if (cond.step !== undefined && !(Array.isArray(cond.step) ? cond.step : [cond.step]).includes(step ?? "")) return false;
  if (cond.flags?.some((f) => !flags.has(f))) return false;
  if (cond.not?.some((f) => flags.has(f))) return false;
  return true;
}

/** El caso que toca ahora: el primero cuya condición se cumple. */
export const currentTalk = (actor: Actor, step: string | undefined, flags: ReadonlySet<string>) =>
  talkCases(actor).find((c) => matches(c.when, step, flags));
