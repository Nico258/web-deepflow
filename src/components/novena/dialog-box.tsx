"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { ResolvedLine } from "@/game/novena/bus";
import { prefersReducedMotion } from "@/game/novena/motion";

const CHAR_MS = 22;
/** Pausa extra después de un signo, para que el texto respire como al leerlo en voz alta. */
const PAUSE_MS: Record<string, number> = { ".": 260, "!": 260, "?": 260, "…": 260, ",": 110, ";": 110, ":": 110, "—": 110 };

const hex = (color: number) => `#${color.toString(16).padStart(6, "0")}`;

/** Cuánto esperar antes de mostrar la siguiente letra: más tras un signo que cierra una frase o una pausa. */
function delayAfter(text: string, shown: number) {
  const prev = text[shown - 1];
  // Solo al final de una tanda de signos («¿Qué?!», «...») y antes de un espacio.
  return CHAR_MS + (prev && text[shown] === " " ? (PAUSE_MS[prev] ?? 0) : 0);
}

// Caja de diálogo al estilo de los juegos: el texto aparece letra por letra (con pausas en la
// puntuación) y se avanza tocando la pantalla, con Espacio, Enter o E, o con el botón ▼.
// Mientras está abierta, el juego no se mueve. Si la última línea trae respuestas para elegir, se
// muestran como botones: se toca una, o se elige con las flechas y Enter (o con su número).
// `onDone` recibe la elegida (desde 0) o null. `active={false}` deja de escuchar el teclado, por
// ejemplo mientras hay una ventana encima.
//
// Accesibilidad: el lector de pantalla lee cada línea completa una vez (región viva aparte), no
// letra por letra; el foco va al botón ▼ («Siguiente» o «Cerrar») o a la primera respuesta.
// Con «reducir movimiento», el texto aparece de una vez.
export function DialogBox({ lines, onDone, active = true }: { lines: ResolvedLine[]; onDone: (choice: number | null) => void; active?: boolean }) {
  const [reduced] = useState(prefersReducedMotion);
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(() => (reduced ? lines[0].text.length : 0));
  const choicesRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const line = lines[index];
  const full = shown >= line.text.length;
  const last = index === lines.length - 1;
  /** Las respuestas, cuando ya se puede elegir: en la última línea y con el texto completo. */
  const choices = full && last && line.choices?.length ? line.choices : null;
  /**
   * Lo que lee el lector de pantalla. Se llena un momento después de cambiar de línea: si el texto
   * ya está al aparecer la región viva, algunos lectores no lo anuncian.
   */
  const [spoken, setSpoken] = useState("");
  useEffect(() => {
    const text = `${line.speaker ? `${line.speaker}: ` : ""}${line.text}`;
    const timer = window.setTimeout(() => setSpoken(text), 60);
    return () => window.clearTimeout(timer);
  }, [line]);

  useEffect(() => {
    if (full) return;
    const timer = window.setTimeout(() => setShown((n) => n + 1), delayAfter(line.text, shown));
    return () => window.clearTimeout(timer);
  }, [full, shown, line.text]);

  const advance = useCallback(() => {
    if (!full) return setShown(line.text.length);
    if (!last) {
      setIndex(index + 1);
      setShown(reduced ? lines[index + 1].text.length : 0);
    } else if (!line.choices?.length) onDone(null);
  }, [full, last, index, lines, reduced, line.text.length, line.choices, onDone]);

  // El foco va a la primera respuesta cuando aparecen, o al botón ▼ en cada línea: así se avanza
  // con el teclado o con el lector de pantalla sin buscar dónde.
  useEffect(() => {
    if (!active) return;
    if (choices) choicesRef.current?.querySelector("button")?.focus();
    else nextRef.current?.focus({ preventScroll: true });
  }, [choices, active, index]);

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
      // Con el foco en ▼, Enter y Espacio los maneja el botón (si no, avanzaría dos veces).
      if (e.target === nextRef.current && e.key !== "e" && e.key !== "E") return;
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
      {/* Lo que oye el lector de pantalla: la línea completa, una vez, con quién la dice. */}
      <p className="visually-hidden" aria-live="polite" aria-atomic="true">
        {spoken}
      </p>
      <section className={`nv-dialog${line.speaker ? "" : " nv-dialog--narrator"}`} aria-label="Diálogo">
        {line.speaker && (
          <div className="nv-dialog-speaker" aria-hidden="true">
            <span className="nv-portrait" style={{ background: line.color === null ? undefined : hex(line.color) }} />
            {line.speaker}
          </div>
        )}
        <p className="nv-dialog-text" aria-hidden="true">
          {line.text.slice(0, shown)}
          <span className="nv-dialog-rest">{line.text.slice(shown)}</span>
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
          <button
            ref={nextRef}
            type="button"
            className={`nv-dialog-next${full ? " is-ready" : ""}`}
            aria-label={!full ? "Mostrar todo el texto" : last ? "Cerrar" : "Siguiente"}
            // Los toques y clics ya los maneja la capa (pointerdown); el botón responde al teclado y
            // al lector de pantalla, que activan con un clic sin puntero (detail 0).
            onClick={(e) => {
              if (e.detail === 0) advance();
            }}
          >
            <span aria-hidden="true">▼</span>
          </button>
        )}
      </section>
    </div>
  );
}
