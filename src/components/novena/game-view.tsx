"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowCounterClockwise } from "@phosphor-icons/react";
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
// (barra superior con lo que lleva el jugador, objetivo, diálogos, «¿Salir del capítulo?» y cierre).
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
  const [finished, setFinished] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
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
      setFinished(false);
    };
  }, [bus, chapter, info.slug, startAt, round]);

  // Le dice al juego cuánto ocupan arriba la barra, el objetivo y lo que lleva el jugador, para que
  // la cámara no deje al jugador (ni el borde del mapa) debajo. Mientras no se ven (en un diálogo),
  // se guarda su lugar con el último alto medido, para que la cámara no salte.
  const topSpace = useRef(48);
  const showTop = !dialog && (!!objective || items.length > 0);
  useEffect(() => {
    const hud = hudRef.current;
    const below = topRef.current;
    if (!hud || !below) return;
    const measure = () => {
      const top = hud.parentElement!.getBoundingClientRect().top;
      const hudBottom = hud.getBoundingClientRect().bottom - top;
      if (below.querySelector(".nv-objective, .nv-items")) topSpace.current = below.getBoundingClientRect().bottom - top - hudBottom;
      bus.emit("hudInset", Math.round(hudBottom + topSpace.current + 8));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(hud);
    ro.observe(below);
    return () => ro.disconnect();
  }, [bus, showTop, round]);

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

  // Mientras se pregunta si salir, el juego se detiene (ovejas, animaciones, teclado).
  useEffect(() => {
    bus.emit("pause", confirmExit);
  }, [bus, confirmExit]);

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
        <button type="button" className="nv-btn nv-btn--small" onClick={() => (finished ? onExit() : setConfirmExit(true))}>
          <ArrowLeft size={16} weight="bold" aria-hidden="true" /> Mapa
        </button>
        <span className="nv-hud-title">
          {chapterLabel(info)} · {info.title}
        </span>
      </div>

      <div className="nv-top" ref={topRef}>
        {objective && !dialog && (
          <p className="nv-objective" role="status">
            <span aria-hidden="true">✦</span> {objective}
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

      {dialog && <DialogBox key={dialog.id} lines={dialog.lines} onDone={closeDialog} active={!confirmExit} />}

      {confirmExit && (
        <Modal className="nv-modal nv-confirm" aria-labelledby="nv-exit-title" onClose={() => setConfirmExit(false)}>
          <h2 id="nv-exit-title">¿Salir del capítulo?</h2>
          <p>Vuelves al mapa. El avance dentro del capítulo no se guarda: la próxima vez empieza desde el principio.</p>
          <div className="nv-modal-actions">
            <button type="button" className="nv-btn nv-btn--primary" onClick={() => setConfirmExit(false)} data-autofocus>
              Seguir jugando
            </button>
            <button type="button" className="nv-btn" onClick={onExit}>
              Salir al mapa
            </button>
          </div>
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
