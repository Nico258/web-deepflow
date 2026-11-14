"use client";

import { useEffect, useId, useState } from "react";
import { CaretLeft, CaretRight, Check, DownloadSimple, LockSimple, PencilSimple, ShareNetwork } from "@phosphor-icons/react";
import { ShareCard, useShareImage } from "@/components/challenge-share";
import { DepthGauge } from "@/components/depth-gauge";
import { challenge, days, nextRiverLevel, riverLevelFor } from "@/data/challenges/oracion-7-dias";
import { useChallengeProgress, type ChallengeStatus, type Entry } from "@/hooks/use-challenge-progress";
import { addDays, bogotaToday, DEV_TODAY_KEY, formatLong } from "@/lib/challenge/dates";

type DayState = "done" | "today" | "missed" | "future";

const stateLabel: Record<DayState, string> = {
  done: "completado",
  today: "hoy",
  missed: "no se completó",
  future: "aún no se abre",
};

export default function ChallengeApp() {
  const c = useChallengeProgress(challenge);
  const [picked, setPicked] = useState<number | null>(null);

  const states: DayState[] = days.map(({ number }) => {
    if (c.isCompleted(number)) return "done";
    if (c.status !== "in_progress" && c.status !== "finished") return "future";
    if (number > c.dayNumber) return "future";
    if (number === c.dayNumber) return "today";
    return "missed";
  });

  const defaultDay = Math.min(Math.max(c.dayNumber, 1), challenge.totalDays);
  const selected = picked ?? defaultDay;
  // La imagen se habilita al completar el último día o cuando el reto ya se cerró.
  const canShare = c.completedCount > 0 && (c.isCompleted(challenge.totalDays) || c.status === "finished");

  return (
    <>
      <div className="reto-layout">
        <div className="reto-primary">
          <section className="reto-commitment" aria-labelledby="compromiso-title">
            <p className="reto-kicker reto-kicker-gold" id="compromiso-title">
              Mi compromiso
            </p>
            <p className="reto-commitment-text">{challenge.commitment}</p>
            <p className="reto-commitment-note">{challenge.commitmentNote}</p>

            <NameField ready={c.ready} value={c.name} onChange={c.setName} />

            {c.saveFailed && (
              <p className="reto-warning" role="alert">
                No se pudo guardar en este dispositivo. Revisa que no estés en una ventana de incógnito y que el navegador
                permita guardar datos de este sitio.
              </p>
            )}

            <div className="reto-plan">
              <div className="reto-plan-head">
                <p className="reto-kicker">Mi reto</p>
                <p className="reto-plan-count">
                  {c.completedCount} de {challenge.totalDays} días completados
                </p>
              </div>

              <ol className="reto-dots" aria-label="Días del reto">
                {days.map((d, i) => {
                  const state = states[i];
                  const isToday = c.status === "in_progress" && d.number === c.dayNumber;
                  return (
                    <li key={d.number}>
                      <button
                        className={`reto-dot is-${state} ${isToday ? "is-today" : ""} ${selected === d.number ? "is-selected" : ""}`}
                        aria-pressed={selected === d.number}
                        aria-label={`Día ${d.number}, ${d.title}: ${stateLabel[state]}`}
                        onClick={() => setPicked(d.number)}
                      >
                        <span className="reto-dot-long">Día {d.number}</span>
                        <span className="reto-dot-short">{d.number}</span>
                        {isToday && <span className="reto-dot-badge">Hoy</span>}
                      </button>
                    </li>
                  );
                })}
              </ol>

              <DayPanel
                key={selected}
                day={selected}
                state={states[selected - 1]}
                today={c.today}
                entry={c.entries[selected]}
                draft={c.drafts[selected]}
                onDraft={(text) => c.setDraft(selected, text)}
                onDiscard={() => c.discardDraft(selected)}
                onSave={(text) => {
                  const saved = c.save(selected, text);
                  // Si el día ya se cerró, se queda en ese día para mostrar el aviso.
                  if (!saved) setPicked(selected);
                  return saved;
                }}
              />
            </div>
          </section>

          <section className="reto-phrase" aria-label="Para recordar">
            <p className="reto-kicker">Para recordar</p>
            <blockquote>«{challenge.verse.text}»</blockquote>
            <p className="reto-phrase-ref">{challenge.verse.ref}</p>
          </section>
        </div>

        <aside className="reto-aside">
          <ProgressCard
            ready={c.ready}
            name={c.name}
            completed={c.completedCount}
            canShare={canShare}
            status={c.status}
            onReset={() => {
              c.reset();
              setPicked(null);
            }}
          />
        </aside>
      </div>

      {process.env.NODE_ENV === "development" && (
        <DevTools today={c.today} status={c.status} dayNumber={c.dayNumber} onChange={c.refresh} />
      )}
    </>
  );
}

