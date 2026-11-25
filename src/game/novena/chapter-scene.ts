import * as Phaser from "phaser";
import type { NovenaBus, ResolvedLine } from "./bus";
import type { Action, Actor, Chapter, Lighting, Step, Tile, Zone } from "./types";

// Motor de un capítulo. Lee el guion (src/data/novena/capitulos/*) y lo vuelve jugable:
// dibuja el mapa, mueve al jugador por casillas, recorre los pasos y le pide a React
// que muestre diálogos y objetivos. No sabe nada de ningún capítulo en particular.
//
// Mientras no haya arte, todo se dibuja con figuras de colores. Cuando llegue el arte,
// lo que cambia es drawMap() y makeFigure(); el resto del motor sigue igual.

export const TILE = 16;
const STEP_MS = 150;
const SHEEP_STEP_MS = 220;
const SHEEP_TICK_MS = 300;

const SOLID = new Set(["#", "T", "b", "f", "~", "*"]);
const GROUND: Record<string, number> = { ",": 0xb89c6a, g: 0xb89c6a, _: 0xa9a294, "#": 0x77736c, "~": 0x3f73a6 };
const GRASS = 0x6f9a4f;

const LIGHT: Record<Lighting, { color: number; alpha: number }> = {
  day: { color: 0x000000, alpha: 0 },
  night: { color: 0x0a1430, alpha: 0.58 },
  glory: { color: 0xfff1c4, alpha: 0.22 },
};

const DIRS: Tile[] = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
];

const same = (a: Tile, b: Tile) => a[0] === b[0] && a[1] === b[1];
const manhattan = (a: Tile, b: Tile) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
const inZone = (t: Tile, z: Zone) => t[0] >= z.x && t[0] < z.x + z.w && t[1] >= z.y && t[1] < z.y + z.h;
const center = (t: Tile) => ({ x: t[0] * TILE + TILE / 2, y: t[1] * TILE + TILE / 2 });

type Figure = Phaser.GameObjects.Container;
type Person = { actor: Actor; tile: Tile; view: Figure; hidden: boolean; bob?: Phaser.Tweens.Tween };
type Sheep = { tile: Tile; view: Figure; penned: boolean; moving: boolean };

export type SceneOptions = { chapter: Chapter; bus: NovenaBus; startAt?: string };

export class ChapterScene extends Phaser.Scene {
  private chapter: Chapter;
  private bus: NovenaBus;
  private startAt?: string;

  private grid: string[][] = [];
  private ground!: Phaser.GameObjects.Graphics;
  private overlay!: Phaser.GameObjects.Rectangle;
  private glows: Phaser.GameObjects.Arc[] = [];

  private player!: Figure;
  private playerTile: Tile = [0, 0];
  private facing: Tile = [0, 1];
  private moving = false;
  private path: Tile[] = [];
  private pendingTalk: Person | null = null;

  private people = new Map<string, Person>();
  private sheep: Sheep[] = [];
  private gateClosed = false;

  private stepIndex = -1;
  /** Mientras hay diálogo o escena, el jugador no se mueve. */
  private busy = true;
  private done = false;
  /** Evita que la misma tecla que cerró un diálogo abra otro. */
  private idleSince = 0;

  private keys!: Record<"up" | "down" | "left" | "right" | "w" | "a" | "s" | "d", Phaser.Input.Keyboard.Key>;

  constructor(opts: SceneOptions) {
    super("chapter");
    this.chapter = opts.chapter;
    this.bus = opts.bus;
    this.startAt = opts.startAt;
  }

  private get step(): Step | undefined {
    return this.chapter.steps[this.stepIndex];
  }

  // ───────── Montaje ─────────

