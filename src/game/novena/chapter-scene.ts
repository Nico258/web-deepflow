import * as Phaser from "phaser";
import type { NovenaBus, ResolvedLine } from "./bus";
import { DIRS, MAIN_MAP, SOLID, allMaps, inZone, manhattan, mapOf, same, toGrid } from "./map";
import { caseSets, choicesOf, currentTalk, flagList, matches } from "./rules";
import type { Action, Actor, Chapter, Choice, Exit, Flags, HerdConfig, Line, Lighting, Step, Tile } from "./types";

// Motor de un capítulo. Lee el guion (src/data/novena/capitulos/*) y lo vuelve jugable:
// dibuja el mapa, mueve al jugador por casillas, recorre los pasos y le pide a React
// que muestre diálogos y objetivos. No sabe nada de ningún capítulo en particular.
//
// Mientras no haya arte, todo se dibuja con figuras de colores. Cuando llegue el arte,
// lo que cambia es drawMap() y makeFigure(); el resto del motor sigue igual.

export const TILE = 16;
const STEP_MS = 150;
/** Cuánto tarda cada paso de un personaje que camina con `move`, si no se dice otra cosa. */
const MOVE_MS = 220;
const SHEEP_STEP_MS = 220;
/** Valores por defecto de los campos opcionales de `herd` (ver HerdConfig en types.ts). */
const HERD_DEFAULTS = { paceMs: 320, homing: 0.2, helpAfterMs: 45_000, helpRampMs: 60_000, wander: 0.2 };
/** Cuánto se aleja una oveja tranquila del lugar donde la dejaron, en casillas. */
const WANDER_RADIUS = 2;
/** Cuánto hay que mantener el dedo (o el clic) para caminar hacia él en vez de ir a un punto. */
const HOLD_MS = 220;
/** Tras cerrar un diálogo o una ventana, cuánto se ignoran los toques y teclas (el mismo toque no camina). */
const FREED_MS = 250;

const GROUND: Record<string, number> = { ",": 0xb89c6a, g: 0xb89c6a, _: 0xa9a294, d: 0x8a6239, "#": 0x77736c, "~": 0x3f73a6 };
const GRASS = 0x6f9a4f;

const LIGHT: Record<Lighting, { color: number; alpha: number }> = {
  day: { color: 0x000000, alpha: 0 },
  night: { color: 0x0a1430, alpha: 0.58 },
  glory: { color: 0xfff1c4, alpha: 0.22 },
};

/** Teclas de dirección, por `KeyboardEvent.code`. */
const KEY_DIRS: Record<string, Tile> = {
  ArrowUp: [0, -1],
  KeyW: [0, -1],
  ArrowDown: [0, 1],
  KeyS: [0, 1],
  ArrowLeft: [-1, 0],
  KeyA: [-1, 0],
  ArrowRight: [1, 0],
  KeyD: [1, 0],
};
/** Hasta cuántas casillas de distancia se ve el nombre de un personaje. */
const LABEL_RANGE = 3;

const center = (t: Tile) => ({ x: t[0] * TILE + TILE / 2, y: t[1] * TILE + TILE / 2 });

type Figure = Phaser.GameObjects.Container;
/** `map`: en qué mapa está. Se ve solo si no está oculto y el jugador está en ese mapa. */
type Person = { actor: Actor; map: string; tile: Tile; view: Figure; hidden: boolean; bob?: Phaser.Tweens.Tween };
/** `home`: donde la dejaron (al empezar o tras huir); tranquila, pasta cerca de ahí. */
type Sheep = { tile: Tile; home: Tile; view: Figure; penned: boolean; moving: boolean };

export type SceneOptions = { chapter: Chapter; bus: NovenaBus; startAt?: string };

/** Estado visible desde las pruebas y la consola (ver NovenaDebug). */
export type DebugState = {
  step: string | null;
  /** En qué mapa está el jugador ("main" es el principal). */
  map: string;
  goal: Step["goal"]["type"] | null;
  /**
   * Con quién hay que hablar: en `talk`, el de la meta; en `flags`, alguien cuyo diálogo de ahora
   * marca una bandera que falta (si hay).
   */
  talkTo: string | null;
  /** Banderas marcadas. */
  flags: string[];
  busy: boolean;
  done: boolean;
  player: Tile;
  sheep: { penned: number; total: number };
};

/**
 * Herramientas de depuración que quedan en `window.__novena` solo en desarrollo.
 * Las usan las pruebas automáticas (tests/novena) para recorrer un capítulo sin jugarlo de verdad.
 * Es la única parte del motor que las pruebas tocan: si cambia, hay que actualizarlas.
 */
export type NovenaDebug = {
  scene: ChapterScene;
  state(): DebugState;
  /**
   * Cumple la meta del paso actual como si se hubiera jugado: `talk` habla con el personaje,
   * `reach` lleva al jugador a la zona, `herd` mete las ovejas al corral y `flags` habla con
   * quien marca una bandera que falta (o, si nadie, las marca de una vez). Si hace falta, primero
   * pasa al jugador al mapa donde está la persona o la zona. Devuelve false si en ese momento no
   * se puede (hay un diálogo o una escena, o la meta es `auto`).
   */
  completeStep(): boolean;
  /** Pone al jugador en una casilla, sin animación. */
  teleport(tile: Tile): void;
  /** Posición en pantalla (píxeles CSS, relativa a la ventana) del centro de una casilla. */
  screenPoint(tile: Tile): { x: number; y: number };
  /** Casilla donde está un personaje, o null si no está en el mapa donde está el jugador. */
  actorTile(id: string): Tile | null;
};

export class ChapterScene extends Phaser.Scene {
  private chapter: Chapter;
  private bus: NovenaBus;
  private startAt?: string;

  /** El mapa donde está el jugador, y la cuadrícula de cada mapa (la puerta del corral la cambia). */
  private mapId = MAIN_MAP;
  private grids = new Map<string, string[][]>();
  private grid: string[][] = [];
  /** Luz de cada mapa: la de su definición, hasta que una acción `lighting` la cambie. */
  private lightingOf = new Map<string, Lighting>();
  private ground!: Phaser.GameObjects.Graphics;
  private overlay!: Phaser.GameObjects.Rectangle;
  private glows: Phaser.GameObjects.Image[] = [];

