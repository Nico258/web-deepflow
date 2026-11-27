"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { ResolvedLine } from "@/game/novena/bus";

const CHAR_MS = 22;

const hex = (color: number) => `#${color.toString(16).padStart(6, "0")}`;

// Caja de diálogo al estilo de los juegos: el texto aparece letra por letra y se avanza
// tocando la pantalla o con Espacio, Enter o E. Mientras está abierta, el juego no se mueve.
// Si la última línea trae respuestas para elegir, se muestran como botones: se toca una, o se
// elige con las flechas y Enter (o con su número). `onDone` recibe la elegida (desde 0) o null.
// `active={false}` deja de escuchar el teclado, por ejemplo mientras hay una ventana encima.
export function DialogBox({ lines, onDone, active = true }: { lines: ResolvedLine[]; onDone: (choice: number | null) => void; active?: boolean }) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0);
  const choicesRef = useRef<HTMLDivElement>(null);
  const line = lines[index];
  const full = shown >= line.text.length;
  const last = index === lines.length - 1;
  /** Las respuestas, cuando ya se puede elegir: en la última línea y con el texto completo. */
  const choices = full && last && line.choices?.length ? line.choices : null;

  useEffect(() => {
    if (full) return;
    const timer = window.setTimeout(() => setShown((n) => n + 1), CHAR_MS);
    return () => window.clearTimeout(timer);
  }, [full, shown]);

  const advance = useCallback(() => {
    if (!full) return setShown(line.text.length);
    if (!last) {
      setIndex(index + 1);
      setShown(0);
    } else if (!line.choices?.length) onDone(null);
  }, [full, last, index, line.text.length, line.choices, onDone]);

  // Al aparecer las respuestas, el foco va a la primera (así se eligen con el teclado o el lector de pantalla).
  useEffect(() => {
    if (choices && active) choicesRef.current?.querySelector("button")?.focus();
  }, [choices, active]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (choices) {
        // Enter y Espacio los maneja el botón con foco; aquí, los números.
        const n = Number(e.key);
        if (Number.isInteger(n) && n >= 1 && n <= choices.length) {
          e.preventDefault();
          onDone(n - 1);
        }
        return;
      }
      if (![" ", "Enter", "e", "E"].includes(e.key)) return;
      e.preventDefault();
      advance();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, advance, choices, onDone]);

  /** Flechas arriba y abajo para moverse entre las respuestas. */
  const onChoicesKey = (e: ReactKeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const buttons = [...(choicesRef.current?.querySelectorAll("button") ?? [])];
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    buttons[(at + (e.key === "ArrowDown" ? 1 : buttons.length - 1)) % buttons.length]?.focus();
  };

  return (
    <div
      className="nv-dialog-layer"
      onPointerDown={(e) => {
        // Un toque en una respuesta lo maneja su botón.
        if ((e.target as HTMLElement).closest(".nv-choices")) return;
        // En el celular, después de un toque el navegador manda además un «clic de ratón» al mismo
        // punto. Al cerrar el último cuadro la caja ya no está y ese clic caería en el mapa, y el
        // personaje caminaría hacia allá. Cancelar el pointerdown evita ese clic de más.
        e.preventDefault();
        advance();
      }}
    >
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
        {choices ? (
          <div className="nv-choices" role="group" aria-label="Elige una respuesta" ref={choicesRef} onKeyDown={onChoicesKey}>
            {choices.map((text, i) => (
              <button key={i} type="button" className="nv-choice" onClick={() => onDone(i)}>
                <span aria-hidden="true">{i + 1}</span> {text}
              </button>
            ))}
          </div>
        ) : (
          <span className={`nv-dialog-next${full ? " is-ready" : ""}`} aria-hidden="true">
            ▼
          </span>
        )}
      </div>
    </div>
  );
}
