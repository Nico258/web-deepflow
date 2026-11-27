"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Play, ArrowCounterClockwise } from "@phosphor-icons/react";
import { GameView } from "@/components/novena/game-view";
import { chapterLabel, chapters } from "@/data/novena/chapters";
import type { Chapter, ChapterInfo } from "@/game/novena/types";
import { useNovenaProgress } from "@/hooks/use-novena-progress";

const main = chapters.filter((c) => !c.bonus);

type Playing = { info: ChapterInfo; chapter: Chapter; startAt?: string };

/** Solo en desarrollo: /novena?cap=plantilla juega `_plantilla.ts`, sin guardarla como completada. */
const PLANTILLA: ChapterInfo | undefined =
  process.env.NODE_ENV === "production"
    ? undefined
    : {
        number: 0,
        slug: "plantilla",
        title: "Plantilla",
        place: "Prueba",
        playAs: "Personaje",
        passage: "—",
        summary: "La plantilla de capítulos, para probar el motor.",
        mapAt: { x: 0, y: 0 },
        load: () => import("@/data/novena/capitulos/_plantilla").then((m) => m.default),
      };

// Mapa de capítulos y, al elegir uno, el juego a pantalla completa.
// Nada se bloquea: la estrella solo marca el primer capítulo sin completar.
export function NovenaApp() {
  const { ready, completed, complete } = useNovenaProgress();
  const [selected, setSelected] = useState<ChapterInfo | null>(null);
  const [playing, setPlaying] = useState<Playing | null>(null);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  const doneCount = main.filter((c) => completed[c.slug]).length;
  // La estrella va al primer capítulo jugable sin completar (los «Próximamente» se saltan).
  const nextUp = [...main, ...chapters.filter((c) => c.bonus)].find((c) => c.load && !completed[c.slug]) ?? null;

  const play = useCallback(async (info: ChapterInfo, startAt?: string) => {
    if (!info.load) return;
    setLoading(true);
    try {
      const chapter = await info.load();
      // En desarrollo, el validador avisa en la consola de errores del guion (spec 07 §3).
      if (process.env.NODE_ENV !== "production") {
        const { validateChapter } = await import("@/game/novena/validate");
        const { errors, warnings } = validateChapter(chapter);
        errors.forEach((e) => console.error(`[novena] ${chapterLabel(info)}: ${e}`));
        warnings.forEach((w) => console.warn(`[novena] ${chapterLabel(info)}: ${w}`));
      }
      setSelected(info);
      setPlaying({ info, chapter, startAt });
    } finally {
      setLoading(false);
    }
  }, []);

  // Atajo de desarrollo (spec 07 §3): /novena?cap=8&paso=volver, o ?cap=plantilla
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const params = new URLSearchParams(window.location.search);
    const cap = params.get("cap");
    const info = cap === "plantilla" ? PLANTILLA : chapters.find((c) => String(c.number) === cap);
    if (!info) return;
    const timer = window.setTimeout(() => void play(info, params.get("paso") ?? undefined), 0);
    return () => window.clearTimeout(timer);
  }, [play]);

  const select = (info: ChapterInfo) => {
    setSelected(info);
    requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
  };

  if (playing) {
    const i = chapters.indexOf(playing.info);
    const isTemplate = playing.info === PLANTILLA;
    return (
      <GameView
        key={playing.info.slug}
        info={playing.info}
        chapter={playing.chapter}
        startAt={playing.startAt}
        next={isTemplate ? undefined : chapters[i + 1]}
        onExit={() => setPlaying(null)}
        onComplete={isTemplate ? () => {} : complete}
        onPlay={(info) => void play(info)}
      />
    );
  }

  const current = selected ?? nextUp ?? main[0];

  return (
    <div className="nv-board">
      <div className="nv-map" role="group" aria-label="Mapa de capítulos">
        <div className="nv-map-sea" aria-hidden="true" />
        <div className="nv-map-lake" aria-hidden="true" />
        <div className="nv-map-river" aria-hidden="true" />
        <div className="nv-map-deadsea" aria-hidden="true" />
        <span className="nv-map-region" style={{ left: "26%", top: "4%" }}>
          Galilea
        </span>
        <span className="nv-map-region" style={{ left: "16%", top: "52%" }}>
          Judea
        </span>
        <svg className="nv-map-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline points="44,23 54,44 52,64 46,80 38,89" />
        </svg>

        {chapters.map((c) => {
          const done = !!completed[c.slug];
          const isNext = ready && nextUp?.slug === c.slug;
          return (
            <button
              key={c.slug}
              type="button"
              className={`nv-spot${done ? " is-done" : ""}${current.slug === c.slug ? " is-selected" : ""}${c.load ? "" : " is-soon"}${c.bonus ? " is-bonus" : ""}`}
              style={{ left: `${c.mapAt.x}%`, top: `${c.mapAt.y}%` }}
              onClick={() => select(c)}
              aria-label={`${chapterLabel(c)}: ${c.title}${done ? ", completado" : ""}${c.load ? "" : ", próximamente"}`}
              aria-pressed={current.slug === c.slug}
            >
              {isNext && (
                <span className="nv-star" aria-hidden="true">
                  ✦
                </span>
              )}
              <span className="nv-spot-mark" aria-hidden="true">
                {done ? <Check size={14} weight="bold" /> : c.bonus ? "★" : c.number}
              </span>
              <span className="nv-spot-name">{c.place}</span>
            </button>
          );
        })}
      </div>

      <aside className="nv-panel" ref={panelRef} aria-live="polite">
        <p className="nv-progress">
          {doneCount} de {main.length} capítulos
        </p>
        <p className="nv-kicker">
          {chapterLabel(current)}
          {nextUp?.slug === current.slug && " · Sigue aquí ✦"}
        </p>
        <h2>{current.title}</h2>
        <p className="nv-summary">{current.summary}</p>
        <dl className="nv-facts">
          <div>
            <dt>Lugar</dt>
            <dd>{current.place}</dd>
          </div>
          <div>
            <dt>Juegas como</dt>
            <dd>{current.playAs}</dd>
          </div>
          <div>
            <dt>Pasaje</dt>
            <dd>{current.passage}</dd>
          </div>
        </dl>
        {current.load ? (
          <button type="button" className="nv-btn nv-btn--primary nv-play" onClick={() => void play(current)} disabled={loading}>
            {completed[current.slug] ? (
              <>
                <ArrowCounterClockwise size={18} weight="bold" aria-hidden="true" /> Jugar de nuevo
              </>
            ) : (
              <>
                <Play size={18} weight="fill" aria-hidden="true" /> {loading ? "Cargando…" : "Jugar"}
              </>
            )}
          </button>
        ) : (
          <p className="nv-soon">Próximamente</p>
        )}
        <p className="nv-hint">Unos 5 minutos. En el celular, toca para caminar; en el computador, usa las flechas y Espacio.</p>
      </aside>
    </div>
  );
}