  private player!: Figure;
  private playerTile: Tile = [0, 0];
  private facing: Tile = [0, 1];
  private moving = false;
  private path: Tile[] = [];
  /** Adónde lleva `path`, para buscar otro camino si una oveja se cruza. */
  private pathGoals: Tile[] | null = null;
  private pendingTalk: Person | null = null;
  /** Una tecla de dirección que se soltó antes de que el juego la viera: igual cuenta como un paso. */
  private queuedDir: Tile | null = null;

  private people = new Map<string, Person>();
  private sheep: Sheep[] = [];
  private gateClosed = false;
  /** Flechas en el borde de la pantalla hacia las ovejas que no se ven. */
  private sheepArrows: Phaser.GameObjects.Triangle[] = [];
  /** Distancia de cada casilla al corral, caminando como oveja. */
  private penDistance: (t: Tile) => number = () => 0;
  private herdStartedAt = 0;
  /** Si ya se abrió `helpDialog` en este paso. */
  private herdHelpAnnounced = false;
  /** El dedo (o el mouse) que se mantiene apretado para caminar hacia él. */
  private hold: { pointer: Phaser.Input.Pointer; since: number } | null = null;

  private stepIndex = -1;
  /** Mientras hay diálogo o escena, el jugador no se mueve. */
  private busy = true;
  private done = false;
  /** Evita que la misma tecla que cerró un diálogo abra otro. */
  private idleSince = 0;
  /** Banderas marcadas en este capítulo (ver `set` / `unset` y la meta `flags`). */
  private flags = new Set<string>();
  /** Quienes acompañan al jugador (`join`), en orden: el primero va justo detrás. */
  private party: Person[] = [];
  /** Zoom respecto del normal (acción `zoom`). */
  private zoomFactor = 1;
  /** Cuánto ocupa arriba la interfaz de React (barra y objetivo), en píxeles de pantalla. */
  private topInset = 0;
  /** Lo último que se avisó de lo que lleva el jugador, para no repetir. */
  private itemsKey = "";

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
    for (const [id, m] of allMaps(this.chapter)) {
      this.grids.set(id, toGrid(m.rows));
      this.lightingOf.set(id, m.lighting);
    }
    this.grid = this.grids.get(MAIN_MAP)!;

    this.ground = this.add.graphics().setDepth(0);

    for (const actor of this.chapter.actors) {
      // Los ángeles no llevan nombre encima (se presentan en el diálogo), ni los objetos de decoración.
      const kind = actor.floating ? "angel" : actor.kind === "object" ? "object" : "person";
      const label = kind === "person" || (kind === "object" && actor.talk) ? actor.name : undefined;
      const view = this.makeFigure(actor.color, kind, label);
      const person: Person = { actor, map: actor.map ?? MAIN_MAP, tile: [...actor.at], view, hidden: !!actor.hidden };
      this.place(view, actor.at, actor.floating);
      if (actor.floating && !person.hidden) this.startBob(person);
      this.people.set(actor.id, person);
    }

    this.playerTile = [...this.chapter.player.at];
    // El jugador no lleva nombre encima: ya sabe quién es, y así no tapa a los demás.
    this.player = this.makeFigure(this.chapter.player.color, "player");
    this.place(this.player, this.playerTile);
    this.updateLabels();

    for (const at of this.chapter.herd?.sheep ?? []) {
      const s: Sheep = { tile: [...at], home: [...at], view: this.makeFigure(0xf4f1e8, "sheep"), penned: false, moving: false };
      this.place(s.view, s.tile);
      this.sheep.push(s);
      const arrow = this.add.triangle(0, 0, 0, -6, 11, 0, 0, 6, 0xf4f1e8).setStrokeStyle(2, 0x10182c).setDepth(1004).setVisible(false);
      this.sheepArrows.push(arrow);
    }
    if (this.chapter.herd) this.penDistance = this.measurePenDistance();

    // Luz: una capa de color encima del mapa (y un brillo sobre cada fogata, en enterMap).
    this.overlay = this.add.rectangle(0, 0, TILE, TILE, 0x000000, 0).setOrigin(0).setDepth(1000);

    const cam = this.cameras.main;
    cam.setRoundPixels(true);
    this.fitZoom();
    this.enterMap();
    cam.startFollow(this.player, true, 0.2, 0.2);
    this.scale.on("resize", this.fitZoom, this);

    this.setupInput();

