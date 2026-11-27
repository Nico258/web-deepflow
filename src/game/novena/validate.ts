// Validador de capítulos: revisa el guion sin jugarlo y avisa de lo que haría que el
// capítulo falle o se quede trabado (un diálogo que no existe, un personaje sobre un árbol,
// una meta imposible…). Se corre en desarrollo al abrir un capítulo y en `pnpm test:novena`.
// Ver docs/specs/07-novena-interactiva.md §3.

import { DIRS, LETTERS, MAIN_MAP, SOLID, allMaps, inZone, mapOf, same, toGrid } from "./map";
import { caseSets, dialogChain, flagList, talkCases } from "./rules";
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
  const grids = new Map(allMaps(chapter).map(([id, m]) => [id, toGrid(m.rows)]));
  const fmt = (t: Tile) => `[${t[0]}, ${t[1]}]`;
  /** Cómo se nombra un mapa en los mensajes. */
  const mapLabel = (map: string) => (map === MAIN_MAP ? "el mapa" : `el mapa «${map}»`);
  const inside = (t: Tile, map = MAIN_MAP) => {
    const g = grids.get(map);
    return !!g && t[0] >= 0 && t[1] >= 0 && t[1] < g.length && t[0] < (g[0]?.length ?? 0);
  };
  const letter = (t: Tile, map = MAIN_MAP) => (inside(t, map) ? grids.get(map)![t[1]][t[0]] : "#");
  const zoneInside = (z: Zone, map = MAIN_MAP) => z.w > 0 && z.h > 0 && inside([z.x, z.y], map) && inside([z.x + z.w - 1, z.y + z.h - 1], map);

  // ───────── Mapas ─────────
  for (const [id, m] of allMaps(chapter)) {
    const name = id === MAIN_MAP ? "Mapa" : `Mapa «${id}»`;
    if (!m.rows.length || !m.rows.some((r) => r.length)) errors.push(`${name}: está vacío.`);
    m.rows.forEach((row, y) =>
      [...row].forEach((c, x) => {
        if (!LETTERS.has(c)) errors.push(`${name}: letra desconocida «${c}» en ${fmt([x, y])}. Leyenda en la spec 07 §4.`);
      }),
    );
  }

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
  const checkWhen = (cond: Condition | undefined, where: string) => {
    const steps = cond?.step === undefined ? [] : Array.isArray(cond.step) ? cond.step : [cond.step];
    for (const id of steps) if (!stepIds.has(id)) errors.push(`${where}: \`when.step\` usa «${id}», que no es un paso.`);
    read(cond?.flags, where);
    read(cond?.not, where);
  };
  for (const a of chapter.actors) {
    const where = `Personaje «${a.id}»`;
    if (seenActors.has(a.id)) errors.push(`${where}: el id está repetido.`);
    seenActors.add(a.id);
    if (RESERVED.has(a.id)) errors.push(`${where}: «${a.id}» está reservado; usa otro id.`);
    const am = a.map ?? MAIN_MAP;
    if (!grids.has(am)) errors.push(`${where}: está en el mapa «${am}», que no existe.`);
    else if (!inside(a.at, am)) errors.push(`${where}: la casilla ${fmt(a.at)} está fuera de ${mapLabel(am)}.`);
    else if (!a.floating && SOLID.has(letter(a.at, am))) errors.push(`${where}: está sobre una casilla que no se puede pisar (${fmt(a.at)}, «${letter(a.at, am)}»).`);
    if (!a.floating && am === MAIN_MAP && same(a.at, chapter.player.at)) errors.push(`${where}: está en la misma casilla que el jugador.`);
    if (Array.isArray(a.talk)) {
      const cases = a.talk;
      cases.forEach((c, i) => {
        const what = `${where}, caso ${i + 1} de \`talk\``;
        if (!chapter.dialogs[c.dialog]) errors.push(`${what}: abre el diálogo «${c.dialog}», que no existe.`);
        checkWhen(c.when, what);
        if (!c.when && i < cases.length - 1) warnings.push(`${what}: no tiene \`when\`, así que los casos que siguen nunca se usan.`);
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
      if ((a.map ?? MAIN_MAP) === (b.map ?? MAIN_MAP) && same(a.at, b.at)) errors.push(`Personajes «${a.id}» y «${b.id}»: están en la misma casilla ${fmt(a.at)}.`);
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
      if (!l.choices) return;
      const what = `Diálogo «${id}», línea ${i + 1}`;
      if (i < lines.length - 1) errors.push(`${what}: \`choices\` solo puede ir en la última línea del diálogo.`);
      if (!l.choices.length) errors.push(`${what}: \`choices\` está vacío.`);
      else if (l.choices.length === 1) warnings.push(`${what}: tiene una sola respuesta para elegir.`);
      l.choices.forEach((c, j) => {
        if (!c.text.trim()) errors.push(`${what}, respuesta ${j + 1}: el texto está vacío.`);
        if (c.next && !chapter.dialogs[c.next]) errors.push(`${what}, respuesta ${j + 1}: \`next\` abre el diálogo «${c.next}», que no existe.`);
        for (const f of [...flagList(c.set), ...flagList(c.unset)]) flagsSet.add(f);
      });
    });
  }

  // ───────── Salidas entre mapas ─────────
  const exitDialogs: string[] = [];
  for (const [id, m] of allMaps(chapter))
    (m.exits ?? []).forEach((e, i) => {
      const where = `${id === MAIN_MAP ? "Mapa" : `Mapa «${id}»`}, salida ${i + 1}`;
      if (!inside(e.at, id) || SOLID.has(letter(e.at, id))) errors.push(`${where}: la casilla ${fmt(e.at)} no se puede pisar o está fuera del mapa.`);
      if (!grids.has(e.to)) errors.push(`${where}: lleva al mapa «${e.to}», que no existe.`);
      else if (!inside(e.arrive, e.to) || SOLID.has(letter(e.arrive, e.to)))
        errors.push(`${where}: \`arrive\` ${fmt(e.arrive)} no se puede pisar o está fuera de ${mapLabel(e.to)}.`);
      else if (mapOf(chapter, e.to)?.exits?.some((x) => same(x.at, e.arrive)))
        warnings.push(`${where}: se llega justo sobre otra salida; al moverse se puede volver sin querer. Mejor una casilla al lado.`);
      checkWhen(e.when, where);
      if (e.closed) {
        exitDialogs.push(e.closed);
        if (!chapter.dialogs[e.closed]) errors.push(`${where}: \`closed\` abre el diálogo «${e.closed}», que no existe.`);
      }
    });

  // ───────── Lo que se lleva ─────────
  const itemFlags = new Set<string>();
  (chapter.items ?? []).forEach((item, i) => {
    const where = `Objeto que se lleva ${i + 1} (\`items\`)`;
    if (!item.name.trim()) errors.push(`${where}: no tiene nombre.`);
    if (!item.flag.trim()) errors.push(`${where}: no tiene bandera.`);
    else if (itemFlags.has(item.flag)) errors.push(`${where}: la bandera «${item.flag}» ya es de otro objeto.`);
    itemFlags.add(item.flag);
    read([item.flag], `${where}, «${item.name}»`);
    if (!item.hint?.trim()) warnings.push(`${where}, «${item.name}»: no tiene \`hint\`; al tocarlo no dirá para qué sirve.`);
  });

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
  for (const d of exitDialogs) usedDialogs.add(d);
  /** Dónde está el jugador al llegar a cada paso: cambia con `travel`, `move` y al cumplir una meta `reach`. */
  let playerAt: { map: string; tile: Tile } = { map: MAIN_MAP, tile: chapter.player.at };
  /** Dónde está cada personaje (cambia con `move`) y quiénes acompañan al jugador (`join`). */
  const pos = new Map(chapter.actors.map((a) => [a.id, { map: a.map ?? MAIN_MAP, tile: a.at }]));
  const party = new Set<string>();

  const blocked = (t: Tile, map: string) =>
    SOLID.has(letter(t, map)) ||
    (map === MAIN_MAP && gateClosed && herd?.gate.some((g) => same(g, t))) ||
    chapter.actors.some((a) => {
      const at = pos.get(a.id)!;
      return !a.floating && !hidden.has(a.id) && !party.has(a.id) && at.map === map && same(at.tile, t);
    });

  /**
   * Casillas a las que llega el jugador desde donde está (las ovejas se apartan), pasando por las
   * salidas entre mapas (aunque tengan `when`: se supone que en algún momento se abren).
   */
  const reachable = () => {
    const key = (map: string, t: Tile) => `${map}:${t[0]},${t[1]}`;
    const seen = new Set<string>();
    const queue: { map: string; tile: Tile }[] = [];
    const visit = (map: string, t: Tile) => {
      if (!inside(t, map) || seen.has(key(map, t)) || blocked(t, map)) return;
      seen.add(key(map, t));
      queue.push({ map, tile: t });
    };
    visit(playerAt.map, playerAt.tile);
    while (queue.length) {
      const { map, tile } = queue.shift()!;
      for (const [dx, dy] of DIRS) visit(map, [tile[0] + dx, tile[1] + dy]);
      for (const e of mapOf(chapter, map)?.exits ?? []) if (same(e.at, tile) && grids.has(e.to)) visit(e.to, e.arrive);
    }
    return (t: Tile, map = MAIN_MAP) => seen.has(key(map, t));
  };
  /** Si se puede llegar al lado de un personaje (a quien acompaña al jugador, siempre). */
  const besideReachable = (a: Chapter["actors"][number], canReach: ReturnType<typeof reachable>) => {
    const at = pos.get(a.id)!;
    return party.has(a.id) || DIRS.some(([dx, dy]) => canReach([at.tile[0] + dx, at.tile[1] + dy], at.map));
  };

  /**
   * Revisa acciones. Con `simulate` (las de los pasos, que pasan en orden) además lleva la cuenta
   * de quién se ve y qué banderas ya están marcadas; las de `do` en `talk` pasan cuando la persona
   * quiera, así que solo se revisa que lo que usan exista.
   */
  const runActions = (actions: Action[] | undefined, where: string, simulate = true) => {
    for (const a of actions ?? []) {
      checkWhen(a.when, `${where}, \`${a.type}\``);
      switch (a.type) {
        case "say":
          usedDialogs.add(a.dialog);
          if (!chapter.dialogs[a.dialog]) errors.push(`${where}: \`say\` abre el diálogo «${a.dialog}», que no existe.`);
          break;
        case "show":
        case "hide":
          for (const id of Array.isArray(a.actor) ? a.actor : [a.actor]) {
            if (!actors.has(id)) errors.push(`${where}: \`${a.type}\` usa el personaje «${id}», que no existe.`);
            else if (!simulate) continue;
            else if (a.type === "show") hidden.delete(id);
            else hidden.add(id);
          }
          break;
        case "set":
        case "unset":
          // Con `when` no es seguro que se marque: no cuenta como ya marcada.
          for (const f of flagList(a.flag)) {
            flagsSet.add(f);
            if (!simulate) continue;
            if (a.type === "set" && !a.when) flagsNow.add(f);
            else flagsNow.delete(f);
          }
          break;
        case "pan":
          if (simulate && !inside(a.to, playerAt.map)) errors.push(`${where}: \`pan\` va a ${fmt(a.to)}, fuera de ${mapLabel(playerAt.map)}.`);
          break;
        case "travel":
          if (!grids.has(a.map)) errors.push(`${where}: \`travel\` va al mapa «${a.map}», que no existe.`);
          else if (!inside(a.at, a.map) || SOLID.has(letter(a.at, a.map)))
            errors.push(`${where}: \`travel\` lleva a ${fmt(a.at)}, que no se puede pisar o está fuera de ${mapLabel(a.map)}.`);
          else if (simulate && !a.when) {
            playerAt = { map: a.map, tile: a.at };
            for (const id of party) pos.set(id, { map: a.map, tile: a.at });
          }
          break;
        case "move": {
          const at = a.actor === "player" ? playerAt : pos.get(a.actor);
          if (!at) {
            errors.push(`${where}: \`move\` usa el personaje «${a.actor}», que no existe.`);
            break;
          }
          const floating = actors.get(a.actor)?.floating;
          if (!inside(a.to, at.map) || (!floating && SOLID.has(letter(a.to, at.map))))
            errors.push(`${where}: \`move\` lleva a «${a.actor}» a ${fmt(a.to)}, que no se puede pisar o está fuera de ${mapLabel(at.map)}.`);
          else if (simulate && !a.when) {
            if (a.actor === "player") playerAt = { map: at.map, tile: a.to };
            else {
              pos.set(a.actor, { map: at.map, tile: a.to });
              party.delete(a.actor);
            }
          }
          if (a.ms !== undefined && a.ms < 0) errors.push(`${where}: \`move\` tiene un tiempo negativo.`);
          break;
        }
        case "join":
        case "leave":
          if (!actors.has(a.actor)) errors.push(`${where}: \`${a.type}\` usa el personaje «${a.actor}», que no existe.`);
          else if (simulate && a.type === "join") party.add(a.actor);
          else if (simulate) party.delete(a.actor);
          break;
        case "zoom":
          if (!(a.to > 0 && a.to <= 4)) errors.push(`${where}: \`zoom\` va de más de 0 a 4 (1 es lo normal).`);
          if (a.ms !== undefined && a.ms < 0) errors.push(`${where}: \`zoom\` tiene un tiempo negativo.`);
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
    if (step.hint !== undefined && !step.hint.trim()) errors.push(`${where}: \`hint\` está vacío.`);
    if (step.goal.type === "auto" && step.hint) warnings.push(`${where}: tiene \`hint\`, pero la meta es \`auto\` y nunca se ve.`);
    runActions(step.onStart, `${where} (onStart)`);

    const goal = step.goal;
    if (goal.type === "talk") {
      const actor = actors.get(goal.actor);
      if (!actor) errors.push(`${where}: la meta habla con «${goal.actor}», que no existe.`);
      else {
        if (hidden.has(actor.id)) errors.push(`${where}: hay que hablar con «${actor.id}», pero está oculto en ese momento.`);
        if (!talkCases(actor).some((c) => stepAllows(c.when, step.id)))
          errors.push(`${where}: «${actor.id}» no tiene diálogo para este paso (ni \`default\`), así que no se puede cumplir.`);
        if (!besideReachable(actor, reachable())) errors.push(`${where}: no hay forma de llegar al lado de «${actor.id}».`);
      }
    } else if (goal.type === "reach") {
      const map = goal.map ?? MAIN_MAP;
      if (!grids.has(map)) errors.push(`${where}: la zona está en el mapa «${map}», que no existe.`);
      else if (!zoneInside(goal.zone, map)) errors.push(`${where}: la zona se sale de ${mapLabel(map)}.`);
      else {
        const canReach = reachable();
        let found: Tile | undefined;
        for (let x = goal.zone.x; x < goal.zone.x + goal.zone.w && !found; x++)
          for (let y = goal.zone.y; y < goal.zone.y + goal.zone.h && !found; y++) if (canReach([x, y], map)) found = [x, y];
        if (!found) errors.push(`${where}: ninguna casilla de la zona se puede alcanzar.`);
        else playerAt = { map, tile: found };
      }
    } else if (goal.type === "herd") {
      gateClosed = true;
    } else if (goal.type === "flags") {
      if (!goal.all.length) errors.push(`${where}: la meta \`flags\` no pide ninguna bandera.`);
      read(goal.all, where);
      // Cada bandera que falta la tiene que poder marcar, en este paso, alguien visible y al alcance
      // (al hablarle o con una respuesta de su diálogo), o una respuesta de un diálogo de `onStart`.
      const canReach = reachable();
      const fromStart = (step.onStart ?? []).flatMap((a) => (a.type === "say" ? caseSets(chapter.dialogs, { dialog: a.dialog }) : []));
      for (const f of goal.all) {
        if (flagsNow.has(f) || fromStart.includes(f)) continue;
        const someone = chapter.actors.some(
          (a) =>
            !hidden.has(a.id) &&
            besideReachable(a, canReach) &&
            talkCases(a).some((c) => stepAllows(c.when, step.id) && caseSets(chapter.dialogs, c).includes(f)),
        );
        if (!someone) errors.push(`${where}: la meta pide la bandera «${f}», pero en este paso nadie a quien se pueda llegar la marca (ni al hablarle ni con una respuesta).`);
      }
      goal.all.forEach((f) => flagsNow.add(f));
    }

    runActions(step.onDone, `${where} (onDone)`);
  }

  for (const a of chapter.actors)
    if (Array.isArray(a.talk)) a.talk.forEach((c, i) => runActions(c.do, `Personaje «${a.id}», caso ${i + 1} de \`talk\` (do)`, false));

  // Los diálogos que se abren con el `next` de una respuesta también cuentan como usados.
  for (const id of [...usedDialogs]) for (const d of dialogChain(chapter.dialogs, id)) usedDialogs.add(d);
  for (const id of Object.keys(chapter.dialogs)) if (!usedDialogs.has(id)) warnings.push(`Diálogo «${id}»: nadie lo usa.`);
  for (const [f, where] of flagsRead) if (!flagsSet.has(f)) errors.push(`${where}: usa la bandera «${f}», pero nada la marca (\`set\`). ¿Está bien escrita?`);
  for (const f of flagsSet) if (!flagsRead.has(f)) warnings.push(`Bandera «${f}»: se marca, pero nada la usa (ni una meta \`flags\`, ni un \`when\`, ni un objeto de \`items\`).`);

  // ───────── Cierre ─────────
  const { verse, reference, reflection } = chapter.ending;
  if (!verse.trim() || !reference.trim() || !reflection.trim()) errors.push("Cierre: faltan el versículo, la referencia o la pregunta.");

  return { errors, warnings };
}