function NameField({ ready, value, onChange }: { ready: boolean; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="reto-name">
      <label className="reto-field-label" htmlFor={id}>
        Nombre
      </label>
      <input
        id={id}
        className="reto-name-input"
        type="text"
        maxLength={32}
        autoComplete="name"
        value={ready ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe tu nombre"
      />
    </div>
  );
}

function DayPanel({
  day,
  state,
  today,
  entry,
  draft,
  onDraft,
  onDiscard,
  onSave,
}: {
  day: number;
  state: DayState;
  today: string | null;
  entry?: Entry;
  draft?: string;
  onDraft: (text: string) => void;
  onDiscard: () => void;
  onSave: (text: string) => boolean;
}) {
  const data = days[day - 1];
  const id = useId();
  const [error, setError] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [lateSave, setLateSave] = useState(false);

  // Hoy se puede escribir; si ya se guardó, se puede editar hasta que termine el día.
  const isToday = state === "today" || (state === "done" && entry?.completedOn === today);
  const editing = isToday && (!entry || draft !== undefined);
  const text = draft ?? (entry ? entry.text : "");
  const enough = text.trim().length >= challenge.minNoteLength;

  const submit = () => {
    if (!enough) {
      setError(true);
      return;
    }
    setConfirming(true);
  };

  let footer: React.ReactNode = null;
  if (state === "future") {
    footer = (
      <p className="reto-day-msg">
        <LockSimple aria-hidden="true" /> Este día se abre el {formatLong(addDays(challenge.startsOn, day - 1))}.
      </p>
    );
  } else if (state === "missed") {
    footer = (
      <p className="reto-day-msg is-neutral">
        {lateSave
          ? "El día terminó a medianoche y ya no se pudo guardar."
          : draft?.trim()
            ? "Este día se cerró antes de que lo guardaras."
            : "Este día ya se cerró. Puedes leer la pregunta y reflexionar igual."}
      </p>
    );
  } else if (editing) {
    footer = (
      <div className="reto-day-action">
        <button className="primary-btn" onClick={submit}>
          {entry ? "Guardar cambios" : "Marcar este día como completado"}
        </button>
        {entry && (
          <button className="secondary-btn" onClick={onDiscard}>
            Cancelar
          </button>
        )}
      </div>
    );
  } else if (entry) {
    footer = (
      <div className="reto-day-action">
        <p className="reto-day-msg is-done">
          <Check weight="bold" aria-hidden="true" />
          {isToday ? "Completaste este día. Puedes editarlo hasta que termine el día." : `Completaste este día el ${formatLong(entry.completedOn)}.`}
        </p>
        {isToday && (
          <button className="secondary-btn reto-edit-btn" onClick={() => onDraft(entry.text)}>
            <PencilSimple aria-hidden="true" weight="bold" /> Editar
          </button>
        )}
      </div>
    );
  }

  return (
    <article className={`reto-day-panel is-${state}`} aria-labelledby={`${id}-q`}>
      <p className="reto-kicker reto-kicker-gold">
        Día {data.number} · {data.title}
      </p>
      <h2 className="reto-question" id={`${id}-q`}>
        {data.question}
      </h2>
      <figure className="reto-verse">
        <blockquote>«{data.verse.text}»</blockquote>
        <figcaption>{data.verse.ref}</figcaption>
      </figure>

      {editing ? (
        <>
          <textarea
            id={`${id}-note`}
            className={`reto-note ${error && !enough ? "is-invalid" : ""}`}
            aria-label="Mi conversación con Dios"
            aria-describedby={`${id}-help`}
            aria-invalid={error && !enough}
            value={text}
            onChange={(e) => {
              onDraft(e.target.value);
              if (e.target.value.trim().length >= challenge.minNoteLength) setError(false);
            }}
            placeholder="Escribe lo que quieras decirle, con tus propias palabras..."
            rows={4}
          />
          <p className={`reto-note-help ${error && !enough ? "is-error" : ""}`} id={`${id}-help`} role={error && !enough ? "alert" : undefined}>
            {error && !enough
              ? `Escribe al menos una frase corta (mínimo ${challenge.minNoteLength} caracteres) para guardar el día.`
              : `Mínimo una frase corta (${challenge.minNoteLength} caracteres).`}
          </p>
        </>
      ) : entry ? (
        <div className="reto-saved">
          <p className="reto-field-label">Lo que le dije a Dios</p>
          <p className="reto-saved-text">{entry.text}</p>
        </div>
      ) : state === "missed" && draft?.trim() ? (
        <div className="reto-saved">
          <p className="reto-field-label">Lo que alcanzaste a escribir</p>
          <p className="reto-saved-text">{draft.trim()}</p>
        </div>
      ) : null}

      {footer}

      {confirming && (
        <ConfirmSave
          day={day}
          text={text.trim()}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            if (!onSave(text)) setLateSave(true);
            setConfirming(false);
          }}
        />
      )}
    </article>
  );
}