    // React pausa el juego mientras hay una ventana abierta (por ejemplo, «¿Salir del capítulo?»).
    const offPause = this.bus.on("pause", (paused) => {
      if (paused) return this.scene.pause();
      this.scene.resume();
      this.idleSince = this.time.now;
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, offPause);
    // La barra y el objetivo de arriba tapan el mapa: la cámara deja ese espacio libre.
    const offInset = this.bus.on("hudInset", (px) => {
      this.topInset = px;
      this.fitBounds();
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, offInset);

    // Para depurar desde la consola del navegador y para las pruebas: window.__novena
    if (process.env.NODE_ENV !== "production") {
      const w = window as unknown as { __novena?: NovenaDebug };
      w.__novena = this.debugApi();
      this.events.once(Phaser.Scenes.Events.DESTROY, () => {
        if (w.__novena?.scene === this) delete w.__novena;
      });
    }

    const herd = this.chapter.herd;
    if (herd) this.time.addEvent({ delay: herd.paceMs ?? HERD_DEFAULTS.paceMs, loop: true, callback: this.sheepTick, callbackScope: this });

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

  /** Zoom de la cámara: el normal por el de la acción `zoom` (1 si no hubo). */
  private fitZoom() {
    this.cameras.main.setZoom(this.baseZoom() * this.zoomFactor);
    this.fitBounds();
  }

  /** Zoom entero para que los píxeles se vean nítidos: ×2 en el celular, más en pantallas grandes. */
  private baseZoom() {
    const { width, height } = this.scale.gameSize;
    return Math.max(2, Math.floor(Math.min(width, height) / (TILE * 14)));
  }

  /**
   * Límites de la cámara: el mapa, más un margen arriba del alto de la barra y el objetivo, para que
   * ni el jugador ni lo que está en el borde de arriba del mapa queden debajo. Si el mapa es más
   * chico que la pantalla (una casa), queda centrado en el espacio libre.
   */
  private fitBounds(zoom = this.cameras.main.zoom) {
    const cam = this.cameras.main;
    const mapW = (this.grid[0]?.length ?? 0) * TILE;
    const mapH = this.grid.length * TILE;
    const top = this.topInset / zoom;
    const w = Math.max(mapW, cam.width / zoom);
    const h = Math.max(mapH + top, cam.height / zoom);
    cam.setBounds((mapW - w) / 2, -top + (mapH + top - h) / 2, w, h);
  }

  /** Arma lo que depende del mapa actual: suelo, luz, fogatas, cámara y quién se ve. */
  private enterMap() {
    this.drawMap();
    const mode = this.lightingOf.get(this.mapId) ?? "day";
    const light = LIGHT[mode];
    this.overlay.setSize(this.grid[0].length * TILE, this.grid.length * TILE).setFillStyle(light.color, light.alpha);
    for (const g of this.glows) g.destroy();
    this.glows = [];
    this.grid.forEach((row, y) =>
      row.forEach((c, x) => {
        if (c !== "*") return;
        const { x: cx, y: cy } = center([x, y]);
        // Luz suave que se desvanece hacia los bordes; va sobre la capa de noche para iluminar.
        const glow = this.add.image(cx, cy, this.glowTexture()).setDepth(1001).setTint(0xffa040).setAlpha(0.32);
        glow.setDisplaySize(TILE * 8, TILE * 8).setBlendMode(Phaser.BlendModes.ADD);
        const base = glow.scale;
        this.tweens.add({ targets: glow, alpha: 0.22, scale: base * 0.94, duration: 700, yoyo: true, repeat: -1, ease: "Sine.inOut" });
        this.glows.push(glow);
      }),
    );
    this.setGlows(mode);
    this.fitBounds();
    for (const p of this.people.values()) p.view.setVisible(this.isHere(p)).setAlpha(1);
    for (const s of this.sheep) s.view.setVisible(this.mapId === MAIN_MAP);
    this.updateLabels();
  }

  /** Si una persona se ve ahora: no está oculta y está en el mapa del jugador. */
  private isHere(p: Person) {
    return !p.hidden && p.map === this.mapId;
  }

  /** Cambia de mapa al instante y pone al jugador en `at`. */
  private switchMap(id: string, at: Tile) {
    const grid = this.grids.get(id);
    if (!grid) return console.warn(`[novena] No existe el mapa «${id}»`);
    this.mapId = id;
    this.grid = grid;
    this.teleportPlayer(at);
    // Los que acompañan llegan con el jugador, a su lado si hay lugar.
    const free = DIRS.map(([dx, dy]): Tile => [at[0] + dx, at[1] + dy]).filter((t) => !SOLID.has(this.tileAt(t)) && !this.blockerAt(t));
    this.party.forEach((p, i) => {
      p.map = id;
      p.tile = [...(free[i] ?? at)];
      this.place(p.view, p.tile, p.actor.floating);
    });
    this.enterMap();
    this.cameras.main.startFollow(this.player, true, 0.2, 0.2);
  }

  /** Cambia de mapa con un fundido a oscuro. */
  private async travel(id: string, at: Tile) {
    const cam = this.cameras.main;
    cam.fadeOut(220, 11, 16, 32);
    await this.wait(220);
    this.switchMap(id, at);
    cam.fadeIn(220, 11, 16, 32);
    await this.wait(220);
  }

  /** La salida que hay en esta casilla del mapa actual, si hay. */
  private exitAt(t: Tile): Exit | undefined {
    return mapOf(this.chapter, this.mapId)?.exits?.find((e) => same(e.at, t));
  }

  /** Si la meta es `reach` y el jugador está en la zona (y en su mapa). */
  private reachMet() {
    const goal = this.step?.goal;
    return goal?.type === "reach" && (goal.map ?? MAIN_MAP) === this.mapId && inZone(this.playerTile, goal.zone);
  }

  private setupInput() {
    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = kb.addKeys({ up: K.UP, down: K.DOWN, left: K.LEFT, right: K.RIGHT, w: K.W, a: K.A, s: K.S, d: K.D }) as typeof this.keys;
    const interact = () => {
      if (this.busy || this.moving || this.justFreed()) return;
      const front: Tile = [this.playerTile[0] + this.facing[0], this.playerTile[1] + this.facing[1]];
      const target = this.personAt(front) ?? this.adjacentPeople()[0];
      if (target) void this.talkTo(target);
    };
    // Una pulsación muy corta puede soltarse antes del siguiente cuadro y `isDown` no la vería.
    kb.on("keydown", (e: KeyboardEvent) => {
      const dir = KEY_DIRS[e.code];
      if (dir && !e.repeat && !this.busy) this.queuedDir = dir;
    });
    kb.on("keydown-SPACE", interact);
    kb.on("keydown-ENTER", interact);
    kb.on("keydown-E", interact);

    // Tocar un punto lleva hasta ahí; mantener el dedo camina hacia él mientras no se suelte
    // (sirve para arrear ovejas en el celular).
    const release = () => (this.hold = null);
    this.input.on("pointerup", release);
    this.input.on("pointerupoutside", release);
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      // El toque que cerró un diálogo o una ventana no cuenta como toque en el mapa.
      if (this.busy || this.justFreed()) return;
      const tile = this.pointerTile(p);
      const person = this.personAt(tile, true);
      this.hold = person ? null : { pointer: p, since: this.time.now };
      if (person) {
        const goals = DIRS.map(([dx, dy]): Tile => [person.tile[0] + dx, person.tile[1] + dy]).filter((t) => this.walkable(t));
        if (goals.some((g) => same(g, this.playerTile))) this.clearPath();
        else {
          const route = this.findPath(goals);
          if (!route) return;
          this.path = route;
          this.pathGoals = goals;
        }
        this.pendingTalk = person;
        this.tapMark(person.tile);
      } else if (this.walkable(tile)) {
        const route = this.findPath([tile]);
        if (!route) return;
        this.path = route;
        this.pathGoals = [tile];
        this.pendingTalk = null;
        this.tapMark(tile);
      }
    });
  }

  // ───────── Bucle ─────────

