import { useId } from "react";

// Una persona de pie en el río (Ezequiel 47): el agua sube con cada día completado,
// de los tobillos hasta un río para nadar. Se usa en la página y en la imagen para compartir.

// Altura del agua (coordenada y del lienzo) según los días completados: 0 a 7.
const WATER_Y = [161, 146, 134, 121, 108, 94, 74, 47];
// Marcas de los niveles: tobillos, rodillas, cintura, nadar.
const MARKS = [146, 121, 94, 47];

export function DepthGauge({ completed, className }: { completed: number; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const y = WATER_Y[Math.min(Math.max(completed, 0), WATER_Y.length - 1)];
  // Ola con dos periodos de ancho para poder desplazarla en bucle.
  const wave = `M-40 ${y} q10 -5 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 V170 H-40 Z`;

  return (
    <svg className={`depth-gauge ${className ?? ""}`} viewBox="0 0 120 170" role="img" aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f8fb" />
          <stop offset="1" stopColor="#e3edf4" />
        </linearGradient>
        <linearGradient id={`${uid}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fb4d8" stopOpacity=".78" />
          <stop offset="1" stopColor="#1f5582" stopOpacity=".94" />
        </linearGradient>
        <clipPath id={`${uid}-clip`}>
          <rect width="120" height="170" rx="16" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${uid}-clip)`}>
        <rect width="120" height="170" fill={`url(#${uid}-sky)`} />
        {MARKS.map((m) => (
          <line key={m} x1="6" x2="16" y1={m} y2={m} stroke="#9fb7c9" strokeWidth="1.5" strokeLinecap="round" />
        ))}
        <path d="M0 161 H120 V170 H0 Z" fill="#d8c9a4" />

        <g fill="#173b5c" stroke="#173b5c" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="60" cy="27" r="11" stroke="none" />
          <line x1="60" y1="47" x2="60" y2="94" strokeWidth="17" />
          <path d="M53 52 L39 82 M67 52 L81 82" strokeWidth="8" fill="none" />
          <path d="M55 96 L52 156 M65 96 L68 156" strokeWidth="9" fill="none" />
        </g>

        {completed > 0 && (
          <g className="depth-gauge-water">
            <path d={wave} fill={`url(#${uid}-water)`} />
            <path d={`M-40 ${y} q10 -5 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0`} fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1.6" />
          </g>
        )}
      </g>
    </svg>
  );
}
