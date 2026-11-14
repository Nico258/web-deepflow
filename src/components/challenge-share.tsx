"use client";

import { useRef, useState, type Ref } from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import { toCanvas } from "html-to-image";
import { DepthGauge } from "@/components/depth-gauge";
import { challenge, riverLevelFor } from "@/data/challenges/oracion-7-dias";

// La imagen se dibuja en un lienzo fijo de 720 × 1280 (formato de estado/historia)
// y se exporta al doble de densidad: 1080 × 1920.
const CARD_W = 720;
const CARD_H = 1280;

export function shareHeadline(completed: number) {
  const level = riverLevelFor(completed);
  if (!level) return "";
  return level.level === 4 ? "Llegué a un río para nadar" : `Llegué ${level.title.toLowerCase()}`;
}

export function ShareCard({ name, completed, ref }: { name: string; completed: number; ref?: Ref<HTMLDivElement> }) {
  return (
    <div className="reto-card" ref={ref}>
      <div className="reto-card-brand">
        <Image src="/deepflowlogo.png" alt="" width={66} height={56} loading="eager" />
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
      <DepthGauge completed={completed} className="reto-card-gauge" />
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
      const options = { width: CARD_W, height: CARD_H, pixelRatio: 1.5, cacheBust: true };
      const capture = async () => {
        const canvas = await toCanvas(node, options);
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