  update() {
    this.updateSheepArrows();
    if (this.busy || this.moving) return;
    const k = this.keys;
    const held: Tile | null =
      k.up.isDown || k.w.isDown ? [0, -1] : k.down.isDown || k.s.isDown ? [0, 1] : k.left.isDown || k.a.isDown ? [-1, 0] : k.right.isDown || k.d.isDown ? [1, 0] : this.queuedDir;
    this.queuedDir = null;
    if (held) {
      this.clearPath();
      this.tryStep(held);
      return;
    }
    if (this.hold?.pointer.isDown && this.time.now - this.hold.since >= HOLD_MS) {
      this.clearPath();
      this.stepTowards(this.pointerTile(this.hold.pointer));
      return;
    }
    const next = this.path.shift();
    if (next) {
      if (this.tryStep([next[0] - this.playerTile[0], next[1] - this.playerTile[1]])) return;
      // Algo se cruzó (una oveja): se busca otro camino al mismo destino; si no hay, se detiene.
      const route = this.pathGoals && this.findPath(this.pathGoals);
      if (route?.length) this.path = route;
      else this.clearPath();
      return;
    }
    this.pathGoals = null;
    const target = this.pendingTalk;
    if (target) {
      this.pendingTalk = null;
      if (manhattan(target.tile, this.playerTile) === 1) void this.talkTo(target);
    }
  }

  private pointerTile(p: Phaser.Input.Pointer): Tile {
    const w = this.cameras.main.getWorldPoint(p.x, p.y);
    return [Math.floor(w.x / TILE), Math.floor(w.y / TILE)];
  }

  /** Un paso hacia una casilla: primero por el eje más largo y, si está cerrado, por el otro. */
  private stepTowards(target: Tile) {
    const dx = target[0] - this.playerTile[0];
    const dy = target[1] - this.playerTile[1];
    if (!dx && !dy) return;
    const horizontal: Tile = [Math.sign(dx), 0];
    const vertical: Tile = [0, Math.sign(dy)];
    const [first, second] = Math.abs(dx) >= Math.abs(dy) ? [horizontal, vertical] : [vertical, horizontal];
    if (!this.tryStep(first) && (second[0] || second[1])) this.tryStep(second);
  }

  private clearPath() {
    this.path = [];
    this.pathGoals = null;
    this.pendingTalk = null;
  }

  private tryStep(dir: Tile) {
    this.facing = dir;
    this.drawFacing();
    const to: Tile = [this.playerTile[0] + dir[0], this.playerTile[1] + dir[1]];
    if (!this.walkable(to) || this.sheepAt(to)) return false;
    this.followPlayer(this.playerTile);
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
    this.updateLabels();
    const exit = this.exitAt(this.playerTile);
    if (exit && matches(exit.when, this.step?.id, this.flags)) {
      void this.progress(async () => {
        await this.travel(exit.to, exit.arrive);
        if (this.reachMet()) await this.finishStep();
      });
      return;
    }
    if (exit?.closed) void this.progress(() => this.say(exit.closed!));
    else if (this.reachMet()) void this.progress(() => this.finishStep());
    else this.checkHerd();
  }

  // ───────── Pasos y acciones ─────────

  /** Si el juego se acaba de liberar (se cerró un diálogo o una ventana): ese mismo toque o tecla no cuenta. */
  private justFreed() {
    return this.time.now - this.idleSince < FREED_MS;
  }

  private async progress(fn: () => Promise<void>) {
    this.busy = true;
    this.clearPath();
    this.queuedDir = null;
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
    if (step.goal.type === "herd") {
      this.herdStartedAt = this.time.now;
      this.herdHelpAnnounced = false;
    }
    if (step.onStart) await this.run(step.onStart);
    const goal = step.goal;
    if (goal.type === "auto" || this.reachMet()) return this.finishStep();
    if (goal.type === "herd" && this.herdComplete()) return this.finishStep();
    if (this.flagsGoalMet()) return this.finishStep();
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
    const goal = this.step?.goal;
    const [n, total] =
      goal?.type === "flags" ? [goal.all.filter((f) => this.flags.has(f)).length, goal.all.length] : [this.sheep.filter((s) => s.penned).length, this.sheep.length];
    this.bus.emit("objective", text.replace("{n}", String(n)).replace("{total}", String(total)));
  }

  private async talkTo(person: Person) {
    const talk = currentTalk(person.actor, this.step?.id, this.flags);
    if (!talk) return;
    this.faceTowards(person.tile);
    await this.progress(async () => {
      await this.say(talk.dialog);
      this.setFlags(talk.set, true);
      this.setFlags(talk.unset, false);
      if (talk.do) await this.run(talk.do);
      const goal = this.step?.goal;
      if ((goal?.type === "talk" && goal.actor === person.actor.id) || this.flagsGoalMet()) await this.finishStep();
    });
  }

  private setFlags(flags: Flags | undefined, on: boolean) {
    const list = flagList(flags);
    if (!list.length) return;
    for (const f of list) {
      if (on) this.flags.add(f);
      else this.flags.delete(f);
    }
    if (this.step?.goal.type === "flags") this.showObjective();
    this.showItems();
  }

  /** Le avisa a React qué lleva el jugador (los `items` con su bandera marcada), si cambió. */
  private showItems() {
    const carried = (this.chapter.items ?? []).filter((i) => this.flags.has(i.flag));
    const key = carried.map((i) => i.flag).join("|");
    if (key === this.itemsKey) return;
    this.itemsKey = key;
    this.bus.emit(
      "items",
      carried.map(({ name, color, hint }) => ({ name, color, hint })),
    );
  }

  /** Si la meta del paso es `flags` y ya están todas marcadas. */
  private flagsGoalMet() {
    const goal = this.step?.goal;
    return goal?.type === "flags" && goal.all.every((f) => this.flags.has(f));
  }

  private async run(actions: Action[]) {
    for (const a of actions) await this.runAction(a);
  }