function ConfirmSave({ day, text, onCancel, onConfirm }: { day: number; text: string; onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <aside
        className="confirm-card reto-confirm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reto-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="reto-confirm-title">¿Guardar el día {day}?</h2>
        <p className="reto-confirm-text">{text}</p>
        <p className="reto-confirm-note">
          <LockSimple aria-hidden="true" weight="bold" /> Una vez termine el día, no lo podrás editar.
        </p>
        <div>
          <button className="secondary-btn" onClick={onCancel}>
            Seguir escribiendo
          </button>
          <button className="primary-btn" onClick={onConfirm} autoFocus>
            Sí, guardar
          </button>
        </div>
      </aside>
    </div>
  );
}

function ProgressCard({
  ready,
  name,
  completed,
  canShare,
  status,
  onReset,
}: {
  ready: boolean;
  name: string;
  completed: number;
  canShare: boolean;
  status: ChallengeStatus | null;
  onReset: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const { card: shareCard, exporting, error: shareError, exportImage } = useShareImage();
  const level = riverLevelFor(completed);
  const next = nextRiverLevel(completed);
  const missing = next ? next.min - completed : 0;

  let hint: string;
  if (!next) hint = "Completaste los 7 días. ¡Llegaste a lo más profundo!";
  else if (status === "not_started") hint = `El reto empieza el ${formatLong(challenge.startsOn)}.`;
  else if (status === "finished") hint = "El reto ya se cerró.";
  else if (!level) hint = "Completa el día de hoy para meter los pies al agua.";
  else hint = `${missing === 1 ? "Falta 1 día" : `Faltan ${missing} días`} para llegar ${next.level === 4 ? "a un río para nadar" : next.title.toLowerCase()}.`;

  return (
    <section className="reto-side-card reto-depth" aria-labelledby="progreso-title">
      <p className="reto-kicker" id="progreso-title">
        Mi progreso
      </p>
      <div className="reto-depth-body">
        <DepthGauge completed={ready ? completed : 0} className="reto-depth-gauge" />
        <div className="reto-depth-info">
          <p className="reto-depth-level">{level ? level.title : "En la orilla"}</p>
          <p className="reto-depth-count">
            <strong>
              {completed} de {challenge.totalDays}
            </strong>{" "}
            días
          </p>
          <p className="reto-depth-hint">{hint}</p>
        </div>
      </div>

      <div className="reto-depth-actions">
        <button className="primary-btn" onClick={() => exportImage(true)} disabled={!canShare || exporting}>
          <ShareNetwork aria-hidden="true" weight="bold" /> Compartir
        </button>
        <button className="secondary-btn" onClick={() => exportImage(false)} disabled={!canShare || exporting}>
          <DownloadSimple aria-hidden="true" weight="bold" /> Descargar
        </button>
      </div>
      {shareError ? (
        <p className="reto-error" role="alert">
          {shareError}
        </p>
      ) : (
        <p className="reto-depth-later">
          {canShare
            ? "Comparte la imagen con la profundidad a la que llegaste."
            : status === "finished"
              ? "La imagen necesita al menos un día completado."
              : "Podrás crear y compartir tu imagen cuando termine el reto."}
        </p>
      )}
      {canShare && (
        <div className="reto-card-offscreen" aria-hidden="true">
          <ShareCard ref={shareCard} name={name} completed={completed} />
        </div>
      )}

      {completed > 0 && (
        <div className="reto-delete">
          {confirming ? (
            <>
              <p>Se borran tus días y lo que escribiste en este dispositivo. No se puede deshacer.</p>
              <div>
                <button
                  className="reto-link-btn is-danger"
                  onClick={() => {
                    onReset();
                    setConfirming(false);
                  }}
                >
                  Sí, borrar
                </button>
                <button className="reto-link-btn" onClick={() => setConfirming(false)}>
                  Cancelar
                </button>
              </div>
            </>
          ) : (
            <button className="reto-link-btn" onClick={() => setConfirming(true)}>
              Borrar mi progreso
            </button>
          )}
        </div>
      )}
    </section>
  );
}

// Solo en desarrollo: simula la fecha de Bogotá para probar los 7 días.
function DevTools({
  today,
  status,
  dayNumber,
  onChange,
}: {
  today: string | null;
  status: ChallengeStatus | null;
  dayNumber: number;
  onChange: () => void;
}) {
  const [open, setOpen] = useState(true);

  const shift = (n: number) => {
    localStorage.setItem(DEV_TODAY_KEY, addDays(bogotaToday(), n));
    onChange();
  };
  const reset = () => {
    localStorage.removeItem(DEV_TODAY_KEY);
    onChange();
  };
  const wipe = () => {
    for (const k of Object.keys(localStorage)) if (k.startsWith("deepflow:")) localStorage.removeItem(k);
    window.location.reload();
  };

  if (!open) {
    return (
      <button className="reto-dev-toggle" onClick={() => setOpen(true)}>
        Dev
      </button>
    );
  }
  return (
    <div className="reto-dev" role="region" aria-label="Herramientas de desarrollo">
      <strong>Simulación local</strong>
      <span>
        Hoy: {today ?? "…"} {status === "in_progress" ? `(día ${dayNumber})` : status ? `(${status})` : ""}
      </span>
      <div>
        <button onClick={() => shift(-1)} aria-label="Día anterior">
          <CaretLeft />
        </button>
        <button onClick={() => shift(1)} aria-label="Día siguiente">
          <CaretRight />
        </button>
        <button onClick={reset}>Fecha real</button>
        <button onClick={wipe}>Borrar datos</button>
        <button onClick={() => setOpen(false)} aria-label="Ocultar">
          ×
        </button>
      </div>
    </div>
  );
}
