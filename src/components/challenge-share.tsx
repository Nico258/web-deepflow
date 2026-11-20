"use client";

import { useRef, useState, type Ref } from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import { toCanvas } from "html-to-image";
import { DepthGauge } from "@/components/depth-gauge";
import { challenge, riverLevelFor } from "@/data/challenges/oracion-7-dias";
import type { Avatar } from "@/data/avatar";

// La imagen se dibuja en un lienzo fijo de 720 × 1280 (formato de estado/historia)
// y se exporta al doble de densidad: 1080 × 1920.
const CARD_W = 720;
const CARD_H = 1280;

// El logo no entra en la captura de html-to-image: en iPhone/iPad (Safari y todos los navegadores, que usan WebKit)
// salía en blanco porque WebKit da la captura por lista antes de terminar de cargar las <img> que lleva dentro.
// Es el mismo problema que tuvo la foto del pasaporte, y se resuelve igual: se excluye de la captura y se pinta
// después a mano con paintLogo, igual en todos los navegadores. Su recuadro (.reto-card-logo) sí se captura,
// para que «DeepFlow» no se corra. Si se añade otra <img> a la tarjeta, tendrá el mismo problema en iPhone.
const isLogo = (el: HTMLElement) => el instanceof HTMLImageElement && el.closest(".reto-card-logo") !== null;

/** Pinta el logo sobre la captura, en la posición y el tamaño que tiene en la tarjeta. */
async function paintLogo(canvas: HTMLCanvasElement, card: HTMLElement) {
  const box = card.querySelector<HTMLElement>(".reto-card-logo");
  const img = box?.querySelector("img");
  const ctx = canvas.getContext("2d");
  if (!box || !img || !ctx) return;
  const logo = new window.Image();
  logo.src = img.currentSrc || img.src;
  await logo.decode();
  // offsetLeft/Top son relativos a la tarjeta (su offsetParent) e ignoran la escala con que se muestre.
  const ratio = canvas.width / CARD_W;
  ctx.drawImage(logo, box.offsetLeft * ratio, box.offsetTop * ratio, box.offsetWidth * ratio, box.offsetHeight * ratio);
}

export function shareHeadline(completed: number) {
  const level = riverLevelFor(completed);
  if (!level) return "";
  return level.level === 4 ? "Llegué a un río para nadar" : `Llegué ${level.title.toLowerCase()}`;
}

export function ShareCard({
  name,
  avatar,
  completed,
  ref,
}: {
  name: string;
  avatar: Avatar;
  completed: number;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <div className="reto-card" ref={ref}>
      <div className="reto-card-brand">
        <span className="reto-card-logo">
          <Image src="/deepflowlogo.png" alt="" width={66} height={56} loading="eager" />
        </span>
        <span>DeepFlow</span>
      </div>
      <p className="reto-card-eyebrow">{challenge.theme}</p>
      <p className="reto-card-stars" aria-hidden="true">
        ✧ · ✦ · ✧
      </p>
      {name.trim() ? (
        <p className="reto-card-name" style={{ fontSize: Math.min(64, Math.max(38, 1150 / name.trim().length)) }}>
          {name.trim()}
        </p>
      ) : null}
      <p className="reto-card-title">{shareHeadline(completed)}</p>
      <DepthGauge completed={completed} avatar={avatar} className="reto-card-gauge" />
      <p className="reto-card-count">
        <strong>
          {completed} de {challenge.totalDays}
        </strong>{" "}
        días hablando con Dios
      </p>
      <p className="reto-card-phrase">«{challenge.verse.text}»</p>
      <p className="reto-card-foot">{challenge.verse.ref}</p>
    </div>
  );
}

// Captura la tarjeta (renderizada fuera de pantalla) y la comparte o la descarga.
export function useShareImage() {
  const card = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportImage = async (share: boolean) => {
    const node = card.current;
    if (!node || exporting) return;
    flushSync(() => {
      setExporting(true);
      setError(null);
    });
    try {
      await document.fonts.ready;
      await Promise.all(Array.from(node.querySelectorAll("img")).map((img) => img.decode().catch(() => undefined)));
      const options = { width: CARD_W, height: CARD_H, pixelRatio: 1.5, cacheBust: true, filter: (el: HTMLElement) => !isLogo(el) };
      const capture = async () => {
        // Se captura la tarjeta sin el logo (ver isLogo) y luego se pinta el logo encima.
        const canvas = await toCanvas(node, options);
        await paintLogo(canvas, node);
        return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      };
      let blob = await capture();
      if (!blob) {
        await new Promise((r) => setTimeout(r, 150));
        blob = await capture();
      }
      if (!blob) throw new Error("capture");
      const out = new File([blob], "hablo-con-dios.png", { type: "image/png" });
      if (share && navigator.canShare?.({ files: [out] })) {
        try {
          await navigator.share({ files: [out], title: challenge.theme });
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
      setError("No se pudo generar la imagen. Intenta de nuevo.");
    } finally {
      setExporting(false);
    }
  };

  return { card, exporting, error, exportImage };
}
