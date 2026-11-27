// Canal entre el juego (Phaser) y la interfaz (React). El juego avisa qué mostrar
// y espera a que la persona termine de leer; React no toca el mundo del juego.

/** `choices`: textos de las respuestas, solo en la última línea si el diálogo termina en una elección. */
export type ResolvedLine = { speaker: string | null; text: string; color: number | null; choices?: string[] };

/** Un objeto que lleva el jugador, para mostrarlo arriba (ver `Item` en types.ts). */
export type CarriedItem = { name: string; color: number; hint?: string };

type Events = {
  /**
   * Abre un diálogo. React responde con `dialogDone` al cerrar la última línea: con el número
   * de la respuesta elegida (desde 0) si había elección, o null si no.
   */
  dialog: ResolvedLine[];
  dialogDone: number | null;
  /** Objetivo visible arriba; null lo oculta. */
  objective: string | null;
  /** El capítulo terminó. */
  complete: void;
  /** React pide pausar (true) o seguir (false) mientras muestra una ventana encima del juego. */
  pause: boolean;
  /** Lo que lleva el jugador ahora. */
  items: CarriedItem[];
  /**
   * React avisa cuánto ocupa arriba la interfaz (barra y objetivo), en píxeles de pantalla.
   * El juego no deja que el jugador ni el borde del mapa queden debajo.
   */
  hudInset: number;
};

type Handler<T> = (payload: T) => void;

export class NovenaBus {
  private handlers = new Map<keyof Events, Set<Handler<never>>>();

  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>) {
    let set = this.handlers.get(event);
    if (!set) this.handlers.set(event, (set = new Set()));
    set.add(handler as Handler<never>);
    return () => void set.delete(handler as Handler<never>);
  }

  emit<K extends keyof Events>(event: K, ...payload: Events[K] extends void ? [] : [Events[K]]) {
    this.handlers.get(event)?.forEach((h) => (h as Handler<Events[K]>)(payload[0] as Events[K]));
  }

  once<K extends keyof Events>(event: K) {
    return new Promise<Events[K]>((resolve) => {
      const off = this.on(event, (p) => {
        off();
        resolve(p);
      });
    });
  }

  clear() {
    this.handlers.clear();
  }
}
