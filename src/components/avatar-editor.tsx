"use client";

import { useEffect, useState } from "react";
import { Shuffle, X } from "@phosphor-icons/react";
import { AvatarFigure } from "@/components/avatar-figure";
import {
  accessories,
  bottomColors,
  bottoms,
  hairColors,
  hairStyles,
  randomAvatar,
  shoeStyles,
  topColors,
  tops,
  type Avatar,
} from "@/data/avatar";

type Option = { id: string; label: string };
type Color = { id: string; label: string; hex: string };
type Section = {
  field: "hair" | "accessory" | "top" | "bottom" | "shoes";
  label: string;
  // Recorte del lienzo (120 × 170) que se ve en cada miniatura.
  crop: string;
  options: readonly Option[];
  color?: { field: "hairColor" | "topColor" | "bottomColor"; list: readonly Color[] };
};

const sections: Section[] = [
  { field: "hair", label: "Cabello", crop: "32 0 56 56", options: hairStyles, color: { field: "hairColor", list: hairColors } },
  { field: "accessory", label: "Accesorio", crop: "28 2 64 44", options: accessories },
  { field: "top", label: "Tronco", crop: "32 40 56 56", options: tops, color: { field: "topColor", list: topColors } },
  { field: "bottom", label: "Piernas", crop: "34 88 52 64", options: bottoms, color: { field: "bottomColor", list: bottomColors } },
  { field: "shoes", label: "Zapatos", crop: "38 130 44 32", options: shoeStyles },
];

// Ventana para elegir la ropa del monigote. Cada cambio se guarda de inmediato.
export function AvatarEditor({
  avatar,
  level,
  onChange,
  onClose,
}: {
  avatar: Avatar;
  level: number;
  onChange: (patch: Partial<Avatar>) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState(0);
  const section = sections[tab];
  // El jean y el gorro de natación tienen su propio color: no se muestran colores.
  const showColors =
    section.color &&
    !(section.field === "bottom" && avatar.bottom === "jean") &&
    !(section.field === "hair" && avatar.hair === "gorro-natacion");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <aside
        className="detail-sheet reto-avatar"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reto-avatar-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="sheet-close" onClick={onClose} aria-label="Cerrar">
          <X aria-hidden="true" />
        </button>
        <h2 id="reto-avatar-title">Personaliza tu monigote</h2>
        <p className="reto-avatar-sub">Así aparecerás en el río y en la imagen final.</p>

        <svg className="reto-avatar-preview" viewBox="10 0 100 166" aria-hidden="true">
          <ellipse cx="60" cy="160" rx="26" ry="4" fill="#173b5c" opacity=".08" />
          <AvatarFigure avatar={avatar} level={level} />
        </svg>

        <div className="reto-avatar-tabs" role="tablist" aria-label="Partes del monigote">
          {sections.map((s, i) => (
            <button
              key={s.field}
              role="tab"
              aria-selected={tab === i}
              className={tab === i ? "is-active" : ""}
              onClick={() => setTab(i)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="reto-avatar-options" role="tabpanel" aria-label={section.label}>
          {section.options.map((o) => {
            const active = avatar[section.field] === o.id;
            const sample = { ...avatar, [section.field]: o.id } as Avatar;
            return (
              <button
                key={o.id}
                className={`reto-avatar-option ${active ? "is-active" : ""}`}
                aria-pressed={active}
                onClick={() => onChange({ [section.field]: o.id })}
              >
                <svg viewBox={section.crop} aria-hidden="true">
                  <AvatarFigure avatar={sample} />
                </svg>
                <span>{o.label}</span>
              </button>
            );
          })}
        </div>

        {showColors && section.color && (
          <div className="reto-avatar-colors" role="group" aria-label="Color">
            {section.color.list.map((c) => {
              const field = section.color!.field;
              const active = avatar[field] === c.id;
              return (
                <button
                  key={c.id}
                  className={`color-choice ${active ? "active" : ""}`}
                  style={{ background: c.hex }}
                  aria-label={c.label}
                  aria-pressed={active}
                  title={c.label}
                  onClick={() => onChange({ [field]: c.id })}
                />
              );
            })}
          </div>
        )}

        <div className="detail-actions">
          <button className="secondary-btn" onClick={() => onChange(randomAvatar())}>
            <Shuffle aria-hidden="true" weight="bold" /> Al azar
          </button>
          <button className="primary-btn" onClick={onClose}>
            Listo
          </button>
        </div>
      </aside>
    </div>
  );
}
