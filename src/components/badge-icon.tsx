import {
  MusicNotes,
  FilmSlate,
  Trophy,
  ForkKnife,
  Airplane,
  GameController,
  Palette,
  Books,
  Tree,
  TShirt,
  PawPrint,
  Laptop,
} from "@phosphor-icons/react";

import type { BadgeId } from "@/data/badges";

const icons = {
  musica: MusicNotes,
  cine: FilmSlate,
  deportes: Trophy,
  gastronomia: ForkKnife,
  viajes: Airplane,
  videojuegos: GameController,
  arte: Palette,
  cultura: Books,
  naturaleza: Tree,
  moda: TShirt,
  animales: PawPrint,
  tecnologia: Laptop,
};

export function BadgeIcon({ id }: { id: BadgeId }) {
  const Icon = icons[id];
  return <Icon weight="duotone" aria-hidden="true" />;
}