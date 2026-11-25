"use client";

import { useCallback, useEffect, useState } from "react";

// La novena guarda solo qué capítulos se completaron y cuándo, en este dispositivo.
// No se guarda el avance dentro de un capítulo (spec 07 §6).

const KEY = "deepflow:novena:v1";

type Completed = Record<string, string>;

function read(): Completed {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    const completed: Completed = {};
    const source = parsed && typeof parsed === "object" ? (parsed as { completed?: unknown }).completed : null;
    if (source && typeof source === "object") {
      for (const [slug, date] of Object.entries(source)) if (typeof date === "string") completed[slug] = date;
    }
    return completed;
  } catch {
    return {};
  }
}

export function useNovenaProgress() {
  const [completed, setCompleted] = useState<Completed>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = () => {
      setCompleted(read());
      setReady(true);
    };
    load();
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const complete = useCallback((slug: string) => {
    setCompleted((c) => {
      if (c[slug]) return c;
      const next = { ...c, [slug]: new Date().toISOString() };
      try {
        localStorage.setItem(KEY, JSON.stringify({ completed: next }));
      } catch {
        // Sin almacenamiento (modo privado estricto): se juega igual, sin recordar el avance.
      }
      return next;
    });
  }, []);

  return { ready, completed, complete };
}
