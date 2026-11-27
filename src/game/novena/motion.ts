// Preferencia de «reducir movimiento» del sistema (spec 07 §2). La usan el motor y la caja de
// diálogo: con ella, el texto aparece de una vez y la cámara, los brillos y los rebotes no se mueven.

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
