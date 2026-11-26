"use client";

import { useLayoutEffect, useRef } from "react";

// Aviso breve. Se ve como popover="manual" (capa superior, sin depender de z-index) y el lector
// de pantalla lo recibe desde una región role="status" que siempre está en el DOM: si la región
// apareciera junto con el aviso, algunos lectores no lo anunciarían.
export function Toast({ id, msg }: { id: number; msg: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Sin Popover API (navegadores anteriores a 2024) se quita el atributo y queda como un aviso fijo normal.
    if (typeof el.showPopover === "function") el.showPopover();
    else el.removeAttribute("popover");
  }, [id, msg]);

  return (
    <>
      <p className="visually-hidden" role="status">
        {msg}
      </p>
      {msg && (
        <div key={id} ref={ref} popover="manual" className="toast" aria-hidden="true">
          {msg}
        </div>
      )}
    </>
  );
}
