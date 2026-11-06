import { Barbell, BookOpen, GameController, Headphones, SoccerBall } from "@phosphor-icons/react";
import type { BadgeId } from "@/data/badges";

const icons = { futbol: SoccerBall, audifonos: Headphones, libro: BookOpen, mancuerna: Barbell, mando: GameController };

export function BadgeIcon({ id }: { id: BadgeId }) {
  const Icon = icons[id];
  return <Icon weight="duotone" aria-hidden="true" />;
}
