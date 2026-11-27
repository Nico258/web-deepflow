// Validador de capítulos: revisa el guion sin jugarlo y avisa de lo que haría que el
// capítulo falle o se quede trabado (un diálogo que no existe, un personaje sobre un árbol,
// una meta imposible…). Se corre en desarrollo al abrir un capítulo y en `pnpm test:novena`.
// Ver docs/specs/07-novena-interactiva.md §3.

import { DIRS, LETTERS, SOLID, inZone, same, toGrid } from "./map";
import { flagList, talkCases } from "./rules";
import type { Action, Chapter, Condition, Tile, Zone } from "./types";

export type ChapterReport = {
  /** Lo que rompe el capítulo o lo deja trabado. Hay que corregirlo. */
  errors: string[];
  /** Lo que probablemente es un descuido, pero no impide jugar. */
  warnings: string[];
};

const RESERVED = new Set(["player", "narrator"]);

export function validateChapter(chapter: Chapter): ChapterReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const grid = toGrid(chapter.map.rows);
  const height = grid.length;
  const width = grid[0]?.length ?? 0;

  const fmt = (t: Tile) => `[${t[0]}, ${t[1]}]`;
  const inside = (t: Tile) => t[0] >= 0 && t[1] >= 0 && t[0] < width && t[1] < height;
  const letter = (t: Tile) => (inside(t) ? grid[t[1]][t[0]] : "#");
  const zoneInside = (z: Zone) => z.w > 0 && z.h > 0 && inside([z.x, z.y]) && inside([z.x + z.w - 1, z.y + z.h - 1]);

  // ───────── Mapa ─────────
  if (!height || !width) errors.push("El mapa está vacío.");
  chapter.map.rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (!LETTERS.has(c)) errors.push(`Mapa: letra desconocida «${c}» en ${fmt([x, y])}. Leyenda en la spec 07 §4.`);
    }),
  );

  // ───────── Personajes ─────────
  const actors = new Map(chapter.actors.map((a) => [a.id, a]));
  const stepIds = new Set(chapter.steps.map((s) => s.id));
  const seenActors = new Set<string>();
  /** Banderas que algo marca (acciones o casos de `talk`) y banderas que algo pide. */
  const flagsSet = new Set<string>();
  const flagsRead = new Map<string, string>();
  const read = (flags: string[] | undefined, where: string) => flags?.forEach((f) => flagsRead.has(f) || flagsRead.set(f, where));
  const stepAllows = (cond: Condition | undefined, step: string) =>
    cond?.step === undefined || (Array.isArray(cond.step) ? cond.step : [cond.step]).includes(step);
  for (const a of chapter.actors) {
    const where = `Personaje «${a.id}»`;
    if (seenActors.has(a.id)) errors.push(`${where}: el id está repetido.`);
    seenActors.add(a.id);
    if (RESERVED.has(a.id)) errors.push(`${where}: «${a.id}» está reservado; usa otro id.`);
    if (!inside(a.at)) errors.push(`${where}: la casilla ${fmt(a.at)} está fuera del mapa.`);
    else if (!a.floating && SOLID.has(letter(a.at))) errors.push(`${where}: está sobre una casilla que no se puede pisar (${fmt(a.at)}, «${letter(a.at)}»).`);
    if (!a.floating && same(a.at, chapter.player.at)) errors.push(`${where}: está en la misma casilla que el jugador.`);
    if (Array.isArray(a.talk)) {
      const cases = a.talk;
      cases.forEach((c, i) => {
        const what = `${where}, caso ${i + 1} de \`talk\``;
        if (!chapter.dialogs[c.dialog]) errors.push(`${what}: abre el diálogo «${c.dialog}», que no existe.`);
        const steps = c.when?.step === undefined ? [] : Array.isArray(c.when.step) ? c.when.step : [c.when.step];
        for (const id of steps) if (!stepIds.has(id)) errors.push(`${what}: \`when.step\` usa «${id}», que no es un paso.`);
        if (!c.when && i < cases.length - 1) warnings.push(`${what}: no tiene \`when\`, así que los casos que siguen nunca se usan.`);
        read(c.when?.flags, what);
        read(c.when?.not, what);
        for (const f of [...flagList(c.set), ...flagList(c.unset)]) flagsSet.add(f);
      });
    } else
      for (const [key, dialog] of Object.entries(a.talk ?? {})) {
        if (!chapter.dialogs[dialog]) errors.push(`${where}: en el paso «${key}» abre el diálogo «${dialog}», que no existe.`);
        if (key !== "default" && !stepIds.has(key)) errors.push(`${where}: \`talk\` usa «${key}», que no es un paso ni «default».`);
      }
  }
  const solidActors = chapter.actors.filter((a) => !a.floating);
  solidActors.forEach((a, i) =>
    solidActors.slice(i + 1).forEach((b) => {
      if (same(a.at, b.at)) errors.push(`Personajes «${a.id}» y «${b.id}»: están en la misma casilla ${fmt(a.at)}.`);
    }),
  );

  // ───────── Jugador ─────────
  if (!inside(chapter.player.at)) errors.push(`Jugador: la casilla ${fmt(chapter.player.at)} está fuera del mapa.`);
  else if (SOLID.has(letter(chapter.player.at))) errors.push(`Jugador: empieza sobre una casilla que no se puede pisar (${fmt(chapter.player.at)}).`);

  // ───────── Diálogos ─────────
  for (const [id, lines] of Object.entries(chapter.dialogs)) {
    if (!lines.length) errors.push(`Diálogo «${id}»: no tiene líneas.`);
    lines.forEach((l, i) => {
      if (!RESERVED.has(l.who) && !actors.has(l.who)) errors.push(`Diálogo «${id}», línea ${i + 1}: habla «${l.who}», que no es un personaje, «player» ni «narrator».`);
      if (!l.text.trim()) errors.push(`Diálogo «${id}», línea ${i + 1}: el texto está vacío.`);
    });
  }

  // ───────── Ovejas ─────────
  const herd = chapter.herd;
  const hasHerdStep = chapter.steps.some((s) => s.goal.type === "herd");
  if (herd) {
    if (!herd.sheep.length) errors.push("Ovejas: `herd.sheep` está vacío.");
    if (!zoneInside(herd.pen)) errors.push("Ovejas: el corral (`herd.pen`) se sale del mapa.");
    if (herd.fleeRadius < 1) errors.push("Ovejas: `fleeRadius` debe ser 1 o más.");
    if (herd.paceMs !== undefined && herd.paceMs < 50) errors.push("Ovejas: `paceMs` es muy bajo (mínimo 50).");
    if (herd.homing !== undefined && (herd.homing < 0 || herd.homing > 1)) errors.push("Ovejas: `homing` va de 0 a 1.");
    if (herd.wander !== undefined && (herd.wander < 0 || herd.wander > 1)) errors.push("Ovejas: `wander` va de 0 a 1.");
    if (herd.helpAfterMs !== undefined && herd.helpAfterMs < 0) errors.push("Ovejas: `helpAfterMs` no puede ser negativo.");
    if (herd.helpRampMs !== undefined && herd.helpRampMs < 0) errors.push("Ovejas: `helpRampMs` no puede ser negativo.");
    if (herd.helpDialog && !chapter.dialogs[herd.helpDialog]) errors.push(`Ovejas: \`helpDialog\` abre el diálogo «${herd.helpDialog}», que no existe.`);
    herd.sheep.forEach((t, i) => {
      if (!inside(t) || SOLID.has(letter(t))) errors.push(`Oveja ${i + 1}: la casilla ${fmt(t)} no se puede pisar o está fuera del mapa.`);
      else if (inZone(t, herd.pen)) warnings.push(`Oveja ${i + 1}: ya empieza dentro del corral.`);
    });
    for (const g of herd.gate) if (letter(g) !== "g") errors.push(`Ovejas: la puerta ${fmt(g)} no es una casilla «g» en el mapa.`);
    if (!hasHerdStep) warnings.push("Ovejas: hay `herd` pero ningún paso con la meta `herd`.");
  } else if (hasHerdStep) errors.push("Hay un paso con la meta `herd`, pero el capítulo no tiene `herd`.");

  // ───────── Pasos ─────────
  // Se recorren en orden siguiendo quién está visible y si la puerta del corral está cerrada,
  // para revisar que cada meta se pueda cumplir en el momento en que llega.
  if (!chapter.steps.length) errors.push("El capítulo no tiene pasos.");
  const hidden = new Set(chapter.actors.filter((a) => a.hidden).map((a) => a.id));
  let gateClosed = false;
  const usedDialogs = new Set<string>();
  for (const a of chapter.actors) for (const c of talkCases(a)) usedDialogs.add(c.dialog);
  /** Banderas que ya están marcadas con seguridad al llegar a cada paso (por acciones, no por diálogos). */
  const flagsNow = new Set<string>();
  if (herd?.helpDialog) usedDialogs.add(herd.helpDialog);

  const blocked = (t: Tile) =>
    SOLID.has(letter(t)) ||
    (gateClosed && herd?.gate.some((g) => same(g, t))) ||
    chapter.actors.some((a) => !a.floating && !hidden.has(a.id) && same(a.at, t));

  /** Casillas a las que llega el jugador desde donde empieza (las ovejas se apartan). */
  const reachable = () => {
    const key = (t: Tile) => t[1] * width + t[0];
    const seen = new Set<number>();
    const queue: Tile[] = [];
    if (inside(chapter.player.at)) {
      seen.add(key(chapter.player.at));
      queue.push(chapter.player.at);
    }
    while (queue.length) {
      const cur = queue.shift()!;
      for (const [dx, dy] of DIRS) {
        const n: Tile = [cur[0] + dx, cur[1] + dy];
        if (!inside(n) || seen.has(key(n)) || blocked(n)) continue;
        seen.add(key(n));
        queue.push(n);
      }
    }
    return (t: Tile) => seen.has(key(t));
  };

  const runActions = (actions: Action[] | undefined, where: string) => {
    for (const a of actions ?? []) {
      switch (a.type) {
        case "say":
          usedDialogs.add(a.dialog);
          if (!chapter.dialogs[a.dialog]) errors.push(`${where}: \`say\` abre el diálogo «${a.dialog}», que no existe.`);
          break;
        case "show":
        case "hide":
          for (const id of Array.isArray(a.actor) ? a.actor : [a.actor]) {
            if (!actors.has(id)) errors.push(`${where}: \`${a.type}\` usa el personaje «${id}», que no existe.`);
            else if (a.type === "show") hidden.delete(id);
            else hidden.add(id);
          }
          break;
        case "set":
        case "unset":
          for (const f of flagList(a.flag)) {
            flagsSet.add(f);
            if (a.type === "set") flagsNow.add(f);
            else flagsNow.delete(f);
          }
          break;
        case "pan":
          if (!inside(a.to)) errors.push(`${where}: \`pan\` va a ${fmt(a.to)}, fuera del mapa.`);
          break;
        case "wait":
          if (a.ms < 0) errors.push(`${where}: \`wait\` tiene un tiempo negativo.`);
          break;
      }
    }
  };

  const seenSteps = new Set<string>();
  for (const step of chapter.steps) {
    const where = `Paso «${step.id}»`;
    if (seenSteps.has(step.id)) errors.push(`${where}: el id está repetido.`);
    seenSteps.add(step.id);
    if (step.goal.type !== "auto" && !step.objective) warnings.push(`${where}: no tiene \`objective\`; la persona no sabrá qué hacer.`);
    runActions(step.onStart, `${where} (onStart)`);

    const goal = step.goal;
    if (goal.type === "talk") {
      const actor = actors.get(goal.actor);
      if (!actor) errors.push(`${where}: la meta habla con «${goal.actor}», que no existe.`);
      else {
        if (hidden.has(actor.id)) errors.push(`${where}: hay que hablar con «${actor.id}», pero está oculto en ese momento.`);
        if (!talkCases(actor).some((c) => stepAllows(c.when, step.id)))
          errors.push(`${where}: «${actor.id}» no tiene diálogo para este paso (ni \`default\`), así que no se puede cumplir.`);
        const canReach = reachable();
        if (!DIRS.some(([dx, dy]) => canReach([actor.at[0] + dx, actor.at[1] + dy])))
          errors.push(`${where}: no hay forma de llegar al lado de «${actor.id}».`);
      }
    } else if (goal.type === "reach") {
      if (!zoneInside(goal.zone)) errors.push(`${where}: la zona se sale del mapa.`);
      else {
        const canReach = reachable();
        let ok = false;
        for (let x = goal.zone.x; x < goal.zone.x + goal.zone.w && !ok; x++)
          for (let y = goal.zone.y; y < goal.zone.y + goal.zone.h && !ok; y++) ok = canReach([x, y]);
        if (!ok) errors.push(`${where}: ninguna casilla de la zona se puede alcanzar.`);
      }
    } else if (goal.type === "herd") {
      gateClosed = true;
    } else if (goal.type === "flags") {
      if (!goal.all.length) errors.push(`${where}: la meta \`flags\` no pide ninguna bandera.`);
      read(goal.all, where);
      // Cada bandera que falta la tiene que poder marcar, en este paso, alguien visible y al alcance.
      const canReach = reachable();
      for (const f of goal.all) {
        if (flagsNow.has(f)) continue;
        const someone = chapter.actors.some(
          (a) =>
            !hidden.has(a.id) &&
            DIRS.some(([dx, dy]) => canReach([a.at[0] + dx, a.at[1] + dy])) &&
            talkCases(a).some((c) => stepAllows(c.when, step.id) && flagList(c.set).includes(f)),
        );
        if (!someone) errors.push(`${where}: la meta pide la bandera «${f}», pero en este paso nadie la marca al hablarle.`);
      }
      goal.all.forEach((f) => flagsNow.add(f));
    }

    runActions(step.onDone, `${where} (onDone)`);
  }

  for (const id of Object.keys(chapter.dialogs)) if (!usedDialogs.has(id)) warnings.push(`Diálogo «${id}»: nadie lo usa.`);
  for (const [f, where] of flagsRead) if (!flagsSet.has(f)) errors.push(`${where}: usa la bandera «${f}», pero nada la marca (\`set\`). ¿Está bien escrita?`);
  for (const f of flagsSet) if (!flagsRead.has(f)) warnings.push(`Bandera «${f}»: se marca, pero nada la usa (ni una meta \`flags\` ni un \`when\`).`);

  // ───────── Cierre ─────────
  const { verse, reference, reflection } = chapter.ending;
  if (!verse.trim() || !reference.trim() || !reflection.trim()) errors.push("Cierre: faltan el versículo, la referencia o la pregunta.");

  return { errors, warnings };
}
