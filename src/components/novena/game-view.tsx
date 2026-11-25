"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowCounterClockwise } from "@phosphor-icons/react";
import { DialogBox } from "@/components/novena/dialog-box";
import { NovenaBus, type ResolvedLine } from "@/game/novena/bus";
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
// (barra superior, objetivo, diálogos y cierre).
export function GameView({ info, chapter, startAt, next, onExit, onComplete, onPlay }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [bus] = useState(() => new NovenaBus());
  const [dialog, setDialog] = useState<{ id: number; lines: ResolvedLine[] } | null>(null);
  const [objective, setObjective] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
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
      setFinished(false);
    };
  }, [bus, chapter, info.slug, startAt, round]);

  // Mientras se juega, la página de fondo no se desplaza.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const closeDialog = useCallback(() => {
    setDialog(null);
    bus.emit("dialogDone");
  }, [bus]);

  return (
    <div className="nv-game">
      <div className="nv-canvas" ref={hostRef} />

      <div className="nv-hud">
        <button type="button" className="nv-btn nv-btn--small" onClick={onExit}>
          <ArrowLeft size={16} weight="bold" aria-hidden="true" /> Mapa
        </button>
        <span className="nv-hud-title">
          {chapterLabel(info)} · {info.title}
        </span>
      </div>

      {objective && !dialog && (
        <p className="nv-objective" role="status">
          <span aria-hidden="true">✦</span> {objective}
        </p>
      )}

      {dialog && <DialogBox key={dialog.id} lines={dialog.lines} onDone={closeDialog} />}

      {finished && (
        <div className="nv-ending-layer">
          <section className="nv-ending" aria-labelledby="nv-ending-title">
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
                  <button type="button" className="nv-btn nv-btn--primary" onClick={() => onPlay(next)}>
                    Siguiente: {next.title} <ArrowRight size={16} weight="bold" aria-hidden="true" />
                  </button>
                ) : (
                  <span className="nv-soon">
                    {chapterLabel(next)}: {next.title} · Próximamente
                  </span>
                ))}
              <button type="button" className="nv-btn" onClick={onExit}>
                Volver al mapa
              </button>
              <button type="button" className="nv-btn nv-btn--ghost" onClick={() => setRound((r) => r + 1)}>
                <ArrowCounterClockwise size={16} weight="bold" aria-hidden="true" /> Jugar de nuevo
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
