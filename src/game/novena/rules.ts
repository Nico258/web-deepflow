// Reglas de banderas y de qué dice cada personaje, sin Phaser: las usan el motor y el validador.
// Ver docs/specs/07-novena-interactiva.md §3.

import type { Actor, Condition, Flags, Line, TalkCase } from "./types";

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

/** Las elecciones con que termina un diálogo (vacío si no termina en una elección). */
export const choicesOf = (lines: Line[] | undefined) => lines?.[lines.length - 1]?.choices ?? [];

/** Los diálogos a los que se llega desde uno siguiendo el `next` de sus elecciones, incluido él. */
export function dialogChain(dialogs: Record<string, Line[]>, id: string): Set<string> {
  const seen = new Set<string>();
  const queue = [id];
  while (queue.length) {
    const cur = queue.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const c of choicesOf(dialogs[cur])) if (c.next) queue.push(c.next);
  }
  return seen;
}

/**
 * Banderas que puede marcar hablar con alguien en un caso: las del caso, las de sus acciones `do`
 * y las de cualquier elección de los diálogos que se abren (y de los que siguen).
 */
export function caseSets(dialogs: Record<string, Line[]>, c: TalkCase): string[] {
  const actions = c.do ?? [];
  const said = [c.dialog, ...actions.flatMap((a) => (a.type === "say" ? [a.dialog] : []))];
  const fromChoices = said.flatMap((id) => [...dialogChain(dialogs, id)].flatMap((d) => choicesOf(dialogs[d]).flatMap((ch) => flagList(ch.set))));
  const fromActions = actions.flatMap((a) => (a.type === "set" ? flagList(a.flag) : []));
  return [...flagList(c.set), ...fromActions, ...fromChoices];
}
