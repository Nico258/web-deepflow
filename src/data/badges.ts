// «Tus gustos»: imágenes personalizables. Cada participante puede colocar hasta 2 en su pasaporte
// (uno debajo del planeta y otro debajo de la corona).

export const badges = [
  { id: "musica", label: "Música" },
  { id: "cine", label: "Cine y series" },
  { id: "deportes", label: "Deportes" },
  { id: "gastronomia", label: "Gastronomía" },
  { id: "viajes", label: "Viajes y aventuras" },
  { id: "videojuegos", label: "Videojuegos" },
  { id: "arte", label: "Arte y creatividad" },
  { id: "cultura", label: "Cultura y lectura" },
  { id: "naturaleza", label: "Naturaleza" },
  { id: "moda", label: "Moda y estilo" },
  { id: "animales", label: "Animales" },
  { id: "tecnologia", label: "Tecnología" },
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
