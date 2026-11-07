"use client";

import { toBlob } from "html-to-image";
import { Camera, Check, Crown, EnvelopeSimple, EnvelopeSimpleOpen, Globe, Plus, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import { getVerse, stamps } from "@/data/stamps";
import { themeFor, themes } from "@/data/themes";
import { badges, sanitizeBadges, type BadgeId } from "@/data/badges";
import { BadgeIcon } from "@/components/badge-icon";
import { StampSeal } from "@/components/stamp-seal";
import { usePassportStorage } from "@/hooks/use-passport-storage";

// El pasaporte se dibuja siempre en un lienzo fijo de 750 × 1500 y se escala para ajustarse a la pantalla.
// Así la vista previa y la imagen exportada tienen exactamente la misma distribución y nada se corta.
const PASSPORT_W = 750;
const PASSPORT_H = 1500;

type Saved = { name: string; photo: string; accent: string; envelopes: number[][]; opened: number[]; slots: (number | null)[]; badges?: (string | null)[] };

const blankSlots = () => Array<number | null>(12).fill(null);

function shuffle() {
  const ids = stamps.map((s) => s.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return [ids.slice(0, 4), ids.slice(4, 8), ids.slice(8, 12)];
}

function compress(file: File): Promise<string> {
  return createImageBitmap(file, { imageOrientation: "from-image" }).then((bitmap) => {
    const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL("image/jpeg", 0.85);
  });
}

export default function PassportApp() {
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState("");
  const [accent, setAccent] = useState(themes[0].hex);
  const [envelopes, setEnvelopes] = useState<number[][]>([]);
  const [opened, setOpened] = useState<number[]>([]);
  const [slots, setSlots] = useState<(number | null)[]>(blankSlots);
  const [ready, setReady] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pending, setPending] = useState<number | null>(null);
  const [moveMode, setMoveMode] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [activeEnvelope, setActiveEnvelope] = useState<number | null>(null);
  const [toast, setToast] = useState({ id: 0, msg: "" });
  const [resetOpen, setResetOpen] = useState(false);
  const [badgeSlots, setBadgeSlots] = useState<(BadgeId | null)[]>([null, null]);
  const [badgePicker, setBadgePicker] = useState<number | null>(null);
  const [scaleBox, setScaleBox] = useState<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.5);

  const card = useRef<HTMLDivElement>(null);
  const cardArea = useRef<HTMLElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const theme = themeFor(accent);
  const map = useMemo(() => new Map(stamps.map((s) => [s.id, s])), []);
  const count = slots.filter(Boolean).length;
  const stamp = selected !== null ? map.get(selected) : undefined;
  const verse = stamp ? getVerse(stamp) : undefined;
  const placing = pending !== null || moveMode !== null;

  const notify = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), msg });
    toastTimer.current = setTimeout(() => setToast({ id: Date.now(), msg: "" }), 2800);
  }, []);

  const load = useCallback((saved: Saved | null) => {
    const s = saved ?? { name: "", photo: "", accent: themes[0].hex, envelopes: shuffle(), opened: [], slots: blankSlots(), badges: [null, null] };
    setName(s.name);
    setPhoto(s.photo);
    setAccent(themeFor(s.accent).hex);
    setEnvelopes(s.envelopes);
    setOpened(s.opened);
    setSlots(s.slots);
    setBadgeSlots(sanitizeBadges(s.badges));
    setReady(true);
  }, []);

  const fail = useCallback(() => notify("No se pudo guardar. Descarga tu pasaporte para conservarlo."), [notify]);
  const snapshot = useMemo<Saved>(() => ({ name, photo, accent, envelopes, opened, slots, badges: badgeSlots }), [name, photo, accent, envelopes, opened, slots, badgeSlots]);
  usePassportStorage<Saved>(snapshot, ready, load, fail);

  // Ajusta la escala del pasaporte al ancho disponible (ResizeObserver avisa también al montar).
  useEffect(() => {
    if (!scaleBox) return;
    const observer = new ResizeObserver(() => setScale(scaleBox.clientWidth / PASSPORT_W));
    observer.observe(scaleBox);
    return () => observer.disconnect();
  }, [scaleBox]);

  // Escape cierra lo que esté abierto.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setSelected(null);
      setResetOpen(false);
      setBadgePicker(null);
      setPending(null);
      setMoveMode(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const scrollToPassport = () => cardArea.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  const place = (id: number) => {
    if (slots.includes(id)) return notify("Ese sello ya está pegado.");
    setPending(id);
    scrollToPassport();
  };

  const slotClick = (index: number) => {
    const current = slots[index];
    // Modo pegar / mover: solo se aceptan espacios vacíos y el detalle del sello NO se vuelve a abrir.
    if (placing) {
      if (current !== null) return notify("Ese espacio ya tiene un sello. Elige uno vacío.");
      const id = (pending ?? moveMode) as number;
      const wasMoving = moveMode !== null;
      // Si el sello ya estaba pegado en otro espacio, se libera: un sello solo ocupa un espacio.
      setSlots((old) => old.map((v, i) => (i === index ? id : v === id ? null : v)));
      setPending(null);
      setMoveMode(null);
      notify(wasMoving ? "Sello movido." : "¡Sello estampado!");
      if (!wasMoving && navigator.vibrate) navigator.vibrate(10);
      return;
    }
    if (current !== null) setSelected(current);
    else notify("Elige un sello de tus sobres para pegarlo aquí.");
  };

  const chooseBadge = (slot: number, id: BadgeId | null) => {
    setBadgeSlots((old) => old.map((v, i) => (i === slot ? id : v)));
    setBadgePicker(null);
  };

  const removeSelected = () => {
    if (!stamp) return;
    setSlots((old) => old.map((v) => (v === stamp.id ? null : v)));
    setSelected(null);
  };

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return notify("Elige una imagen.");
    try {
      setPhoto(await compress(f));
    } catch {
      notify("No se pudo leer esa foto.");
    }
  };

  const exportImage = async (share: boolean) => {
    const node = card.current;
    if (!node || exporting) return;
    flushSync(() => setExporting(true));
    try {
      await document.fonts.ready;
      await Promise.all(Array.from(node.querySelectorAll("img")).map((img) => img.decode().catch(() => undefined)));
      // La copia que se captura va sin escala: sale a 750 × 1000 aunque en pantalla se vea más pequeña.
      const options = { width: PASSPORT_W, height: PASSPORT_H, pixelRatio: 2, backgroundColor: theme.vars["--paper"], cacheBust: true, style: { transform: "none" } };
      let blob = await toBlob(node, options);
      if (!blob) {
        await new Promise((r) => setTimeout(r, 150));
        blob = await toBlob(node, options);
      }
      if (!blob) throw new Error("capture");
      const out = new File([blob], "mi-pasaporte-del-cielo.png", { type: "image/png" });
      if (share && navigator.canShare?.({ files: [out] })) {
        try {
          await navigator.share({ files: [out], title: "Mi pasaporte del cielo" });
          return;
        } catch (e) {
          if (e instanceof Error && e.name === "AbortError") return;
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = out.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch {
      notify("No se pudo generar la imagen. Intenta de nuevo.");
    } finally {
      setExporting(false);
    }
  };

  const openEnvelope = (n: number) => {
    setActiveEnvelope(n);
    setOpened((old) => (old.includes(n) ? old : [...old, n]));
    setSelected(null);
  };

  const reset = () => {
    setName("");
    setPhoto("");
    setAccent(themes[0].hex);
    setEnvelopes(shuffle());
    setOpened([]);
    setSlots(blankSlots());
    setBadgeSlots([null, null]);
    setBadgePicker(null);
    setSelected(null);
    setPending(null);
    setMoveMode(null);
    setActiveEnvelope(null);
    setResetOpen(false);
  };

  // Todos los campos usan el mismo tamaño (48 px); el nombre solo se reduce si es muy largo.
  const nameSize = Math.min(48, Math.max(26, 960 / Math.max(name.length, 1)));

  const renderBadgeSlot = (slot: number) => {
    const id = badgeSlots[slot];
    return (
      <button
        className={`badge-slot ${id ? "filled" : ""}`}
        onClick={() => setBadgePicker(slot)}
        aria-label={id ? `Cambiar gusto: ${badges.find((b) => b.id === id)?.label}` : "Añadir uno de tus gustos"}
      >
        {id ? <BadgeIcon id={id} /> : <span className="badge-hint"><Plus weight="bold" /><small>Tus gustos</small></span>}
      </button>
    );
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <Image src="/deepflowlogo.png" alt="" width={50} height={42} priority className="brand-mark" />
          <span className="brand-name">DeepFlow</span>
        </div>
        <div className="top-note">Ezequiel 47:1-12</div>
      </header>

      <main className="main-wrap">
        <div className="intro">
          <p className="eyebrow">Tengo un propósito y nadie me separa de Dios</p>
          <h1 className="hero-title">Abre tus <em>sobres</em>, descubre tus <em>sellos</em> y construye tu <em>pasaporte</em>.</h1>
        </div>

        <nav className="stepper" aria-label="Progreso">
          <span className="active">1 · Personaliza</span>
          <span className={opened.length ? "active" : ""}>2 · Abre sobres</span>
          <span className={count ? "active" : ""}>3 · Pega sellos</span>
        </nav>

        <section className="customizer">
          <div className="customizer-label"><strong>Color del pasaporte</strong><span>{theme.name}</span></div>
          <div className="palette-picker" role="radiogroup" aria-label="Color del pasaporte">
            {themes.map((t) => (
              <button
                key={t.hex}
                role="radio"
                aria-checked={accent === t.hex}
                className={`color-choice ${accent === t.hex ? "active" : ""}`}
                style={{ background: `linear-gradient(135deg, ${t.hex} 0 52%, ${t.vars["--paper"]} 52% 100%)` }}
                onClick={() => setAccent(t.hex)}
                aria-label={t.name}
                title={t.name}
              />
            ))}
          </div>
        </section>
        <input ref={file} hidden type="file" accept="image/*" onChange={pickPhoto} />

        <div className="workspace">
          <section className="passport-section" ref={cardArea}>
            <div className="section-heading">
              <div><h2>Tu pasaporte</h2><p>{count} de 12 sellos</p></div>
            </div>
            {!ready ? <div className="skeleton" /> : (
              <div className="passport-scale" ref={setScaleBox} style={{ height: PASSPORT_H * scale }}>
                <article
                  ref={card}
                  className={`passport ${exporting ? "exporting" : ""}`}
                  style={{ ...theme.vars, width: PASSPORT_W, height: PASSPORT_H, transform: `scale(${scale})` } as React.CSSProperties}
                >
                  <div className="passport-inner">
                    <header className="passport-title">
                      <div className="title-side">
                        <div className="badge-fixed"><Globe weight="duotone" /></div>
                        {renderBadgeSlot(0)}
                      </div>
                      <div className="title-center">
                        <div className="passport-kicker">Reino de Dios · Documento personal</div>
                        <h3>Cédula del <em>Cielo</em></h3>
                        <div className="identity-eternal"><span />Identidad eterna<span /></div>
                      </div>
                      <div className="title-side">
                        <div className="badge-fixed"><Crown weight="duotone" /></div>
                        {renderBadgeSlot(1)}
                      </div>
                    </header>

                    <div className="identity">
                      <button className="photo-box" onClick={() => file.current?.click()} aria-label={photo ? "Cambiar foto" : "Añadir foto"}>
                        {photo ? (
                          <>
                            <Image src={photo} alt="Tu foto" fill unoptimized sizes="210px" loading="eager" />
                            <span className="photo-badge"><Camera weight="bold" /></span>
                          </>
                        ) : (
                          <span className="photo-hint"><Camera /><small>Toca para añadir tu foto</small></span>
                        )}
                      </button>
                      <div className="identity-data">
                        <label className="field">
                          <span className="field-label">Nombre</span>
                          <input
                            className="field-value"
                            type="text"
                            maxLength={32}
                            autoComplete="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Escribe tu nombre"
                            style={{ fontSize: nameSize }}
                          />
                        </label>
                        <div className="field">
                          <span className="field-label">Tu ciudadanía</span>
                          <div className="field-value">Reino de Dios</div>
                        </div>
                        <div className="field">
                          <span className="field-label">Expedida por</span>
                          <div className="field-value">Dios</div>
                        </div>
                      </div>
                    </div>

                    <div className="seal-caption">Mis sellos del cielo <span>{count}/12</span></div>
                    <div className="stamp-grid">
                      {slots.map((id, i) => {
                        const s = id ? map.get(id) : undefined;
                        return (
                          <button
                            key={i}
                            className={`stamp-slot ${s ? "filled" : ""} ${placing && !s && !exporting ? "pulse" : ""}`}
                            onClick={() => slotClick(i)}
                            aria-label={s ? s.title : `Espacio ${i + 1}`}
                          >
                            {s ? <StampSeal stamp={s} compact /> : null}
                          </button>
                        );
                      })}
                    </div>

                    <footer className="passport-footer"><span>Una identidad que no se pierde, se vive</span><small>Isaías 43:4</small></footer>
                  </div>
                </article>
              </div>
            )}
          </section>

          <section className="activity-section">
            <div className="section-heading">
              <div><h2>Tus sobres</h2><p>Tres sobres, cuatro sellos distintos en cada uno.</p></div>
            </div>
            <div className="envelopes">
              {[0, 1, 2].map((n) => {
                const isOpen = opened.includes(n);
                return (
                  <button key={n} className={`envelope ${isOpen ? "opened" : ""}`} onClick={() => openEnvelope(n)}>
                    {isOpen ? <EnvelopeSimpleOpen weight="duotone" /> : <EnvelopeSimple weight="duotone" />}
                    <span>Sobre {n + 1}</span>
                    <small>{isOpen ? "Abierto ✓" : "Abrir sobre"}</small>
                  </button>
                );
              })}
            </div>

            {activeEnvelope !== null && (
              <div className="sticker-sheet">
                <div className="section-heading">
                  <h3>Sellos del sobre {activeEnvelope + 1}</h3>
                  <button className="icon-action" onClick={() => setActiveEnvelope(null)} aria-label="Cerrar"><X /></button>
                </div>
                <div className="sticker-list">
                  {(envelopes[activeEnvelope] ?? []).map((id) => {
                    const s = map.get(id)!;
                    return (
                      <button key={id} className="sticker" onClick={() => setSelected(id)}>
                        <StampSeal stamp={s} compact />
                        <span className="sticker-label">{slots.includes(id) && <Check />}{s.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bottom-actions">
              <button className="primary-btn" onClick={() => exportImage(false)} disabled={exporting}>Descargar PNG</button>
              <button className="secondary-btn" onClick={() => exportImage(true)} disabled={exporting}>Compartir</button>
              <button className="reset-btn" onClick={() => setResetOpen(true)}>Empezar de nuevo</button>
            </div>
          </section>
        </div>

        <footer className="site-note">
          <p>
            Tu nombre, tu foto, tus sellos y tu personalización se guardan solo en este dispositivo, dentro de tu navegador.
            No usamos cookies ni enviamos tus datos a ningún servidor: solo salen cuando tú descargas o compartes la imagen.
            Si borras los datos del sitio, se pierden; descarga tu pasaporte para conservar una copia.
          </p>
        </footer>

        {placing && (
          <div className="placement-bar">
            <span>{pending !== null ? "Elige un espacio vacío para tu sello" : "Elige el nuevo espacio"}</span>
            <button onClick={() => { setPending(null); setMoveMode(null); }}>Cancelar</button>
          </div>
        )}

        {stamp && verse && (
          <div className="sheet-backdrop" onClick={() => setSelected(null)}>
            <aside className="detail-sheet" role="dialog" aria-modal="true" aria-label={stamp.title} onClick={(e) => e.stopPropagation()}>
              <button className="sheet-close" onClick={() => setSelected(null)} aria-label="Cerrar"><X /></button>
              <StampSeal stamp={stamp} />
              <h2>{stamp.title}</h2>
              <p>{stamp.declaration}</p>
              <blockquote>“{verse.text}”</blockquote>
              <strong>{stamp.reference} · {verse.version}</strong>
              {verse.version === "NTV" && <small className="verse-credit">Nueva Traducción Viviente (NTV)</small>}
              <div className="detail-actions">
                {slots.includes(stamp.id) ? (
                  <>
                    <button className="secondary-btn" onClick={() => { setMoveMode(stamp.id); setSelected(null); scrollToPassport(); notify("Toca un espacio vacío para mover el sello."); }}>Mover</button>
                    <button className="secondary-btn" onClick={removeSelected}>Quitar</button>
                  </>
                ) : (
                  <button className="primary-btn" onClick={() => { place(stamp.id); setSelected(null); }}>Pegar en mi pasaporte</button>
                )}
              </div>
            </aside>
          </div>
        )}

        {badgePicker !== null && (
          <div className="sheet-backdrop" onClick={() => setBadgePicker(null)}>
            <aside className="detail-sheet" role="dialog" aria-modal="true" aria-label="Elige uno de tus gustos" onClick={(e) => e.stopPropagation()}>
              <button className="sheet-close" onClick={() => setBadgePicker(null)} aria-label="Cerrar"><X /></button>
              <h2>Elige uno de tus gustos</h2>
              <p>Aparecerá a la {badgePicker === 0 ? "izquierda" : "derecha"} de tu pasaporte, {badgePicker === 0 ? "debajo del planeta" : "debajo de la corona"}.</p>
              <div className="badge-options">
                {badges.map((b) => {
                  const inOtherSlot = badgeSlots.some((v, i) => v === b.id && i !== badgePicker);
                  return (
                    <button
                      key={b.id}
                      className={`badge-option ${badgeSlots[badgePicker] === b.id ? "active" : ""}`}
                      disabled={inOtherSlot}
                      onClick={() => chooseBadge(badgePicker, b.id)}
                    >
                      <BadgeIcon id={b.id} />
                      <span>{b.label}</span>
                      {inOtherSlot && <small>Ya lo usas</small>}
                    </button>
                  );
                })}
              </div>
              {badgeSlots[badgePicker] && (
                <div className="detail-actions">
                  <button className="secondary-btn" onClick={() => chooseBadge(badgePicker, null)}>Quitar gusto</button>
                </div>
              )}
            </aside>
          </div>
        )}

        {resetOpen && (
          <div className="sheet-backdrop">
            <aside className="confirm-card" role="dialog" aria-modal="true" aria-label="Empezar de nuevo">
              <h2>¿Empezar de nuevo?</h2>
              <p>Se borrará el pasaporte de este dispositivo y se repartirán sellos nuevos.</p>
              <div>
                <button className="secondary-btn" onClick={() => setResetOpen(false)}>Seguir editando</button>
                <button className="primary-btn" onClick={reset}>Sí, empezar</button>
              </div>
            </aside>
          </div>
        )}

        {toast.msg && <div key={toast.id} className="toast" role="status">{toast.msg}</div>}
      </main>
    </div>
  );
}
