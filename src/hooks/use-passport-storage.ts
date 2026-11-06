"use client";

import { useEffect } from "react";

const DB = "conexion-pasaporte";
const STORE = "drafts";
const KEY = "pasaporte-del-cielo-v1";

function dbOpen() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function usePassportStorage<T>(value: T, ready: boolean, onLoad: (value: T | null) => void, onError: () => void) {
  useEffect(() => {
    let active = true;
    void dbOpen().then((db) => new Promise<T | null>((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(KEY);
      req.onsuccess = () => { db.close(); resolve((req.result as T | undefined) ?? null); };
      req.onerror = () => { db.close(); reject(req.error); };
    })).then((saved) => { if (active) onLoad(saved); }).catch(() => { if (active) onLoad(null); });
    return () => { active = false; };
  }, [onLoad]);
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      void dbOpen().then((db) => new Promise<void>((resolve, reject) => {
        const req = db.transaction(STORE, "readwrite").objectStore(STORE).put(value, KEY);
        req.onsuccess = () => { db.close(); resolve(); }; req.onerror = () => { db.close(); reject(req.error); };
      })).catch(onError);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [value, ready, onError]);
}