  private async runAction(a: Action) {
    if (a.when && !matches(a.when, this.step?.id, this.flags)) return;
    const cam = this.cameras.main;
    switch (a.type) {
      case "say":
        return this.say(a.dialog);
      case "set":
      case "unset":
        return this.setFlags(a.flag, a.type === "set");
      case "show":
      case "hide": {
        const show = a.type === "show";
        const people = this.peopleIn(a.actor);
        for (const p of people) {
          p.hidden = !show;
          if (show) {
            p.view.setVisible(this.isHere(p)).setAlpha(0);
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
        this.lightingOf.set(this.mapId, a.mode);
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
      case "travel":
        return this.travel(a.map, a.at);
      case "move":
        return this.moveActor(a.actor, a.to, a.ms ?? MOVE_MS);
      case "join":
      case "leave":
        for (const p of this.peopleIn(a.actor)) this.setInParty(p, a.type === "join");
        return;
      case "zoom": {
        this.zoomFactor = a.to;
        const target = this.baseZoom() * a.to;
        // Mientras cambia, los límites sirven para el zoom más alejado; al final se ajustan.
        this.fitBounds(Math.min(cam.zoom, target));
        const ms = a.ms ?? 900;
        cam.zoomTo(target, ms, "Sine.easeInOut");
        await this.wait(ms);
        this.fitBounds();
        return;
      }
    }
  }

  /**
   * Abre un diálogo y espera a que se cierre. Si termina en una elección, aplica las banderas
   * de la respuesta elegida y sigue con su `next`, si tiene.
   */
  private async say(id: string) {
    for (let next: string | undefined = id; next; ) {
      const lines: Line[] | undefined = this.chapter.dialogs[next];
      if (!lines?.length) {
        console.warn(`[novena] No existe el diálogo «${next}»`);
        return;
      }
      const picked = await this.showLines(lines);
      const choice: Choice | undefined = picked === null ? undefined : choicesOf(lines)[picked];
      if (!choice) return;
      this.setFlags(choice.set, true);
      this.setFlags(choice.unset, false);
      next = choice.next;
    }
  }

  /** Le pide a React que muestre las líneas. Devuelve la respuesta elegida, o null si no había elección. */
  private showLines(lines: Line[]) {
    const resolved: ResolvedLine[] = lines.map(({ who, text, choices }) => {
      const extra = choices?.length ? { choices: choices.map((c) => c.text) } : {};
      if (who === "narrator") return { speaker: null, text, color: null, ...extra };
      if (who === "player") return { speaker: this.chapter.player.name, text, color: this.chapter.player.color, ...extra };
      const actor = this.people.get(who)?.actor;
      return { speaker: actor?.name ?? who, text, color: actor?.color ?? null, ...extra };
    });
    const closed = this.bus.once("dialogDone");
    this.bus.emit("dialog", resolved);
    return closed;
  }

  /** Para el atajo de desarrollo: deja el mundo como si el paso ya se hubiera jugado, sin diálogos. */
  private skipStep(step: Step) {
    const goal = step.goal;
    if (goal.type === "herd") this.penAllSheep();
    this.applyAtOnce(step.onStart, step.id);
    // La meta se da por cumplida: las banderas que pide quedan marcadas, y hablar con alguien
    // hace lo mismo que haría su diálogo (banderas y `do`).
    if (goal.type === "flags") this.setFlags(goal.all, true);
    // Si la meta estaba en otro mapa, el jugador queda allá (en la zona, o al lado de la persona).
    if (goal.type === "reach" && (goal.map ?? MAIN_MAP) !== this.mapId) {
      const tile = this.zoneTiles(goal.zone).find((t) => !SOLID.has(this.grids.get(goal.map ?? MAIN_MAP)?.[t[1]]?.[t[0]] ?? "#"));
      if (tile) this.switchMap(goal.map ?? MAIN_MAP, tile);
    }
    if (goal.type === "talk") {
      const person = this.people.get(goal.actor);
      if (person && person.map !== this.mapId) this.goNextTo(person);
      const talk = person && currentTalk(person.actor, step.id, this.flags);
      this.setFlags(talk?.set, true);
      this.setFlags(talk?.unset, false);
      this.applyAtOnce(talk?.do, step.id);
    }
    this.applyAtOnce(step.onDone, step.id);
  }

  /** Deja hecho, sin animación ni diálogos, lo que cambia el mundo en estas acciones (banderas, quién se ve, luz). */
  private applyAtOnce(actions: Action[] | undefined, stepId: string) {
    for (const a of actions ?? []) {
      if (!matches(a.when, stepId, this.flags)) continue;
      if (a.type === "set" || a.type === "unset") this.setFlags(a.flag, a.type === "set");
      else if (a.type === "show" || a.type === "hide") {
        for (const p of this.peopleIn(a.actor)) {
          p.hidden = a.type === "hide";
          p.view.setVisible(this.isHere(p)).setAlpha(1);
          if (!p.hidden && p.actor.floating) this.startBob(p);
        }
      } else if (a.type === "lighting") {
        const l = LIGHT[a.mode];
        this.lightingOf.set(this.mapId, a.mode);
        this.overlay.setFillStyle(l.color, l.alpha);
        this.setGlows(a.mode);
      } else if (a.type === "travel") this.switchMap(a.map, a.at);
      else if (a.type === "move") {
        if (a.actor === "player") this.teleportPlayer(a.to);
        else
          for (const p of this.peopleIn(a.actor)) {
            p.tile = [...a.to];
            this.place(p.view, p.tile, p.actor.floating);
            if (p.actor.floating && !p.hidden) this.startBob(p);
          }
      } else if (a.type === "join" || a.type === "leave") for (const p of this.peopleIn(a.actor)) this.setInParty(p, a.type === "join");
      else if (a.type === "zoom") {
        this.zoomFactor = a.to;
        this.fitZoom();
      }
    }
  }

  // ───────── Ovejas ─────────

  // Cómo se mueve una oveja en cada turno (cada `paceMs`):
  // - Si el jugador está a `fleeRadius` casillas o menos, huye. Prefiere alejarse en línea recta (así,
  //   empujarla desde atrás la lleva hacia adelante), evita pegarse a muros y cercas (si no, se desliza
  //   por el borde hasta una esquina) y, entre caminos parecidos, elige el lado del corral (`homing`).
  // - Si está tranquila (el jugador lejos), casi no se mueve: a veces da un paso al azar. No vuelve sola.
  // - Ayuda: desde `helpAfterMs`, la tendencia a ir hacia el corral al huir crece poco a poco durante
  //   `helpRampMs`. Al final, al acercarse a una oveja, esta va hacia el corral aunque tenga que pasar
  //   cerca del jugador; así nadie se queda trabado con una oveja en un rincón. Solo actúa al acercarse.
  // - Las que ya están en el corral se quedan adentro.
  private sheepTick() {
    const herd = this.chapter.herd;
    if (!herd || this.busy || this.mapId !== MAIN_MAP) return;
    const herding = this.step?.goal.type === "herd";
    const help = herding ? this.herdHelp(herd) : 0;
    if (help > 0 && !this.herdHelpAnnounced) {
      this.herdHelpAnnounced = true;
      if (herd.helpDialog) {
        void this.progress(() => this.say(herd.helpDialog!));
        return;
      }
    }
    for (const s of this.sheep) {
      if (s.moving) continue;
      const options = DIRS.map(([dx, dy]): Tile => [s.tile[0] + dx, s.tile[1] + dy]).filter(
        (t) => this.sheepCanGo(t) && (!s.penned || inZone(t, herd.pen)),
      );
      if (!options.length) continue;
      let choice: Tile | undefined;
      if (manhattan(s.tile, this.playerTile) <= herd.fleeRadius) {
        choice = this.fleeChoice(s, options, herd, help);
        if (choice) s.home = choice;
      } else if (Math.random() < (herd.wander ?? HERD_DEFAULTS.wander)) choice = this.wanderChoice(s, options, herd);
      if (choice) this.moveSheep(s, choice);
    }
  }

  /**
   * Paso de una oveja tranquila: pasta al azar cerca de donde la dejaron (sin irse ni volver al
   * corral) y sin meterse al lado del jugador. Si se alejó de más, vuelve hacia ese lugar.
   */
  private wanderChoice(s: Sheep, options: Tile[], herd: HerdConfig): Tile | undefined {
    const calm = options.filter((t) => manhattan(t, this.playerTile) > herd.fleeRadius);
    if (!calm.length) return undefined;
    if (s.penned) return Phaser.Utils.Array.GetRandom(calm);
    const near = calm.filter((t) => manhattan(t, s.home) <= WANDER_RADIUS);
    if (near.length) return Phaser.Utils.Array.GetRandom(near);
    return calm.sort((a, b) => manhattan(a, s.home) - manhattan(b, s.home))[0];
  }

  /** Cuánta ayuda hay ahora, de 0 (nada) a 1 (toda): crece desde `helpAfterMs` durante `helpRampMs`. */
  private herdHelp(herd: HerdConfig) {
    const after = herd.helpAfterMs ?? HERD_DEFAULTS.helpAfterMs;
    if (after <= 0) return 0;
    const elapsed = this.time.now - this.herdStartedAt - after;
    if (elapsed < 0) return 0;
    const ramp = herd.helpRampMs ?? HERD_DEFAULTS.helpRampMs;
    return ramp <= 0 ? 1 : Math.min(1, elapsed / ramp);
  }

  private fleeChoice(s: Sheep, options: Tile[], herd: HerdConfig, help: number): Tile | undefined {
    // La tendencia a ir hacia el corral empieza en `homing` y llega a 1 con la ayuda completa.
    const base = herd.homing ?? HERD_DEFAULTS.homing;
    const homing = base + (1 - base) * help;
    const [px, py] = this.playerTile;
    const d2 = (t: Tile) => (t[0] - px) ** 2 + (t[1] - py) ** 2;
    const now = d2(s.tile);
    // Cuántos lados de la casilla están cerrados (muro, árbol, cerca…).
    const walls = (t: Tile) => DIRS.filter(([dx, dy]) => SOLID.has(this.tileAt([t[0] + dx, t[1] + dy]))).length;
    const home = this.penDistance(s.tile);
    const score = (t: Tile) => {
      const towardPen = s.penned ? 0 : Math.sign(home - this.penDistance(t));
      // Con ayuda, ir hacia el corral pesa más que alejarse del jugador.
      return d2(t) - now - 1.5 * walls(t) + (3 * homing + 4 * help) * towardPen;
    };
    const pick = (tiles: Tile[]) => {
      if (!tiles.length) return undefined;
      const best = Math.max(...tiles.map(score));
      return Phaser.Utils.Array.GetRandom(tiles.filter((t) => score(t) === best));
    };
    // Nunca hacia el jugador… salvo que la ayuda ya haya empezado y sea el camino al corral
    // (así sale, por ejemplo, de un muro con el jugador al frente).
    const away = options.filter((t) => d2(t) > now);
    const homeward = help > 0 && !s.penned ? options.filter((t) => this.penDistance(t) < home && !away.includes(t)) : [];
    if (away.length || homeward.length) return pick([...away, ...homeward]);
    // …salvo que esté acorralada y el jugador encima: entonces se escabulle por el lado más abierto.
    return manhattan(s.tile, this.playerTile) <= 1 ? pick(options) : undefined;
  }

  /** Distancia de cada casilla al corral caminando (con la puerta abierta), para la tendencia a volver. */
  private measurePenDistance() {
    const pen = this.chapter.herd!.pen;
    const width = this.grid[0]?.length ?? 0;
    const key = (t: Tile) => t[1] * width + t[0];
    const dist = new Map<number, number>();
    const queue: Tile[] = [];
    for (let x = pen.x; x < pen.x + pen.w; x++)
      for (let y = pen.y; y < pen.y + pen.h; y++) {
        dist.set(key([x, y]), 0);
        queue.push([x, y]);
      }
    while (queue.length) {
      const cur = queue.shift()!;
      for (const [dx, dy] of DIRS) {
        const n: Tile = [cur[0] + dx, cur[1] + dy];
        if (dist.has(key(n)) || SOLID.has(this.tileAt(n)) || n[0] < 0 || n[1] < 0 || n[0] >= width) continue;
        dist.set(key(n), dist.get(key(cur))! + 1);
        queue.push(n);
      }
    }
    return (t: Tile) => dist.get(key(t)) ?? Infinity;
  }

  /** Flechas en el borde de la pantalla que apuntan a las ovejas que faltan y no se ven. */
  private updateSheepArrows() {
    if (!this.sheepArrows.length) return;
    const show = this.step?.goal.type === "herd" && !this.busy && this.mapId === MAIN_MAP;
    const cam = this.cameras.main;
    const view = cam.worldView;
    // Márgenes en píxeles de pantalla, pasados al mundo: arriba se deja lugar a la barra y al objetivo.
    const top = (Math.max(this.topInset, 60) + 12) / cam.zoom;
    const side = 18 / cam.zoom;
    this.sheep.forEach((s, i) => {
      const arrow = this.sheepArrows[i];
      const { x, y } = s.view;
      const visible = x >= view.x && x <= view.right && y >= view.y + top * 0.6 && y <= view.bottom;
      if (!show || s.penned || visible) {
        arrow.setVisible(false);
        return;
      }
      const ax = Phaser.Math.Clamp(x, view.x + side, view.right - side);
      const ay = Phaser.Math.Clamp(y, view.y + top, view.bottom - side);
      arrow
        .setVisible(true)
        .setPosition(ax, ay)
        .setRotation(Math.atan2(y - ay, x - ax))
        .setScale(1 / cam.zoom)
        .setAlpha(0.75 + 0.25 * Math.sin(this.time.now / 200));
    });
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
    const playerInside = this.mapId === MAIN_MAP && (inZone(this.playerTile, herd.pen) || herd.gate.some((g) => same(g, this.playerTile)));
    if (playerInside) return this.bus.emit("objective", "Sal del corral para cerrar la puerta");
    this.closeGate();
    void this.progress(() => this.finishStep());
  }

  private closeGate() {
    const main = this.grids.get(MAIN_MAP)!;
    for (const [x, y] of this.chapter.herd?.gate ?? []) main[y][x] = "f";
    this.gateClosed = true;
    if (this.mapId === MAIN_MAP) this.drawMap();
  }

  private penAllSheep() {
    const pen = this.chapter.herd?.pen;
    if (!pen) return;
    this.sheep.forEach((s, i) => {
      this.tweens.killTweensOf(s.view);
      s.moving = false;
      s.tile = [pen.x + 1 + ((i * 2) % Math.max(1, pen.w - 2)), pen.y + 1 + Math.floor((i * 2) / Math.max(1, pen.w - 2))];
      s.penned = true;
      this.place(s.view, s.tile);
    });
    this.closeGate();
  }

  // ───────── Depuración (solo en desarrollo) ─────────

  /** A quién hay que hablarle para avanzar (ver `DebugState.talkTo`). */
  private talkTarget(): Person | undefined {
    const goal = this.step?.goal;
    if (goal?.type === "talk") return this.people.get(goal.actor);
    if (goal?.type !== "flags") return undefined;
    const missing = goal.all.filter((f) => !this.flags.has(f));
    return [...this.people.values()].find((p) => {
      if (p.hidden) return false;
      const talk = currentTalk(p.actor, this.step?.id, this.flags);
      return !!talk && caseSets(this.chapter.dialogs, talk).some((f) => missing.includes(f));
    });
  }

  private debugApi(): NovenaDebug {
    return {
      scene: this,
      state: () => ({
        step: this.step?.id ?? null,
        goal: this.step?.goal.type ?? null,
        talkTo: this.talkTarget()?.actor.id ?? null,
        flags: [...this.flags],
        map: this.mapId,
        busy: this.busy || this.moving || this.justFreed(),
        done: this.done,
        player: [...this.playerTile],
        sheep: { penned: this.sheep.filter((s) => s.penned).length, total: this.sheep.length },
      }),
      completeStep: () => {
        const goal = this.step?.goal;
        if (!goal || this.busy || this.moving) return false;
        if (goal.type === "talk" || goal.type === "flags") {
          const person = this.talkTarget();
          if (person) {
            if (person.map !== this.mapId) this.goNextTo(person);
            void this.talkTo(person);
            return true;
          }
          if (goal.type === "talk") return false;
          // Nadie marca lo que falta hablando: se marcan de una vez.
          void this.progress(async () => {
            this.setFlags(goal.all, true);
            await this.finishStep();
          });
          return true;
        }
        if (goal.type === "reach") {
          const map = goal.map ?? MAIN_MAP;
          if (map !== this.mapId) {
            const first = this.zoneTiles(goal.zone)[0];
            if (!first) return false;
            this.switchMap(map, first);
          }
          const tile = this.zoneTiles(goal.zone).find((t) => this.walkable(t));
          if (!tile) return false;
          this.teleportPlayer(tile);
          this.afterPlayerMove();
          return true;
        }
        if (goal.type === "herd") {
          const herd = this.chapter.herd;
          if (!herd) return false;
          // Si el jugador quedó dentro del corral (o en otro mapa), sale por la puerta antes de cerrarla.
          if (this.mapId !== MAIN_MAP) this.switchMap(MAIN_MAP, this.chapter.player.at);
          if (inZone(this.playerTile, herd.pen) || herd.gate.some((g) => same(g, this.playerTile))) {
            const out = herd.gate
              .flatMap(([gx, gy]) => DIRS.map(([dx, dy]): Tile => [gx + dx, gy + dy]))
              .find((t) => this.walkable(t) && !inZone(t, herd.pen) && !herd.gate.some((g) => same(g, t)));
            if (!out) return false;
            this.teleportPlayer(out);
          }
          this.penAllSheep();
          void this.progress(() => this.finishStep());
          return true;
        }
        return false;
      },
      teleport: (tile) => this.teleportPlayer(tile),
      screenPoint: (tile) => {
        const cam = this.cameras.main;
        const rect = this.game.canvas.getBoundingClientRect();
        const { x, y } = center(tile);
        return { x: rect.left + (x - cam.worldView.x) * cam.zoom, y: rect.top + (y - cam.worldView.y) * cam.zoom };
      },
      actorTile: (id) => {
        const p = this.people.get(id);
        return p && p.map === this.mapId ? [...p.tile] : null;
      },
    };
  }

  /** Casillas de una zona, fila por fila. */
  private zoneTiles({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
    const tiles: Tile[] = [];
    for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) tiles.push([tx, ty]);
    return tiles;
  }

  /** Lleva al jugador, al instante, al mapa de una persona y a una casilla a su lado. */
  private goNextTo(person: Person) {
    this.switchMap(person.map, person.tile);
    const side = DIRS.map(([dx, dy]): Tile => [person.tile[0] + dx, person.tile[1] + dy]).find((t) => this.walkable(t));
    if (side) this.teleportPlayer(side);
  }

  private teleportPlayer(tile: Tile) {
    this.clearPath();
    this.playerTile = [...tile];
    this.place(this.player, tile);
    this.updateLabels();
  }

  // ───────── Mundo ─────────

  private tileAt([x, y]: Tile) {
    return this.grid[y]?.[x] ?? "#";
  }

  private personAt(t: Tile, includeFloating = false) {
    for (const p of this.people.values()) {
      if (this.isHere(p) && same(p.tile, t) && (includeFloating || !p.actor.floating)) return p;
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
    return [...this.people.values()].filter((p) => this.isHere(p) && manhattan(p.tile, this.playerTile) === 1);
  }

  private sheepAt(t: Tile) {
    return this.mapId === MAIN_MAP && this.sheep.some((s) => same(s.tile, t));
  }

  /** Casilla que el jugador puede pisar (las ovejas se revisan aparte porque se mueven). */
  private walkable(t: Tile) {
    return !SOLID.has(this.tileAt(t)) && !this.blockerAt(t);
  }

  /** Alguien que tapa el paso en esta casilla. Los que acompañan no: el jugador pasa y ellos lo siguen. */
  private blockerAt(t: Tile) {
    const p = this.personAt(t);
    return p && !this.party.includes(p) ? p : undefined;
  }

  private sheepCanGo(t: Tile) {
    return this.walkable(t) && !this.personAt(t) && !same(t, this.playerTile) && !this.sheepAt(t);
  }

  // ───────── Personajes que caminan y acompañan ─────────

  /** Suma o saca a alguien de los que acompañan al jugador. */
  private setInParty(p: Person, on: boolean) {
    this.party = this.party.filter((x) => x !== p);
    if (on) this.party.push(p);
  }

  /** Cuando el jugador da un paso desde `from`, cada acompañante pasa a donde estaba el de adelante. */
  private followPlayer(from: Tile) {
    let lead = from;
    for (const p of this.party) {
      if (p.map !== this.mapId || same(p.tile, lead)) break;
      const prev = p.tile;
      p.tile = [...lead];
      this.stepView(p.view, lead, STEP_MS * 1.2, p.actor.floating);
      lead = prev;
    }
  }

  /** Mueve una figura a una casilla con una animación corta. */
  private stepView(view: Figure, to: Tile, ms: number, floating = false) {
    const c = center(to);
    return this.tweenAsync({
      targets: view,
      x: c.x,
      y: c.y,
      duration: ms,
      onUpdate: () => view.setDepth(floating ? 1002 : 10 + view.y),
    } as Phaser.Types.Tweens.TweenBuilderConfig);
  }

  /** Acción `move`: camina (por casillas libres) hasta `to` y espera a que llegue. */
  private async moveActor(id: string, to: Tile, ms: number) {
    if (id === "player") {
      const route = this.findPath([to]);
      if (!route) return void this.teleportPlayer(to);
      for (const t of route) {
        this.faceTowards(t);
        this.followPlayer(this.playerTile);
        this.playerTile = t;
        await this.stepView(this.player, t, ms);
      }
      this.updateLabels();
      return;
    }
    for (const p of this.peopleIn(id)) {
      this.setInParty(p, false);
      // Si no está en el mapa del jugador, o flota, o no hay camino, llega de una.
      const route = p.map === this.mapId && !p.actor.floating ? this.routeFor(p, to) : null;
      if (!route) {
        const from = p.tile;
        p.tile = [...to];
        if (p.map === this.mapId && p.actor.floating) {
          p.bob?.stop();
          await this.stepView(p.view, to, ms * Math.max(1, manhattan(from, to)), true);
          if (!p.hidden) this.startBob(p);
        } else this.place(p.view, to, p.actor.floating);
        continue;
      }
      for (const t of route) {
        p.tile = t;
        await this.stepView(p.view, t, ms);
      }
    }
    this.updateLabels();
  }

  /** Camino de un personaje hasta una casilla, sin pasar por muros, otras personas, ovejas ni el jugador. */
  private routeFor(p: Person, to: Tile): Tile[] | null {
    const w = this.grid[0].length;
    const key = (t: Tile) => t[1] * w + t[0];
    const free = (t: Tile) => !SOLID.has(this.tileAt(t)) && !same(t, this.playerTile) && !this.sheepAt(t) && (this.personAt(t) ?? p) === p;
    const prev = new Map<number, Tile | null>([[key(p.tile), null]]);
    const queue: Tile[] = [p.tile];
    while (queue.length) {
      const cur = queue.shift()!;
      if (same(cur, to)) {
        const route: Tile[] = [];
        for (let t: Tile | null = cur; t && !same(t, p.tile); t = prev.get(key(t)) ?? null) route.unshift(t);
        return route;
      }
      for (const [dx, dy] of DIRS) {
        const n: Tile = [cur[0] + dx, cur[1] + dy];
        if (prev.has(key(n)) || !free(n)) continue;
        prev.set(key(n), cur);
        queue.push(n);
      }
    }
    return null;
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
        // Las ovejas estorban, salvo si el destino es justo donde está una (tocar una oveja).
        if (prev.has(key(n)) || !this.walkable(n) || (this.sheepAt(n) && !goalKeys.has(key(n)))) continue;
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
        if (c === "d") {
          g.fillStyle(0x6b4a2b).fillRect(px + 2, py + 1, TILE - 4, TILE - 1);
          g.fillStyle(0x8a6239).fillRect(px + 4, py + 3, TILE - 8, TILE - 3);
          g.fillStyle(0xe8c26a).fillRect(px + TILE - 7, py + 9, 2, 2);
        }
        if (c === "*") {
          g.fillStyle(0x5d5a55).fillCircle(px + 8, py + 9, 6);
          g.fillStyle(0xe8862a).fillCircle(px + 8, py + 8, 4);
          g.fillStyle(0xffd36b).fillCircle(px + 8, py + 9, 2);
        }
      }),
    );
  }

  private makeFigure(color: number, kind: "person" | "player" | "angel" | "sheep" | "object", name?: string): Figure {
    const parts: Phaser.GameObjects.GameObject[] = [this.add.ellipse(0, 6, 12, 4, 0x000000, 0.25)];
    if (kind === "object") {
      // Una caja con borde, para que se distinga de las personas.
      parts.push(this.add.rectangle(0, 2, 10, 9, color).setStrokeStyle(1, 0x2a1d07), this.add.rectangle(0, -1, 10, 2, 0xffffff, 0.25));
    } else if (kind === "sheep") {
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
        .text(0, kind === "object" ? -6 : -15, name, { fontFamily: "monospace", fontSize: "6px", color: "#ffffff", stroke: "#00000099", strokeThickness: 2 })
        .setOrigin(0.5, 1)
        .setResolution(4)
        .setName("label");
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

  /** El nombre de cada personaje se ve solo cuando el jugador está cerca, para que no se encimen. */
  private updateLabels() {
    for (const p of this.people.values()) {
      const label = p.view.getByName("label") as Phaser.GameObjects.Text | null;
      label?.setVisible(manhattan(p.tile, this.playerTile) <= LABEL_RANGE);
    }
  }

  private startBob(p: Person) {
    p.bob?.stop();
    const c = center(p.tile);
    p.view.y = c.y;
    p.bob = this.tweens.add({ targets: p.view, y: c.y - 3, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.inOut" });
  }

  /** Textura de un círculo blanco que se desvanece hacia afuera, para las luces. Se crea una vez. */
  private glowTexture() {
    const key = "nv-glow";
    if (this.textures.exists(key)) return key;
    const size = 64;
    const tex = this.textures.createCanvas(key, size, size)!;
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.45, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
    return key;
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
