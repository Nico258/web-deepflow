"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { defaultAvatar, parseAvatar, type Avatar } from "@/data/avatar";
import { readPassportName } from "@/hooks/use-passport-storage";
import { bogotaToday, daysBetween } from "@/lib/challenge/dates";

// Todo el reto vive en este dispositivo, como el Pasaporte del Cielo: los días
// completados, lo que escribió cada día y el nombre. No se envía nada a ningún servidor.

export type Entry = { completedOn: string; text: string };

type Saved = {
  // null mientras la persona no lo haya escrito aquí: entonces se muestra el del pasaporte.
  name: string | null;
  // Día del reto → lo que guardó al completarlo. Se puede cambiar solo durante ese mismo día.
  entries: Record<number, Entry>;
  // Día del reto → lo que va escribiendo antes de guardar.
  drafts: Record<number, string>;
  // Ropa del monigote. Si no existe en lo guardado (versiones anteriores), se usa la básica.
  avatar: Avatar;
};

export type ChallengeStatus = "not_started" | "in_progress" | "finished";

const empty: Saved = { name: null, entries: {}, drafts: {}, avatar: defaultAvatar };

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

// Lee lo guardado descartando lo que no tenga la forma esperada (datos dañados o editados a mano).
function parse(raw: string | null): Saved {
  if (!raw) return empty;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed)) return empty;
    const entries: Record<number, Entry> = {};
    if (isObject(parsed.entries)) {
      for (const [day, e] of Object.entries(parsed.entries)) {
        if (isObject(e) && typeof e.completedOn === "string" && typeof e.text === "string") {
          entries[Number(day)] = { completedOn: e.completedOn, text: e.text };
        }
      }
    }
    const drafts: Record<number, string> = {};
    if (isObject(parsed.drafts)) {
      for (const [day, t] of Object.entries(parsed.drafts)) if (typeof t === "string") drafts[Number(day)] = t;
    }
    return {
      name: typeof parsed.name === "string" ? parsed.name : null,
      entries,
      drafts,
      avatar: parseAvatar(parsed.avatar),
    };
  } catch {
    return empty;
  }
}

function readRaw(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// Si el navegador no deja abrir IndexedDB (algunos modos privados), no se espera más de un momento.
const passportNameOrEmpty = () =>
  Promise.race([readPassportName(), new Promise<string>((resolve) => setTimeout(() => resolve(""), 1500))]);

export function useChallengeProgress({ slug, startsOn, totalDays }: { slug: string; startsOn: string; totalDays: number }) {
  const key = `deepflow:reto:${slug}:v3`;
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<Saved>(empty);
  const [passportName, setPassportName] = useState("");
  const [today, setToday] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  // Último valor escrito o leído de localStorage, para no reescribir lo mismo entre pestañas.
  const lastRaw = useRef<string | null>(null);

  const refresh = useCallback(() => setToday(bogotaToday()), []);

  // Se carga después de leer el nombre del pasaporte para no mostrar el campo vacío un instante.
  useEffect(() => {
    let active = true;
    void passportNameOrEmpty().then((n) => {
      if (!active) return;
      const raw = readRaw(key);
      lastRaw.current = raw;
      setPassportName(n);
      setData(parse(raw));
      setToday(bogotaToday());
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [key]);

  // A medianoche cambia el día: se revisa al volver a la pestaña y cada minuto.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [refresh]);

  // Si el reto está abierto en otra pestaña, se toma lo que esa pestaña guardó.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue === lastRaw.current) return;
      lastRaw.current = e.newValue;
      setData(parse(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);

  useEffect(() => {
    if (!ready) return;
    const raw = JSON.stringify(data);
    if (raw === lastRaw.current) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(key, raw);
        lastRaw.current = raw;
        setSaveFailed(false);
      } catch {
        setSaveFailed(true);
      }
    }, 150);
    return () => window.clearTimeout(timer);
  }, [key, data, ready]);

  const dayNumber = today ? daysBetween(startsOn, today) + 1 : 0;
  const status: ChallengeStatus | null = !today
    ? null
    : dayNumber < 1
      ? "not_started"
      : dayNumber > totalDays
        ? "finished"
        : "in_progress";

  const completedCount = useMemo(
    () => Object.keys(data.entries).map(Number).filter((n) => n >= 1 && n <= totalDays).length,
    [data.entries, totalDays],
  );

  // Guarda (o reemplaza) lo escrito del día. Solo funciona durante el día que le corresponde,
  // revisando la hora en ese momento: si ya pasó la medianoche, no se guarda.
  const save = useCallback(
    (day: number, text: string) => {
      const now = bogotaToday();
      setToday(now);
      if (daysBetween(startsOn, now) + 1 !== day || day < 1 || day > totalDays) return false;
      setData((d) => {
        const drafts = { ...d.drafts };
        delete drafts[day];
        return { ...d, entries: { ...d.entries, [day]: { completedOn: now, text: text.trim() } }, drafts };
      });
      return true;
    },
    [startsOn, totalDays],
  );

  const setDraft = useCallback((day: number, text: string) => {
    setData((d) => ({ ...d, drafts: { ...d.drafts, [day]: text } }));
  }, []);

  const discardDraft = useCallback((day: number) => {
    setData((d) => {
      const drafts = { ...d.drafts };
      delete drafts[day];
      return { ...d, drafts };
    });
  }, []);

  const setName = useCallback((name: string) => setData((d) => ({ ...d, name })), []);

  // Recibe solo las partes que cambiaron y las mezcla sobre lo último guardado.
  const updateAvatar = useCallback(
    (patch: Partial<Avatar>) => setData((d) => ({ ...d, avatar: { ...d.avatar, ...patch } })),
    [],
  );

  // Borra los días y textos; el nombre y la ropa del monigote se conservan.
  const reset = useCallback(() => setData((d) => ({ ...empty, name: d.name, avatar: d.avatar })), []);

  return {
    ready,
    saveFailed,
    today,
    status,
    dayNumber,
    name: data.name ?? passportName,
    setName,
    avatar: data.avatar,
    updateAvatar,
    entries: data.entries,
    drafts: data.drafts,
    setDraft,
    discardDraft,
    isCompleted: (day: number) => day in data.entries,
    completedCount,
    save,
    reset,
    refresh,
  };
}
