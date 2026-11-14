"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

const startPadding = (track: HTMLElement) => parseFloat(getComputedStyle(track).scrollPaddingLeft) || 0;

// Carrusel horizontal con scroll-snap: se desliza con el dedo, el trackpad o las
// flechas. Las flechas y los puntos solo aparecen si las tarjetas no caben.
export function ActivityCarousel({ children, label }: { children: ReactNode; label: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const slides = Children.toArray(children);
  const [active, setActive] = useState(0);
  const [overflow, setOverflow] = useState(false);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    setOverflow(max > 4);
    setEdges({ start: track.scrollLeft <= 4, end: track.scrollLeft >= max - 4 });

    // La tarjeta activa es la que tiene el borde izquierdo más cerca del inicio.
    const pad = startPadding(track);
    const items = Array.from(track.children) as HTMLElement[];
    let best = 0;
    let bestDist = Infinity;
    items.forEach((item, i) => {
      const dist = Math.abs(item.offsetLeft - pad - track.scrollLeft);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setActive(track.scrollLeft >= max - 4 && max > 4 ? items.length - 1 : best);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    track.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      track.removeEventListener("scroll", measure);
    };
  }, [measure]);

  const goTo = (index: number) => {
    const track = trackRef.current;
    const item = track?.children[index] as HTMLElement | undefined;
    if (!track || !item) return;
    track.scrollTo({ left: item.offsetLeft - startPadding(track), behavior: "smooth" });
  };

  return (
    <div className="activity-carousel" role="region" aria-roledescription="carrusel" aria-label={label}>
      <div className="activity-carousel-track" ref={trackRef}>
        {slides.map((slide, i) => (
          <div
            className="activity-carousel-slide"
            key={i}
            role="group"
            aria-roledescription="tarjeta"
            aria-label={`${i + 1} de ${slides.length}`}
          >
            {slide}
          </div>
        ))}
      </div>

      {overflow && (
        <div className="activity-carousel-controls">
          <button
            type="button"
            className="activity-carousel-arrow"
            onClick={() => goTo(Math.max(active - 1, 0))}
            disabled={edges.start}
            aria-label="Actividad anterior"
          >
            <CaretLeft aria-hidden="true" size={16} weight="bold" />
          </button>
          <div className="activity-carousel-dots">
            {slides.map((_, i) => (
              <button
                type="button"
                key={i}
                className={i === active ? "is-active" : undefined}
                onClick={() => goTo(i)}
                aria-label={`Ir a la actividad ${i + 1}`}
                aria-current={i === active ? "true" : undefined}
              />
            ))}
          </div>
          <button
            type="button"
            className="activity-carousel-arrow"
            onClick={() => goTo(Math.min(active + 1, slides.length - 1))}
            disabled={edges.end}
            aria-label="Actividad siguiente"
          >
            <CaretRight aria-hidden="true" size={16} weight="bold" />
          </button>
        </div>
      )}
    </div>
  );
}
