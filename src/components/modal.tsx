"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

type Props = {
  className: string;
  onClose: () => void;
  children: ReactNode;
  /** Si se cierra al tocar fuera (además de Escape y el gesto «atrás», que siempre funcionan). */
  dismissible?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

const supportsClosedBy = () => typeof HTMLDialogElement !== "undefined" && "closedBy" in HTMLDialogElement.prototype;

const outside = (e: React.PointerEvent, el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
};

// Ventana modal sobre <dialog> nativo: el navegador atrapa el foco, deja inerte la página,
// la cierra con Escape o el gesto «atrás» y devuelve el foco al botón que la abrió.
// Se muestra al montarse; quien la usa la desmonta en onClose.
export function Modal({ className, onClose, children, dismissible = true, ...aria }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const mounted = useRef(true);
  const pressedOutside = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // useLayoutEffect: al desmontar, se cierra antes de que React quite el <dialog> del DOM,
  // para que el navegador devuelva el foco al botón que lo abrió.
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    mounted.current = true;
    dialog.setAttribute("closedby", dismissible ? "any" : "closerequest");
    if (!dialog.open) dialog.showModal();
    // React no escribe el atributo autofocus en el DOM, así que el foco inicial se marca con data-autofocus.
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => {
      mounted.current = false;
      if (dialog.open) dialog.close();
    };
  }, [dismissible]);

  // Respaldo para tocar fuera donde aún no existe closedby (Safari). Se mide la posición del
  // puntero, no event.target, porque el propio <dialog> también es el target de su relleno.
  const onPointerDown = (e: React.PointerEvent<HTMLDialogElement>) => {
    pressedOutside.current = dismissible && !supportsClosedBy() && outside(e, e.currentTarget);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDialogElement>) => {
    if (pressedOutside.current && outside(e, e.currentTarget)) e.currentTarget.close();
    pressedOutside.current = false;
  };

  return (
    <dialog
      ref={ref}
      className={className}
      {...aria}
      // El evento close llega en otra tarea: se ignora si ya se desmontó o se volvió a abrir
      // (en desarrollo, StrictMode monta, cierra y reabre el efecto).
      onClose={() => {
        if (mounted.current && !ref.current?.open) onCloseRef.current();
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      {children}
    </dialog>
  );
}
