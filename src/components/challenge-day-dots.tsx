"use client";

import { useSyncExternalStore } from "react";
import { bogotaToday, daysBetween } from "@/lib/challenge/dates";

// Círculos de los días del reto, rellenos según el día del calendario (hora de
// Bogotá), iguales para todos: el primer día del reto hay 1 lleno, el segundo 2…
// Se calcula en el navegador para no depender de la fecha en que se generó la página.
const noop = () => () => {};

export function ChallengeDayDots({ startsOn, totalDays }: { startsOn: string; totalDays: number }) {
  const today = useSyncExternalStore(noop, bogotaToday, () => null);
  const elapsed = today ? Math.min(Math.max(daysBetween(startsOn, today) + 1, 0), totalDays) : 0;

  return (
    <span className="home-activity-days" aria-hidden="true">
      {Array.from({ length: totalDays }, (_, i) => (
        <span key={i} className={i < elapsed ? "is-filled" : undefined}>
          {i + 1}
        </span>
      ))}
    </span>
  );
}