  create() {
    const rows = this.chapter.map.rows;
    const width = Math.max(...rows.map((r) => r.length));
    this.grid = rows.map((r) => r.padEnd(width, "#").split(""));
    const mapW = width * TILE;
    const mapH = rows.length * TILE;

    this.ground = this.add.graphics().setDepth(0);
    this.drawMap();

    for (const actor of this.chapter.actors) {
      const view = this.makeFigure(actor.color, actor.floating ? "angel" : "person", actor.name);
      const person: Person = { actor, tile: [...actor.at], view, hidden: !!actor.hidden };
      this.place(view, actor.at, actor.floating);
      view.setVisible(!person.hidden);
      if (actor.floating && !person.hidden) this.startBob(person);
      this.people.set(actor.id, person);
    }

    this.playerTile = [...this.chapter.player.at];
    this.player = this.makeFigure(this.chapter.player.color, "player", this.chapter.player.name);
    this.place(this.player, this.playerTile);

    for (const at of this.chapter.herd?.sheep ?? []) {
      const s: Sheep = { tile: [...at], view: this.makeFigure(0xf4f1e8, "sheep"), penned: false, moving: false };
      this.place(s.view, s.tile);
      this.sheep.push(s);
    }

    // Luz: una capa de color encima del mapa, y un brillo sobre cada fogata.
    const light = LIGHT[this.chapter.map.lighting];
    this.overlay = this.add.rectangle(0, 0, mapW, mapH, light.color, light.alpha).setOrigin(0).setDepth(1000);
    this.grid.forEach((row, y) =>
      row.forEach((c, x) => {
        if (c !== "*") return;
        const { x: cx, y: cy } = center([x, y]);
        const glow = this.add.circle(cx, cy, TILE * 3.5, 0xffa040, 0.2).setDepth(1001);
        glow.setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: glow, alpha: 0.12, scale: 0.92, duration: 700, yoyo: true, repeat: -1, ease: "Sine.inOut" });
        this.glows.push(glow);
      }),
    );
    this.setGlows(this.chapter.map.lighting);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, mapW, mapH);
    cam.setRoundPixels(true);
    cam.startFollow(this.player, true, 0.2, 0.2);
    this.fitZoom();
    this.scale.on("resize", this.fitZoom, this);

    this.setupInput();

    // Para depurar desde la consola del navegador en desarrollo: window.__novena
    if (process.env.NODE_ENV !== "production") (window as unknown as { __novena?: ChapterScene }).__novena = this;

    if (this.chapter.herd) this.time.addEvent({ delay: SHEEP_TICK_MS, loop: true, callback: this.sheepTick, callbackScope: this });

    // Atajo de desarrollo: empezar en un paso dando por hechos los anteriores.
    let start = 0;
    if (this.startAt) {
      const i = this.chapter.steps.findIndex((s) => s.id === this.startAt);
      if (i > 0) {
        this.chapter.steps.slice(0, i).forEach((s) => this.skipStep(s));
        start = i;
      }
    }
    void this.progress(() => this.goToStep(start));
  }

  /** Zoom entero para que los píxeles se vean nítidos: ×2 en el celular, más en pantallas grandes. */
  private fitZoom() {
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setZoom(Math.max(2, Math.floor(Math.min(width, height) / (TILE * 14))));
  }

  private setupInput() {
    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb.addKeys({ up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT, w: K.W, a: K.A, s: K.S, d: K.D }) as typeof this.keys;
    const interact = () => {
      if (this.busy || this.moving || this.time.now - this.idleSince < 250) return;
      const front: Tile = [this.playerTile[0] + this.facing[0], this.playerTile[1] + this.facing[1]];
      const target = this.personAt(front) ?? this.adjacentPeople()[0];
      if (target) void this.talkTo(target);
    };
    kb.on("keydown-SPACE", interact);
    kb.on("keydown-ENTER", interact);
    kb.on("keydown-E", interact);

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.busy) return;
      const w = this.cameras.main.getWorldPoint(p.x, p.y);
      const tile: Tile = [Math.floor(w.x / TILE), Math.floor(w.y / TILE)];
      const person = this.personAt(tile, true);
      if (person) {
        const goals = DIRS.map(([dx, dy]): Tile => [person.tile[0] + dx, person.tile[1] + dy]).filter((t) => this.walkable(t));
        if (goals.some((g) => same(g, this.playerTile))) this.path = [];
        else {
          const route = this.findPath(goals);
          if (!route) return;
          this.path = route;
        }
        this.pendingTalk = person;
        this.tapMark(person.tile);
      } else if (this.walkable(tile)) {
        const route = this.findPath([tile]);
        if (!route) return;
        this.path = route;
        this.pendingTalk = null;
        this.tapMark(tile);
      }
    });
  }

  // ───────── Bucle ─────────

  update() {
    if (this.busy || this.moving) return;
    const k = this.keys;
    const held: Tile | null =
      k.up.isDown || k.w.isDown ? [0, -1] : k.down.isDown || k.s.isDown ? [0, 1] : k.left.isDown || k.a.isDown ? [-1, 0] : k.right.isDown || k.d.isDown ? [1, 0] : null;
    if (held) {
      this.path = [];
      this.pendingTalk = null;
      this.tryStep(held);
      return;
    }
    const next = this.path.shift();
    if (next) {
      if (!this.tryStep([next[0] - this.playerTile[0], next[1] - this.playerTile[1]])) {
        this.path = [];
        this.pendingTalk = null;
      }
      return;
    }
    const target = this.pendingTalk;
    if (target) {
      this.pendingTalk = null;
      if (manhattan(target.tile, this.playerTile) === 1) void this.talkTo(target);
    }
  }

  private tryStep(dir: Tile) {
    this.facing = dir;
    this.drawFacing();
    const to: Tile = [this.playerTile[0] + dir[0], this.playerTile[1] + dir[1]];
    if (!this.walkable(to) || this.sheepAt(to)) return false;
    this.playerTile = to;
    this.moving = true;
    const c = center(to);
    this.tweens.add({
      targets: this.player,
      x: c.x,
      y: c.y,
      duration: STEP_MS,
      onUpdate: () => this.player.setDepth(10 + this.player.y),
      onComplete: () => {
        this.moving = false;
        this.afterPlayerMove();
      },
    });
    return true;
  }

  private afterPlayerMove() {
    const goal = this.step?.goal;
    if (goal?.type === "reach" && inZone(this.playerTile, goal.zone)) void this.progress(() => this.finishStep());
    else this.checkHerd();
  }

  // ───────── Pasos y acciones ─────────

  private async progress(fn: () => Promise<void>) {
    this.busy = true;
    this.path = [];
    this.pendingTalk = null;
    try {
      await fn();
    } finally {
      if (!this.done) this.busy = false;
      this.idleSince = this.time.now;
    }
  }

  private async goToStep(i: number) {
    this.stepIndex = i;
    const step = this.step;
    if (!step) {
      this.done = true;
      this.bus.emit("objective", null);
      this.bus.emit("complete");
      return;
    }
    this.showObjective();
    if (step.onStart) await this.run(step.onStart);
    const goal = step.goal;
    if (goal.type === "auto" || (goal.type === "reach" && inZone(this.playerTile, goal.zone))) return this.finishStep();
    if (goal.type === "herd" && this.herdComplete()) return this.finishStep();
  }

  private async finishStep() {
    const step = this.step;
    this.bus.emit("objective", null);
    if (step?.onDone) await this.run(step.onDone);
    await this.goToStep(this.stepIndex + 1);
  }

  private showObjective() {
    const text = this.step?.objective;
    if (!text) return this.bus.emit("objective", null);
    const n = this.sheep.filter((s) => s.penned).length;
    this.bus.emit("objective", text.replace("{n}", String(n)).replace("{total}", String(this.sheep.length)));
  }

  private async talkTo(person: Person) {
    const talk = person.actor.talk;
    const dialog = talk?.[this.step?.id ?? ""] ?? talk?.default;
    if (!dialog) return;
    this.faceTowards(person.tile);
    await this.progress(async () => {
      await this.say(dialog);
      const goal = this.step?.goal;
      if (goal?.type === "talk" && goal.actor === person.actor.id) await this.finishStep();
    });
  }

  private async run(actions: Action[]) {
    for (const a of actions) await this.runAction(a);
  }

  private async runAction(a: Action) {
    const cam = this.cameras.main;
    switch (a.type) {
      case "say":
        return this.say(a.dialog);
      case "show":
      case "hide": {
        const show = a.type === "show";
        const people = this.peopleIn(a.actor);
        for (const p of people) {
          p.hidden = !show;
          if (show) {
            p.view.setVisible(true).setAlpha(0);
            if (p.actor.floating) this.startBob(p);
          }
        }
        await this.tweenAsync({ targets: people.map((p) => p.view), alpha: show ? 1 : 0, duration: 450 });
        if (!show)
          for (const p of people) {
            p.view.setVisible(false);
            p.bob?.stop();
          }
        return;
      }
      case "flash": {
        const c = Phaser.Display.Color.IntegerToColor(a.color ?? 0xffffff);
        cam.flash(700, c.red, c.green, c.blue);
        return this.wait(700);
      }
      case "lighting": {
        const l = LIGHT[a.mode];
        this.overlay.fillColor = l.color;
        this.setGlows(a.mode);
        return this.tweenAsync({ targets: this.overlay, fillAlpha: l.alpha, duration: 900 });
      }
      case "pan": {
        cam.stopFollow();
        const { x, y } = center(a.to);
        const ms = a.ms ?? 900;
        cam.pan(x, y, ms, "Sine.easeInOut");
        return this.wait(ms);
      }
      case "follow":
        cam.pan(this.player.x, this.player.y, 600, "Sine.easeInOut");
        await this.wait(600);
        cam.startFollow(this.player, true, 0.2, 0.2);
        return;
      case "wait":
        return this.wait(a.ms);
      case "sfx":
        if (this.cache.audio.exists(a.key)) this.sound.play(a.key);
        return;
    }
  }

  private say(id: string) {
    const lines = this.chapter.dialogs[id];
    if (!lines?.length) {
      console.warn(`[novena] No existe el diálogo «${id}»`);
      return Promise.resolve();
    }
    const resolved: ResolvedLine[] = lines.map(({ who, text }) => {
      if (who === "narrator") return { speaker: null, text, color: null };
      if (who === "player") return { speaker: this.chapter.player.name, text, color: this.chapter.player.color };
      const actor = this.people.get(who)?.actor;
      return { speaker: actor?.name ?? who, text, color: actor?.color ?? null };
    });
    const closed = this.bus.once("dialogDone");
    this.bus.emit("dialog", resolved);
    return closed.then(() => undefined);
  }

  /** Para el atajo de desarrollo: deja el mundo como si el paso ya se hubiera jugado, sin diálogos. */
  private skipStep(step: Step) {
    if (step.goal.type === "herd") this.penAllSheep();
    for (const a of [...(step.onStart ?? []), ...(step.onDone ?? [])]) {
      if (a.type === "show" || a.type === "hide") {
        for (const p of this.peopleIn(a.actor)) {
          p.hidden = a.type === "hide";
          p.view.setVisible(!p.hidden).setAlpha(1);
          if (!p.hidden && p.actor.floating) this.startBob(p);
        }
      } else if (a.type === "lighting") {
        const l = LIGHT[a.mode];
        this.overlay.setFillStyle(l.color, l.alpha);
        this.setGlows(a.mode);
      }
    }
  }

  // ───────── Ovejas ─────────

  private sheepTick() {
    const herd = this.chapter.herd;
    if (!herd || this.busy) return;
    for (const s of this.sheep) {
      if (s.moving) continue;
      const dist = manhattan(s.tile, this.playerTile);
      const options = DIRS.map(([dx, dy]): Tile => [s.tile[0] + dx, s.tile[1] + dy]).filter(
        (t) => this.sheepCanGo(t) && (!s.penned || inZone(t, herd.pen)),
      );
      if (!options.length) continue;
      let choice: Tile | undefined;
      if (dist <= herd.fleeRadius) {
        // Se aleja lo más en línea recta posible: así, empujarla desde atrás la lleva hacia adelante.
        const [px, py] = this.playerTile;
        const d2 = (t: Tile) => (t[0] - px) ** 2 + (t[1] - py) ** 2;
        const now = d2(s.tile);
        const farther = options.filter((t) => d2(t) > now);
        const best = Math.max(...farther.map(d2));
        if (farther.length) choice = Phaser.Utils.Array.GetRandom(farther.filter((t) => d2(t) === best));
        // Acorralada contra una esquina: se escabulle por donde pueda, para que nunca quede trabada.
        else if (dist <= 1) choice = Phaser.Utils.Array.GetRandom(options);
      } else if (Math.random() < 0.06) {
        choice = Phaser.Utils.Array.GetRandom(options);
      }
      if (choice) this.moveSheep(s, choice);
    }
  }

  private moveSheep(s: Sheep, to: Tile) {
    s.tile = to;
    s.moving = true;
    const c = center(to);
    s.view.setScale(to[0] < s.view.x / TILE ? -1 : 1, 1);
    this.tweens.add({
      targets: s.view,
      x: c.x,
      y: c.y,
      duration: SHEEP_STEP_MS,
      onUpdate: () => s.view.setDepth(10 + s.view.y),
      onComplete: () => {
        s.moving = false;
        const herd = this.chapter.herd!;
        if (!s.penned && inZone(s.tile, herd.pen)) {
          s.penned = true;
          this.tweens.add({ targets: s.view, y: s.view.y - 4, duration: 120, yoyo: true });
          if (this.step?.goal.type === "herd") this.showObjective();
        }
        this.checkHerd();
      },
    });
  }

  private herdComplete() {
    return this.sheep.length > 0 && this.sheep.every((s) => s.penned) && this.gateClosed;
  }

  /** Cierra la puerta cuando todas están adentro y el jugador está afuera. */
  private checkHerd() {
    const herd = this.chapter.herd;
    if (!herd || this.busy || this.step?.goal.type !== "herd" || this.gateClosed) return;
    if (!this.sheep.every((s) => s.penned)) return;
    const playerInside = inZone(this.playerTile, herd.pen) || herd.gate.some((g) => same(g, this.playerTile));
    if (playerInside) return this.bus.emit("objective", "Sal del corral para cerrar la puerta");
    this.closeGate();
    void this.progress(() => this.finishStep());
  }

  private closeGate() {
    for (const [x, y] of this.chapter.herd?.gate ?? []) this.grid[y][x] = "f";
    this.gateClosed = true;
    this.drawMap();
  }

  private penAllSheep() {
    const pen = this.chapter.herd?.pen;
    if (!pen) return;
    this.sheep.forEach((s, i) => {
      s.tile = [pen.x + 1 + ((i * 2) % Math.max(1, pen.w - 2)), pen.y + 1 + Math.floor((i * 2) / Math.max(1, pen.w - 2))];
      s.penned = true;
      this.place(s.view, s.tile);
    });
    this.closeGate();
  }

  // ───────── Mundo ─────────

  private tileAt([x, y]: Tile) {
    return this.grid[y]?.[x] ?? "#";
  }

  private personAt(t: Tile, includeFloating = false) {
    for (const p of this.people.values()) {
      if (!p.hidden && same(p.tile, t) && (includeFloating || !p.actor.floating)) return p;
    }
    return undefined;
  }

  private peopleIn(ids: string | string[]) {
    return (Array.isArray(ids) ? ids : [ids]).flatMap((id) => {
      const p = this.people.get(id);
      if (!p) console.warn(`[novena] No existe el personaje «${id}»`);
      return p ? [p] : [];
    });
  }

  private adjacentPeople() {
    return [...this.people.values()].filter((p) => !p.hidden && manhattan(p.tile, this.playerTile) === 1);
  }

  private sheepAt(t: Tile) {
    return this.sheep.some((s) => same(s.tile, t));
  }

  /** Casilla que el jugador puede pisar (las ovejas se revisan aparte porque se mueven). */
  private walkable(t: Tile) {
    return !SOLID.has(this.tileAt(t)) && !this.personAt(t);
  }

  private sheepCanGo(t: Tile) {
    return this.walkable(t) && !same(t, this.playerTile) && !this.sheepAt(t);
  }

  /** Camino más corto (búsqueda en anchura) hasta cualquiera de las casillas meta. */
  private findPath(goals: Tile[]): Tile[] | null {
    const w = this.grid[0].length;
    const key = (t: Tile) => t[1] * w + t[0];
    const goalKeys = new Set(goals.map(key));
    const prev = new Map<number, Tile | null>([[key(this.playerTile), null]]);
    const queue: Tile[] = [this.playerTile];
    while (queue.length) {
      const cur = queue.shift()!;
      if (goalKeys.has(key(cur))) {
        const route: Tile[] = [];
        for (let t: Tile | null = cur; t && !same(t, this.playerTile); t = prev.get(key(t)) ?? null) route.unshift(t);
        return route;
      }
      for (const [dx, dy] of DIRS) {
        const n: Tile = [cur[0] + dx, cur[1] + dy];
        if (prev.has(key(n)) || !this.walkable(n)) continue;
        prev.set(key(n), cur);
        queue.push(n);
      }
    }
    return null;
  }

  private faceTowards(t: Tile) {
    const dx = Math.sign(t[0] - this.playerTile[0]);
    const dy = Math.sign(t[1] - this.playerTile[1]);
    if (dx || dy) this.facing = dx ? [dx, 0] : [0, dy];
    this.drawFacing();
  }

  // ───────── Dibujo provisional (cuadros de colores) ─────────

  private drawMap() {
    const g = this.ground.clear();
    this.grid.forEach((row, y) =>
      row.forEach((c, x) => {
        const px = x * TILE;
        const py = y * TILE;
        g.fillStyle(GROUND[c] ?? GRASS).fillRect(px, py, TILE, TILE);
        // Pequeña variación en el pasto para que no se vea plano.
        if (c === "." && (x * 7 + y * 13) % 5 === 0) g.fillStyle(0x618a44).fillRect(px + 5, py + 9, 2, 3).fillRect(px + 9, py + 7, 2, 3);
        if (c === "#") g.fillStyle(0x8c877f).fillRect(px + 1, py + 1, TILE - 2, 5);
        if (c === "~") g.fillStyle(0x6b9bc9).fillRect(px + 3, py + 6, 7, 1).fillRect(px + 8, py + 11, 5, 1);
        if (c === "T") {
          g.fillStyle(0x6b4a2b).fillRect(px + 6, py + 9, 4, 7);
          g.fillStyle(0x2f5a2a).fillCircle(px + 8, py + 7, 7);
          g.fillStyle(0x3d7034).fillCircle(px + 6, py + 5, 3);
        }
        if (c === "b") {
          g.fillStyle(0x3f6e35).fillCircle(px + 8, py + 10, 6);
          g.fillStyle(0x4f8443).fillCircle(px + 6, py + 8, 2);
        }
        if (c === "f") {
          g.fillStyle(0x8a6239);
          const h = this.tileAt([x - 1, y]) === "f" || this.tileAt([x + 1, y]) === "f";
          const v = this.tileAt([x, y - 1]) === "f" || this.tileAt([x, y + 1]) === "f";
          if (h || !v) g.fillRect(px, py + 6, TILE, 2).fillRect(px, py + 11, TILE, 2);
          if (v) g.fillRect(px + 6, py, 2, TILE).fillRect(px + 10, py, 2, TILE);
          g.fillStyle(0x6b4a2b).fillRect(px + 6, py + 4, 4, 11);
        }
        if (c === "g") g.lineStyle(1, 0x8a6239, 0.7).strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        if (c === "*") {
          g.fillStyle(0x5d5a55).fillCircle(px + 8, py + 9, 6);
          g.fillStyle(0xe8862a).fillCircle(px + 8, py + 8, 4);
          g.fillStyle(0xffd36b).fillCircle(px + 8, py + 9, 2);
        }
      }),
    );
  }

  private makeFigure(color: number, kind: "person" | "player" | "angel" | "sheep", name?: string): Figure {
    const parts: Phaser.GameObjects.GameObject[] = [this.add.ellipse(0, 6, 12, 4, 0x000000, 0.25)];
    if (kind === "sheep") {
      parts.push(this.add.ellipse(0, 1, 13, 9, color), this.add.circle(5, -1, 3, 0x3a3530), this.add.rectangle(-3, 6, 2, 3, 0x3a3530), this.add.rectangle(3, 6, 2, 3, 0x3a3530));
    } else if (kind === "angel") {
      parts.push(
        this.add.triangle(-6, -2, 0, 0, -6, -8, -2, 6, 0xfff7dc, 0.9),
        this.add.triangle(6, -2, 0, 0, 6, -8, 2, 6, 0xfff7dc, 0.9),
        this.add.rectangle(0, 1, 9, 12, color),
        this.add.circle(0, -7, 3.5, 0xf2d6b3),
        this.add.ellipse(0, -12, 8, 2, 0xffd36b),
      );
    } else {
      parts.push(this.add.rectangle(0, 1, 10, 11, color), this.add.circle(0, -7, 3.5, 0xd9a77c));
      if (kind === "player") parts.push(this.add.rectangle(0, 9, 3, 2, 0xffffff).setName("facing"));
    }
    if (name) {
      const label = this.add
        .text(0, -15, name, { fontFamily: "monospace", fontSize: "6px", color: "#ffffff", stroke: "#00000099", strokeThickness: 2 })
        .setOrigin(0.5, 1)
        .setResolution(4);
      parts.push(label);
    }
    return this.add.container(0, 0, parts);
  }

  private place(view: Figure, t: Tile, floating = false) {
    const c = center(t);
    view.setPosition(c.x, c.y).setDepth(floating ? 1002 : 10 + c.y);
  }

  private drawFacing() {
    const mark = this.player.getByName("facing") as Phaser.GameObjects.Rectangle | null;
    const [fx, fy] = this.facing;
    mark?.setPosition(fx * 6, fy === -1 ? -11 : fy === 1 ? 8 : 2);
  }

  private startBob(p: Person) {
    p.bob?.stop();
    const c = center(p.tile);
    p.view.y = c.y;
    p.bob = this.tweens.add({ targets: p.view, y: c.y - 3, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.inOut" });
  }

  private setGlows(mode: Lighting) {
    for (const g of this.glows) g.setVisible(mode === "night");
  }

  private tapMark(t: Tile) {
    const { x, y } = center(t);
    const mark = this.add.rectangle(x, y, TILE - 2, TILE - 2).setStrokeStyle(1, 0xffffff, 0.9).setDepth(1003);
    this.tweens.add({ targets: mark, alpha: 0, scale: 0.6, duration: 450, onComplete: () => mark.destroy() });
  }

  private wait(ms: number) {
    return new Promise<void>((resolve) => this.time.delayedCall(ms, resolve));
  }

  private tweenAsync(config: Phaser.Types.Tweens.TweenBuilderConfig) {
    return new Promise<void>((resolve) => this.tweens.add({ ...config, onComplete: () => resolve() }));
  }
}

export function startChapter(parent: HTMLElement, opts: SceneOptions) {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: "#0b1020",
    banner: false,
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth, height: parent.clientHeight },
    scene: [new ChapterScene(opts)],
  });
  return () => game.destroy(true);
}
