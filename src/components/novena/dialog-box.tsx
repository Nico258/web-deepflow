"use client";

import { useCallback, useEffect, useState } from "react";
import type { ResolvedLine } from "@/game/novena/bus";

const CHAR_MS = 22;

const hex = (color: number) => `#${color.toString(16).padStart(6, "0")}`;

// Caja de diálogo al estilo de los juegos: el texto aparece letra por letra y se avanza
// tocando la pantalla o con Espacio, Enter o E. Mientras está abierta, el juego no se mueve.
export function DialogBox({ lines, onDone }: { lines: ResolvedLine[]; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const line = lines[index];
  const full = shown >= line.text.length;

  useEffect(() => {
    if (full) return;
    const timer = window.setTimeout(() => setShown((n) => n + 1), CHAR_MS);
    return () => window.clearTimeout(timer);
  }, [full, shown]);

  const advance = useCallback(() => {
    if (!full) return setShown(line.text.length);
    if (index < lines.length - 1) {
      setIndex(index + 1);
      setShown(0);
    } else onDone();
  }, [full, index, line.text.length, lines.length, onDone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || ![" ", "Enter", "e", "E"].includes(e.key)) return;
      e.preventDefault();
      advance();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance]);

  return (
    <div className="nv-dialog-layer" onPointerDown={advance}>
      <div className={`nv-dialog${line.speaker ? "" : " nv-dialog--narrator"}`} role="dialog" aria-live="polite">
        {line.speaker && (
          <div className="nv-dialog-speaker">
            <span className="nv-portrait" style={{ background: line.color === null ? undefined : hex(line.color) }} aria-hidden="true" />
            {line.speaker}
          </div>
        )}
        <p>
          {line.text.slice(0, shown)}
          <span className="nv-dialog-rest" aria-hidden="true">
            {line.text.slice(shown)}
          </span>
        </p>
        <span className={`nv-dialog-next${full ? " is-ready" : ""}`} aria-hidden="true">
          ▼
        </span>
      </div>
    </div>
  );
}
