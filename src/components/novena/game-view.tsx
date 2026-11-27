"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowCounterClockwise, Lightbulb, List } from "@phosphor-icons/react";
import { Modal } from "@/components/modal";
import { DialogBox } from "@/components/novena/dialog-box";
import { NovenaBus, type CarriedItem, type ResolvedLine } from "@/game/novena/bus";
import type { Chapter, ChapterInfo } from "@/game/novena/types";
import { chapterLabel } from "@/data/novena/chapters";

type Props = {
  info: ChapterInfo;
  chapter: Chapter;
  /** Solo en desarrollo: id del paso donde empezar. */
  startAt?: string;
  next?: ChapterInfo;
  onExit: () => void;
  onComplete: (slug: string) => void;
  onPlay: (info: ChapterInfo) => void;
};

// Pantalla completa del capítulo: el lienzo de Phaser y, encima, la interfaz en React
// (barra superior, objetivo con su pista, lo que lleva el jugador, diálogos, menú de pausa y cierre).
// Las ventanas usan <dialog> nativo (components/modal.tsx): atrapan el foco y se cierran con
// Escape o «atrás».

const hex = (color: number) => `#${color.toString(16).padStart(6, "0")}`;
/** Cuánto se ve la pista de un objeto antes de cerrarse sola. */
const TIP_MS = 5000;
export function GameView({ info, chapter, startAt, next, onExit, onComplete, onPlay }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [bus] = useState(() => new NovenaBus());
  const [dialog, setDialog] = useState<{ id: number; lines: ResolvedLine[] } | null>(null);
  const [objective, setObjective] = useState<string | null>(null);
  const [items, setItems] = useState<CarriedItem[]>([]);
  /** El objeto cuya pista se está leyendo (por su nombre). */
  const [tip, setTip] = useState<string | null>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  /** Debajo de la barra: el objetivo y, a la derecha, lo que lleva el jugador. */
  const topRef = useRef<HTMLDivElement>(null);
  /** Pista del paso actual; `show`: si se ve debajo del objetivo (sola, tras un rato, o pedida en el menú). */
  const [hint, setHint] = useState<{ text: string | null; show: boolean }>({ text: null, show: false });
  const [finished, setFinished] = useState(false);
  /** Menú de pausa abierto: el juego se detiene. */
  const [menuOpen, setMenuOpen] = useState(false);
  const [round, setRound] = useState(0);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | undefined;
    let dialogs = 0;
    const offs = [
      bus.on("dialog", (lines) => setDialog({ id: ++dialogs, lines })),
      bus.on("objective", setObjective),
      bus.on("items", setItems),
      bus.on("hint", setHint),
      bus.on("complete", () => {
        setFinished(true);
        onCompleteRef.current(info.slug);
      }),
    ];
    // Phaser solo existe en el navegador: se carga aquí y no al importar el componente.
    void import("@/game/novena/chapter-scene").then(({ startChapter }) => {
      if (cancelled || !hostRef.current) return;
      stop = startChapter(hostRef.current, { chapter, bus, startAt: round === 0 ? startAt : undefined });
    });
    return () => {
      cancelled = true;
      offs.forEach((off) => off());
      stop?.();
      setDialog(null);
      setObjective(null);
      setItems([]);
      setTip(null);
      setHint({ text: null, show: false });
      setFinished(false);
    };
  }, [bus, chapter, info.slug, startAt, round]);

  // Le dice al juego cuánto ocupan arriba la barra, el objetivo y lo que lleva el jugador, para que
  // la cámara no deje al jugador (ni el borde del mapa) debajo. Mientras no se ven (en un diálogo),
  // se guarda su lugar con el último alto medido, para que la cámara no salte.
  const topSpace = useRef(48);
  const hintShown = !!hint.text && hint.show;
  const showTop = !dialog && (!!objective || items.length > 0 || hintShown);
  useEffect(() => {
    const hud = hudRef.current;
    const below = topRef.current;
    if (!hud || !below) return;
    const measure = () => {
      const top = hud.parentElement!.getBoundingClientRect().top;
      const hudBottom = hud.getBoundingClientRect().bottom - top;
      if (below.querySelector(".nv-objective, .nv-hint, .nv-items")) topSpace.current = below.getBoundingClientRect().bottom - top - hudBottom;
      bus.emit("hudInset", Math.round(hudBottom + topSpace.current + 8));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(hud);
    ro.observe(below);
    return () => ro.disconnect();
  }, [bus, showTop, hintShown, round]);

  // La pista de un objeto se cierra sola, con Escape o al tocar en otro lado.
  useEffect(() => {
    if (!tip) return;
    const timer = window.setTimeout(() => setTip(null), TIP_MS);
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !(e.target as HTMLElement).closest(".nv-items")) setTip(null);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [tip]);
  const tipItem = items.find((i) => i.name === tip);

  // Mientras se juega, la página de fondo no se desplaza.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Mientras el menú está abierto, el juego se detiene (ovejas, animaciones, teclado).
  useEffect(() => {
    bus.emit("pause", menuOpen);
  }, [bus, menuOpen]);

  // Escape abre el menú (dentro del menú, Escape lo cierra: eso lo hace el <dialog>).
  useEffect(() => {
    if (menuOpen || finished) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.repeat && !tip) setMenuOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, finished, tip]);

  const closeDialog = useCallback(
    (choice: number | null) => {
      setDialog(null);
      bus.emit("dialogDone", choice);
    },
    [bus],
  );

  return (
    <div className="nv-game">
      <div className="nv-canvas" ref={hostRef} />

      <div className="nv-hud" ref={hudRef}>
        {finished ? (
          <button type="button" className="nv-btn nv-btn--small" onClick={onExit}>
            <ArrowLeft size={16} weight="bold" aria-hidden="true" /> Mapa
          </button>
        ) : (
          <button type="button" className="nv-btn nv-btn--small" onClick={() => setMenuOpen(true)}>
            <List size={16} weight="bold" aria-hidden="true" /> Menú
          </button>
        )}
        <span className="nv-hud-title">
          {chapterLabel(info)} · {info.title}
        </span>
      </div>

      {/* Región viva fija: el lector de pantalla anuncia cada objetivo nuevo (y la pista cuando aparece),
          aunque la caja visible se oculte durante los diálogos. */}
      <p className="visually-hidden" role="status">
        {objective ? `Objetivo: ${objective}` : ""}
        {objective && hintShown ? `. Pista: ${hint.text}` : ""}
      </p>

      <div className="nv-top" ref={topRef}>
        {objective && !dialog && (
          <p className="nv-objective" aria-hidden="true">
            <span>✦</span> {objective}
          </p>
        )}
        {hintShown && !dialog && (
          <p className="nv-hint" aria-hidden="true">
            <Lightbulb size={14} weight="fill" /> {hint.text}
          </p>
        )}
        {items.length > 0 && !dialog && (
          // Solo informa: tocar un objeto recuerda para qué sirve.
          <div className="nv-items" role="group" aria-label="Lo que llevas">
            {items.map((item) => (
              <button
                key={item.name}
                type="button"
                className="nv-item"
                aria-label={item.name}
                aria-expanded={tip === item.name}
                aria-controls="nv-item-tip"
                onClick={() => setTip(tip === item.name ? null : item.name)}
              >
                <span style={{ background: hex(item.color) }} aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
        <p id="nv-item-tip" className="nv-item-tip" role="status" hidden={!tipItem || !!dialog}>
          {tipItem && (
            <>
              <strong>{tipItem.name}</strong>
              {tipItem.hint && <> · {tipItem.hint}</>}
            </>
          )}
        </p>
      </div>

      {dialog && <DialogBox key={dialog.id} lines={dialog.lines} onDone={closeDialog} active={!menuOpen} />}

      {menuOpen && (
        <Modal className="nv-modal nv-menu" aria-labelledby="nv-menu-title" onClose={() => setMenuOpen(false)}>
          <h2 id="nv-menu-title">Pausa</h2>
          {objective && (
            <p className="nv-menu-objective">
              <span aria-hidden="true">✦</span> {objective}
            </p>
          )}
          {hint.text &&
            (hint.show ? (
              <p className="nv-menu-hint" id="nv-menu-hint" tabIndex={-1}>
                <Lightbulb size={16} weight="fill" aria-hidden="true" /> {hint.text}
              </p>
            ) : (
              <button
                type="button"
                className="nv-btn nv-btn--ghost nv-menu-hint-btn"
                onClick={() => {
                  setHint({ ...hint, show: true });
                  // El botón desaparece: el foco pasa a la pista, para no perderlo.
                  requestAnimationFrame(() => document.getElementById("nv-menu-hint")?.focus());
                }}
              >
                <Lightbulb size={16} weight="fill" aria-hidden="true" /> Ver una pista
              </button>
            ))}
          <div className="nv-modal-actions">
            <button type="button" className="nv-btn nv-btn--primary" onClick={() => setMenuOpen(false)} data-autofocus>
              Seguir jugando
            </button>
            <button
              type="button"
              className="nv-btn"
              onClick={() => {
                setMenuOpen(false);
                setRound((r) => r + 1);
              }}
            >
              <ArrowCounterClockwise size={16} weight="bold" aria-hidden="true" /> Empezar de nuevo
            </button>
            <button type="button" className="nv-btn" onClick={onExit}>
              <ArrowLeft size={16} weight="bold" aria-hidden="true" /> Salir al mapa
            </button>
          </div>
          <p className="nv-menu-note">Si sales o empiezas de nuevo, el avance dentro del capítulo no se guarda.</p>
        </Modal>
      )}

      {finished && (
        // Solo se cierra con sus botones; Escape o «atrás» vuelven al mapa.
        <Modal className="nv-modal nv-ending" aria-labelledby="nv-ending-title" dismissible={false} onClose={onExit}>
            <p className="nv-kicker">{chapterLabel(info)} completado</p>
            <h2 id="nv-ending-title">{info.title}</h2>
            <blockquote>
              <p>{chapter.ending.verse}</p>
              <footer>
                {chapter.ending.reference} <small>· Nueva Traducción Viviente © Tyndale House Foundation</small>
              </footer>
            </blockquote>
            <p className="nv-reflection">{chapter.ending.reflection}</p>
            <div className="nv-ending-actions">
              {next &&
                (next.load ? (
                  <button type="button" className="nv-btn nv-btn--primary" onClick={() => onPlay(next)} data-autofocus>
                    Siguiente: {next.title} <ArrowRight size={16} weight="bold" aria-hidden="true" />
                  </button>
                ) : (
                  <span className="nv-soon">
                    {chapterLabel(next)}: {next.title} · Próximamente
                  </span>
                ))}
              <button type="button" className="nv-btn" onClick={onExit} data-autofocus={next?.load ? undefined : true}>
                Volver al mapa
              </button>
              <button type="button" className="nv-btn nv-btn--ghost" onClick={() => setRound((r) => r + 1)}>
                <ArrowCounterClockwise size={16} weight="bold" aria-hidden="true" /> Jugar de nuevo
              </button>
            </div>
        </Modal>
      )}
    </div>
  );
}
