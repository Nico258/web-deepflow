// «Tus gustos»: imágenes personalizables. Cada participante puede colocar hasta 2 en su pasaporte
// (uno debajo del planeta y otro debajo de la corona).

export const badges = [
  { id: "futbol", label: "Balón de fútbol" },
  { id: "audifonos", label: "Audífonos" },
  { id: "libro", label: "Libro" },
  { id: "mancuerna", label: "Mancuerna" },
  { id: "mando", label: "Mando de videojuegos" },
] as const;

export type BadgeId = (typeof badges)[number]["id"];

/** Normaliza lo guardado en el dispositivo: 2 espacios, solo ids válidos y sin repetir. */
export function sanitizeBadges(value: unknown): (BadgeId | null)[] {
  const valid = new Set<string>(badges.map((b) => b.id));
  const out: (BadgeId | null)[] = [null, null];
  if (!Array.isArray(value)) return out;
  value.slice(0, 2).forEach((v, i) => {
    if (typeof v === "string" && valid.has(v) && !out.includes(v as BadgeId)) out[i] = v as BadgeId;
  });
  return out;
}
