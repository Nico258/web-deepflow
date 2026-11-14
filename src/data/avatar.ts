// Opciones para personalizar el monigote del reto. Solo cambia la ropa: la pose y la
// expresión dependen del nivel del río al que llegó la persona. La última opción de cada
// parte es de playa o piscina, porque al final todos terminan en el agua.

export const hairStyles = [
  { id: "rapado", label: "Rapado" },
  { id: "corto", label: "Corto" },
  { id: "despeinado", label: "Despeinado" },
  { id: "copete", label: "Copete" },
  { id: "melena", label: "Melena" },
  { id: "cola", label: "Cola de caballo" },
  { id: "largo", label: "Largo" },
  { id: "gorro-natacion", label: "Gorro de natación" },
] as const;

export const hairColors = [
  { id: "negro", label: "Negro", hex: "#2b2522" },
  { id: "castano", label: "Castaño", hex: "#6b4226" },
  { id: "rubio", label: "Rubio", hex: "#e0b45a" },
  { id: "rojo", label: "Rojo", hex: "#d8442f" },
  { id: "canoso", label: "Canoso", hex: "#c4c6c9" },
] as const;

export const accessories = [
  { id: "ninguno", label: "Ninguno" },
  { id: "gafas", label: "Gafas" },
  { id: "gafas-sol", label: "Gafas de sol" },
  { id: "gorra", label: "Gorra" },
  { id: "audifonos", label: "Audífonos" },
  { id: "aretes", label: "Aretes" },
  { id: "gafas-natacion", label: "Gafas de natación" },
] as const;

export const tops = [
  { id: "camiseta", label: "Camiseta" },
  { id: "manga-larga", label: "Manga larga" },
  { id: "buzo", label: "Buzo con capota" },
  { id: "chaqueta", label: "Chaqueta" },
  { id: "camisa", label: "Camisa" },
  { id: "blusa", label: "Blusa" },
  { id: "hawaiana", label: "Camisa hawaiana" },
] as const;

export const topColors = [
  { id: "blanco", label: "Blanco", hex: "#f6f3ec" },
  { id: "negro", label: "Negro", hex: "#34363a" },
  { id: "rojo", label: "Rojo", hex: "#d8442f" },
  { id: "verde", label: "Verde", hex: "#4f8a5b" },
  { id: "azul", label: "Azul", hex: "#3b78c4" },
  { id: "rosa", label: "Rosa", hex: "#f0a6b4" },
] as const;

export const bottoms = [
  { id: "jean", label: "Jean" },
  { id: "pantalon", label: "Pantalón" },
  { id: "sudadera", label: "Sudadera" },
  { id: "short", label: "Short" },
  { id: "falda", label: "Falda" },
  { id: "falda-larga", label: "Falda larga" },
  { id: "pantaloneta", label: "Pantaloneta de baño" },
] as const;

export const bottomColors = [
  { id: "marino", label: "Azul oscuro", hex: "#2f4f73" },
  { id: "negro", label: "Negro", hex: "#2e3033" },
  { id: "beige", label: "Beige", hex: "#c9b38f" },
  { id: "oliva", label: "Verde oliva", hex: "#6c7a4a" },
  { id: "rojo", label: "Rojo", hex: "#b8473b" },
  { id: "rosa", label: "Rosa", hex: "#e39aab" },
] as const;

export const shoeStyles = [
  { id: "tenis", label: "Tenis" },
  { id: "converse", label: "Converse" },
  { id: "botas", label: "Botas" },
  { id: "elegantes", label: "Elegantes" },
  { id: "tacones", label: "Tacones" },
  { id: "sandalias", label: "Sandalias" },
  { id: "chanclas", label: "Chanclas" },
] as const;

type Id<T extends readonly { id: string }[]> = T[number]["id"];

export type Avatar = {
  hair: Id<typeof hairStyles>;
  hairColor: Id<typeof hairColors>;
  accessory: Id<typeof accessories>;
  top: Id<typeof tops>;
  topColor: Id<typeof topColors>;
  bottom: Id<typeof bottoms>;
  bottomColor: Id<typeof bottomColors>;
  shoes: Id<typeof shoeStyles>;
};

// Lo más básico: pelo corto, camiseta, jean y tenis.
export const defaultAvatar: Avatar = {
  hair: "corto",
  hairColor: "negro",
  accessory: "ninguno",
  top: "camiseta",
  topColor: "azul",
  bottom: "jean",
  bottomColor: "marino",
  shoes: "tenis",
};

const lists: { [K in keyof Avatar]: readonly { id: string }[] } = {
  hair: hairStyles,
  hairColor: hairColors,
  accessory: accessories,
  top: tops,
  topColor: topColors,
  bottom: bottoms,
  bottomColor: bottomColors,
  shoes: shoeStyles,
};

const fields = Object.keys(lists) as (keyof Avatar)[];

// Lee lo guardado: cualquier valor que no exista en las listas vuelve al básico.
export function parseAvatar(value: unknown): Avatar {
  const out = { ...defaultAvatar } as Record<keyof Avatar, string>;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const v = value as Record<string, unknown>;
    for (const f of fields) {
      if (lists[f].some((o) => o.id === v[f])) out[f] = v[f] as string;
    }
  }
  return out as Avatar;
}

export function randomAvatar(): Avatar {
  const out = {} as Record<keyof Avatar, string>;
  for (const f of fields) out[f] = lists[f][Math.floor(Math.random() * lists[f].length)].id;
  return out as Avatar;
}

export const hexOf = (list: readonly { id: string; hex: string }[], id: string) =>
  (list.find((c) => c.id === id) ?? list[0]).hex;
