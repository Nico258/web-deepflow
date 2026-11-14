import { bottomColors, hairColors, hexOf, topColors, type Avatar } from "@/data/avatar";

// Monigote del reto, dibujado en el mismo lienzo de 120 × 170 que el río (DepthGauge).
// La ropa la elige cada persona; la pose y la cara dependen del nivel del río (0 a 4).
// Todas las prendas comparten los mismos puntos del cuerpo, así cualquier combinación encaja.

const INK = "#1d2a35";
const SKIN = "#ffffff";

type P = readonly [number, number];
type Arm = readonly [P, P, P]; // hombro, codo, mano

type Pose = { arms: readonly [Arm, Arm]; eyes: "lines" | "happy"; mouth: string; open?: boolean };

const POSES: readonly Pose[] = [
  // 0 · En la orilla: brazos sueltos.
  {
    arms: [
      [[50, 51], [47, 71], [46, 89]],
      [[70, 51], [73, 71], [74, 89]],
    ],
    eyes: "lines",
    mouth: "M56.5 34 Q60 36.5 63.5 34",
  },
  // 1 · Hasta los tobillos: manos en la cintura.
  {
    arms: [
      [[50, 51], [40, 70], [51, 87]],
      [[70, 51], [80, 70], [69, 87]],
    ],
    eyes: "lines",
    mouth: "M55.5 33.5 Q60 37.5 64.5 33.5",
  },
  // 2 · Hasta las rodillas: saluda.
  {
    arms: [
      [[50, 51], [47, 71], [46, 89]],
      [[70, 51], [83, 49], [87, 31]],
    ],
    eyes: "lines",
    mouth: "M55 33 Q60 38.5 65 33",
  },
  // 3 · Hasta la cintura: brazos abiertos.
  {
    arms: [
      [[50, 51], [39, 61], [27, 59]],
      [[70, 51], [81, 61], [93, 59]],
    ],
    eyes: "lines",
    mouth: "M55 32.5 Q60 40 65 32.5 Z",
    open: true,
  },
  // 4 · Un río para nadar: celebra.
  {
    arms: [
      [[50, 51], [41, 38], [35, 20]],
      [[70, 51], [79, 38], [85, 20]],
    ],
    eyes: "happy",
    mouth: "M54.5 32 Q60 41.5 65.5 32 Z",
    open: true,
  },
];

// Índice válido para una lista aunque llegue un número negativo, decimal o NaN.
export const clampIndex = (n: number, length: number) => Math.min(Math.max(Math.trunc(n) || 0, 0), length - 1);

const line = (pts: readonly P[]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");

// Tramo del brazo desde el hombro hasta la fracción t (0 a 1) de su largo.
function armPart(arm: Arm, t: number): P[] {
  const [a, b, c] = arm;
  const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
  const d = t * (l1 + l2);
  if (d <= l1) return [a, [a[0] + ((b[0] - a[0]) * d) / l1, a[1] + ((b[1] - a[1]) * d) / l1]];
  const k = (d - l1) / l2;
  return [a, b, [b[0] + (c[0] - b[0]) * k, b[1] + (c[1] - b[1]) * k]];
}

// Trazo con contorno: brazos, piernas y mangas.
function Limb({ d, w, color = SKIN }: { d: string; w: number; color?: string }) {
  return (
    <>
      <path d={d} stroke={INK} strokeWidth={w + 2.6} fill="none" />
      <path d={d} stroke={color} strokeWidth={w} fill="none" />
    </>
  );
}

const SHADE = "rgba(0,0,0,.16)";
const SWIM_CAP = "#2bb3c0";
// Flores de la camisa hawaiana.
const FLOWERS = [
  [54, 61],
  [65.5, 58],
  [63, 70],
  [53.5, 76],
  [66, 83],
  [56, 89],
] as const;

// ───────── Cabello ─────────

const HAIR_BACK: Partial<Record<Avatar["hair"], string>> = {
  melena: "M45 25 C44 7 76 7 75 25 L77 41 Q73.5 44 70.5 40 H49.5 Q46.5 44 43 41 Z",
  largo: "M45 25 C44 7 76 7 75 25 L79 62 Q73 66 69 60 H51 Q47 66 41 62 Z",
  cola: "M71 15 C86 12 90 30 83 48 C81 38 79 28 72 23 Z",
};

const HAIR_FRONT: Partial<Record<Avatar["hair"], string>> = {
  corto: "M45.6 28 C44.5 14 52 11 60 11 C68 11 75.5 14 74.4 28 C71 21 66 18.5 60 19 C54 18.5 49 21 45.6 28 Z",
  despeinado:
    "M46.3 25 L43 15.5 L50.5 17 L51.5 9.5 L57.5 14.5 L62.5 7.5 L65.5 15 L73 11.5 L72.2 19.5 L74.4 27 C71 21 66 18.5 60 19 C54 18.5 49.5 21 46.3 25 Z",
  copete:
    "M45.6 27 C45 17 49 12.5 54 11.5 C55.5 5 66 2 74 7 C70 7.4 67.5 9.5 68.5 12.5 C73 15 75.3 20 74.4 27 C71 21 66 18.5 60 19 C54 18.5 49 21 45.6 27 Z",
  melena:
    "M45 40.5 L45 25 C44.4 6 75.6 6 75 25 L75 40.5 Q72.5 42.5 70.5 39 L71 27 C67 20.5 61 18.5 55 20 C52 21 50 23.5 49.5 27 L49.6 39 Q47.5 42.5 45 40.5 Z",
  cola: "M45.6 28 C44.5 14 52 11 60 11 C68 11 75.5 14 74.4 28 C72 22 68 19.5 62 19.5 C56 19 50 22 45.6 28 Z",
  "gorro-natacion":
    "M45.4 31 C44.2 7 75.8 7 74.6 31 Q72.5 30.5 71.5 27 C69 20.5 51 20.5 48.5 27 Q47.5 30.5 45.4 31 Z",
  largo:
    "M45 52 L45 25 C44.4 6 75.6 6 75 25 L75 52 Q72.5 54 70.5 50 L71 27 C67 20.5 61 18.5 55 20 C52 21 50 23.5 49.5 27 L49.6 50 Q47.5 54 45 52 Z",
};

// ───────── Tronco ─────────

const TORSO = "M49.5 49.5 Q60 45.5 70.5 49.5 L71 64 L69 94 L51 94 L49 64 Z";
const BLOUSE = "M49.5 49.5 Q60 45.5 70.5 49.5 L71 64 L68 84 L72 94 H48 L52 84 L49 64 Z";

// Largo de la manga (fracción del brazo) y grosor.
const SLEEVES: Record<Avatar["top"], { t: number; w: number }> = {
  camiseta: { t: 0.32, w: 7 },
  "manga-larga": { t: 0.88, w: 6 },
  buzo: { t: 0.88, w: 6.6 },
  chaqueta: { t: 0.88, w: 7 },
  camisa: { t: 0.88, w: 6 },
  blusa: { t: 0.22, w: 9.5 },
  hawaiana: { t: 0.34, w: 7.6 },
};

function Top({ top, color }: { top: Avatar["top"]; color: string }) {
  const stroke = { stroke: INK, strokeWidth: 1.3 };
  switch (top) {
    case "buzo":
      return (
        <>
          <path d={TORSO} fill={color} {...stroke} />
          <path d="M51.5 48.5 Q60 58 68.5 48.5 Q65 44 60 44.5 Q55 44 51.5 48.5 Z" fill={color} {...stroke} />
          <path d="M51.5 48.5 Q60 58 68.5 48.5 Q65 44 60 44.5 Q55 44 51.5 48.5 Z" fill={SHADE} />
          <path d="M58 53 V61 M62 53 V61" stroke={INK} strokeWidth="1" />
          <path d="M53.5 77 H66.5 L68 89 H52 Z" fill="none" stroke={SHADE} strokeWidth="1.3" />
          <path d="M51.2 90.5 H68.8" stroke={SHADE} strokeWidth="1.3" />
        </>
      );
    case "chaqueta":
      return (
        <>
          <path d={TORSO} fill="#4a3c35" {...stroke} />
          <path d="M49.5 49.5 Q53 47.5 56.5 47.2 L57 94 H51 L49 64 Z" fill={color} {...stroke} />
          <path d="M70.5 49.5 Q67 47.5 63.5 47.2 L63 94 H69 L71 64 Z" fill={color} {...stroke} />
          <path d="M56.5 47.5 L54 56 L57 58 M63.5 47.5 L66 56 L63 58" fill="none" stroke={INK} strokeWidth="1.1" />
          <path d="M51.5 76 H55.5 M64.5 76 H68.5" stroke={SHADE} strokeWidth="1.4" />
        </>
      );
    case "camisa":
      return (
        <>
          <path d={TORSO} fill={color} {...stroke} />
          <path d="M60 51.5 V94" stroke={SHADE} strokeWidth="1.2" />
          {[57, 64, 71, 78, 85].map((y) => (
            <circle key={y} cx="61.6" cy={y} r=".9" fill={INK} opacity=".55" />
          ))}
          <path d="M55 47 L60 51.5 L57.5 55 Z M65 47 L60 51.5 L62.5 55 Z" fill={color} {...stroke} strokeWidth="1.1" />
        </>
      );
    case "hawaiana":
      return (
        <>
          <path d={TORSO} fill={color} {...stroke} />
          {FLOWERS.map(([x, y]) => (
            <g key={`${x}-${y}`}>
              <circle cx={x} cy={y} r="1.9" fill="#fff" opacity=".85" />
              <circle cx={x} cy={y} r=".7" fill="#f2c14e" />
            </g>
          ))}
          <path d="M60 55 V94" stroke={SHADE} strokeWidth="1.2" />
          <path d="M54.5 47 L60 55 L56.5 57 Z M65.5 47 L60 55 L63.5 57 Z" fill={color} {...stroke} strokeWidth="1.1" />
          <path d="M56.6 47.6 L60 55 L63.4 47.6 Q60 46.6 56.6 47.6 Z" fill={SKIN} stroke={INK} strokeWidth="1" />
        </>
      );
    case "blusa":
      return (
        <>
          <path d={BLOUSE} fill={color} {...stroke} />
          <path d="M53.5 48.2 Q60 57 66.5 48.2 Q60 46 53.5 48.2 Z" fill={SKIN} stroke={INK} strokeWidth="1.1" />
          <path d="M52 84 H68" stroke={SHADE} strokeWidth="1.3" />
        </>
      );
    default:
      // Camiseta y manga larga.
      return (
        <>
          <path d={TORSO} fill={color} {...stroke} />
          <path d="M56 48 Q60 52.5 64 48" fill="none" stroke={INK} strokeWidth="1.2" />
        </>
      );
  }
}

// ───────── Piernas ─────────

const PANTS = "M51 92 H69 L71 150 H61.5 L60.4 104 H59.6 L58.5 150 H49 Z";

function Bottom({ bottom, color }: { bottom: Avatar["bottom"]; color: string }) {
  const stroke = { stroke: INK, strokeWidth: 1.3 };
  switch (bottom) {
    case "jean":
      return (
        <>
          <path d={PANTS} fill="#4d78ad" {...stroke} />
          <path d="M60 93 V103 M52.5 95 Q55 99 57.5 95 M67.5 95 Q65 99 62.5 95" fill="none" stroke="#86a9d2" strokeWidth="1.1" />
          <path d="M49.2 145.5 H58.6 L58.5 150 H49 Z M61.4 145.5 H70.8 L71 150 H61.5 Z" fill="#86a9d2" {...stroke} strokeWidth="1.1" />
        </>
      );
    case "sudadera":
      return (
        <>
          <path
            d="M50.5 92 H69.5 L72 140 L70.5 150 H61.5 L60.4 104 H59.6 L58.5 150 H49.5 L48 140 Z"
            fill={color}
            {...stroke}
          />
          <path d="M50.3 96 L48.6 139 M69.7 96 L71.4 139" stroke="#fff" strokeOpacity=".8" strokeWidth="1.2" />
          <path d="M48.6 144 H58.7 M61.3 144 H71.4" stroke={SHADE} strokeWidth="2" />
        </>
      );
    case "short":
      return (
        <>
          <path d="M51 92 H69 L70.5 113 H61 L60.3 103 H59.7 L59 113 H49.5 Z" fill={color} {...stroke} />
          <path d="M60 93 V102" stroke={SHADE} strokeWidth="1.2" />
        </>
      );
    case "pantaloneta":
      return (
        <>
          <path d="M50.5 92 H69.5 L71.5 116 H61 L60.3 104 H59.7 L59 116 H48.5 Z" fill={color} {...stroke} />
          <path d="M50.6 94 L48.9 115 M69.4 94 L71.1 115" stroke="#fff" strokeWidth="1.6" />
          <path d="M49.6 105 H58.9 M61.1 105 H70.4" stroke="#fff" strokeOpacity=".55" strokeWidth="1.3" />
          <path d="M59 94.5 L58.2 99.5 M61 94.5 L61.8 99.5" stroke="#fff" strokeWidth="1" />
        </>
      );
    case "falda":
      return (
        <>
          <path d="M52 91 H68 L74.5 117 H45.5 Z" fill={color} {...stroke} />
          <path d="M56 93 L53 116 M60 93 V116 M64 93 L67 116" stroke={SHADE} strokeWidth="1.2" />
        </>
      );
    case "falda-larga":
      return (
        <>
          <path d="M52 91 H68 L77 143 H43 Z" fill={color} {...stroke} />
          <path d="M56 95 L51 142 M64 95 L69 142" stroke={SHADE} strokeWidth="1.2" />
        </>
      );
    default:
      // Pantalón.
      return (
        <>
          <path d={PANTS} fill={color} {...stroke} />
          <path d="M54 100 L53.8 147 M66 100 L66.2 147" stroke={SHADE} strokeWidth="1.1" />
        </>
      );
  }
}

// ───────── Zapatos (pie izquierdo; el derecho es su reflejo) ─────────

function Shoe({ shoes }: { shoes: Avatar["shoes"] }) {
  const stroke = { stroke: INK, strokeWidth: 1.2 };
  switch (shoes) {
    case "converse":
      return (
        <>
          <path d="M57.5 143 V156 Q57.5 159.6 53.5 159.6 H45.8 Q42.4 159.6 43.2 156.6 Q44 153.4 50 152.4 L50.5 143 Z" fill="#2e3033" {...stroke} />
          <path d="M43 157.2 H57.5 V159.6 H45.8 Q42.6 159.6 43 157.2 Z" fill="#fff" {...stroke} strokeWidth="1" />
          <ellipse cx="46.4" cy="156" rx="2.8" ry="2.1" fill="#fff" {...stroke} strokeWidth="1" />
          <path d="M51 146 L56.5 147 M51 149 L56.5 150" stroke="#fff" strokeWidth=".9" />
        </>
      );
    case "botas":
      return (
        <>
          <path d="M57.5 133 V156 Q57.5 159.6 53.5 159.6 H45.2 Q42 159.6 42.8 156.4 Q43.8 152.8 49.8 152 L50 133 Z" fill="#8a5a36" {...stroke} />
          <path d="M50 137 H57.5" stroke="#5e3c22" strokeWidth="2" />
          <path d="M43.2 158.3 H57" stroke="#4a3020" strokeWidth="2.2" />
        </>
      );
    case "elegantes":
      return (
        <>
          <path d="M57 150.5 V156.4 Q57 159.6 53 159.6 H45 Q42.4 159.6 43 157 Q44 154 50 153.2 L51 150.5 Z" fill="#2a2422" {...stroke} />
          <ellipse cx="47.5" cy="155.8" rx="1.8" ry=".9" fill="#fff" opacity=".55" />
        </>
      );
    case "tacones":
      return (
        <>
          <path d="M56.8 151.5 V154.5 Q50 154.5 45.5 158.5 Q44.6 159.6 46 159.6 H49.5 Q52 157.5 55.5 157.5 Z" fill="#c43b3b" {...stroke} />
          <path d="M54.8 157.5 H56.8 L56.5 160.2 H55.6 Z" fill="#c43b3b" {...stroke} strokeWidth="1" />
        </>
      );
    case "chanclas":
      return (
        <>
          <path d="M56.8 149.5 V157 H46.6 Q43.8 157 44.4 155 Q45.4 152.9 50.5 152.6 L51.2 149.5 Z" fill={SKIN} {...stroke} />
          <path d="M43.4 157 H57.6 V159.8 H45.2 Q42.6 159.8 43.4 157 Z" fill="#2bb3c0" {...stroke} />
          <path d="M47.6 153.3 L49.6 156.6 L53.8 152" fill="none" stroke="#f2c14e" strokeWidth="1.9" />
        </>
      );
    case "sandalias":
      return (
        <>
          <path d="M56.8 149.5 V156.5 H46.6 Q43.8 156.5 44.4 154.6 Q45.4 152.6 50.5 152.4 L51.2 149.5 Z" fill={SKIN} {...stroke} />
          <path d="M43.6 156.5 H57.3 V159.6 H45.6 Q43 159.6 43.6 156.5 Z" fill="#a8774a" {...stroke} />
          <path d="M48 152.8 L49 156.4 M53.6 151.8 L52.8 156.4" stroke="#7a5232" strokeWidth="1.6" />
        </>
      );
    default:
      // Tenis.
      return (
        <>
          <path d="M57 149.5 V156 Q57 159.6 53 159.6 H45.8 Q42.6 159.6 43.2 156.8 Q44 153.6 49.5 152.6 L51 149.5 Z" fill="#fbfbf8" {...stroke} />
          <path d="M43.6 157.8 H56.6" stroke="#b9c2ca" strokeWidth="1.3" />
          <path d="M54.8 152.6 Q51.5 155.6 47 155.2" fill="none" stroke="#3b78c4" strokeWidth="1.3" />
        </>
      );
  }
}

// ───────── Accesorios ─────────

function Accessory({ accessory }: { accessory: Avatar["accessory"] }) {
  switch (accessory) {
    case "gafas":
      return (
        <g fill="none" stroke={INK} strokeWidth="1.4">
          <circle cx="55" cy="26" r="4.6" fill="#fff" fillOpacity=".25" />
          <circle cx="65" cy="26" r="4.6" fill="#fff" fillOpacity=".25" />
          <path d="M59.6 25.6 Q60 24.6 60.4 25.6 M50.4 25 L46 24 M69.6 25 L74 24" />
        </g>
      );
    case "gafas-natacion":
      return (
        <g stroke={INK} strokeWidth="1.2">
          <path d="M45.6 26 H50.4 M69.6 26 H74.4" stroke="#f08a24" strokeWidth="2.4" />
          <ellipse cx="55" cy="26" rx="4.8" ry="3.9" fill="#f08a24" />
          <ellipse cx="65" cy="26" rx="4.8" ry="3.9" fill="#f08a24" />
          <ellipse cx="55" cy="26" rx="3.2" ry="2.5" fill="#8fd6e4" fillOpacity=".85" />
          <ellipse cx="65" cy="26" rx="3.2" ry="2.5" fill="#8fd6e4" fillOpacity=".85" />
          <path d="M59.8 26 H60.2" strokeWidth="1.6" />
          <path d="M53.2 25 L54.6 24.4 M63.2 25 L64.6 24.4" stroke="#fff" strokeWidth=".9" />
        </g>
      );
    case "gafas-sol":
      return (
        <g stroke={INK} strokeWidth="1.4">
          <rect x="49.6" y="22.6" width="9.4" height="7" rx="3" fill={INK} />
          <rect x="61" y="22.6" width="9.4" height="7" rx="3" fill={INK} />
          <path d="M59 25 H61 M49.6 24.6 L46 23.8 M70.4 24.6 L74 23.8" fill="none" />
          <path d="M51.5 24.6 L53.5 24 M63 24.6 L65 24" stroke="#fff" strokeOpacity=".6" strokeWidth="1" />
        </g>
      );
    case "gorra":
      return (
        <g stroke={INK} strokeWidth="1.3">
          <path d="M45.6 21.5 C46 8.5 74 8.5 74.4 21.5 Z" fill="#2f78ad" />
          <path d="M46.4 21 Q36 20.5 31.5 23.5 Q34 26 47 24.6 Z" fill="#245f8c" />
          <circle cx="60" cy="9.6" r="1.3" fill="#245f8c" />
        </g>
      );
    case "audifonos":
      return (
        <>
          <path d="M45.5 26 C44 4 76 4 74.5 26" fill="none" stroke={INK} strokeWidth="4.2" />
          <path d="M45.5 26 C44 4 76 4 74.5 26" fill="none" stroke="#d8442f" strokeWidth="2.2" />
          <rect x="41.5" y="20.5" width="6.5" height="12" rx="3" fill="#d8442f" stroke={INK} strokeWidth="1.3" />
          <rect x="72" y="20.5" width="6.5" height="12" rx="3" fill="#d8442f" stroke={INK} strokeWidth="1.3" />
        </>
      );
    case "aretes":
      return (
        <g fill="none" stroke="#d9a23c" strokeWidth="1.6">
          <circle cx="45.8" cy="36" r="2.3" />
          <circle cx="74.2" cy="36" r="2.3" />
        </g>
      );
    default:
      return null;
  }
}

// ───────── Monigote completo ─────────

export function AvatarFigure({ avatar, level = 0 }: { avatar: Avatar; level?: number }) {
  const pose = POSES[clampIndex(level, POSES.length)];
  // El gorro de natación tiene su propio color, no el del cabello.
  const hair = avatar.hair === "gorro-natacion" ? SWIM_CAP : hexOf(hairColors, avatar.hairColor);
  const top = hexOf(topColors, avatar.topColor);
  const bottom = hexOf(bottomColors, avatar.bottomColor);
  const sleeve = SLEEVES[avatar.top];
  const hairBack = HAIR_BACK[avatar.hair];
  const hairFront = HAIR_FRONT[avatar.hair];

  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      {hairBack && <path d={hairBack} fill={hair} stroke={INK} strokeWidth="1.3" />}

      <Limb d="M56 92 L55 121 L54 151" w={3} />
      <Limb d="M64 92 L65 121 L66 151" w={3} />
      <Bottom bottom={avatar.bottom} color={bottom} />
      <Shoe shoes={avatar.shoes} />
      <g transform="matrix(-1 0 0 1 120 0)">
        <Shoe shoes={avatar.shoes} />
      </g>

      <Limb d="M60 40 L60 49" w={3} />
      <Top top={avatar.top} color={top} />
      {pose.arms.map((arm, i) => (
        <g key={i}>
          <Limb d={line(arm)} w={3} />
          <Limb d={line(armPart(arm, sleeve.t))} w={sleeve.w} color={top} />
          <circle cx={arm[2][0]} cy={arm[2][1]} r="2.7" fill={SKIN} stroke={INK} strokeWidth="1.3" />
        </g>
      ))}

      <circle cx="60" cy="27" r="14" fill={SKIN} stroke={INK} strokeWidth="1.6" />
      <ellipse cx="50.5" cy="32.5" rx="3.2" ry="2" fill="#f6b9b0" opacity=".7" />
      <ellipse cx="69.5" cy="32.5" rx="3.2" ry="2" fill="#f6b9b0" opacity=".7" />
      {pose.eyes === "lines" ? (
        <path d="M55 22.5 V29.5 M65 22.5 V29.5" stroke={INK} strokeWidth="2.2" />
      ) : (
        <path d="M52 27 Q55 22.5 58 27 M62 27 Q65 22.5 68 27" fill="none" stroke={INK} strokeWidth="2" />
      )}
      <path d={pose.mouth} fill={pose.open ? INK : "none"} stroke={INK} strokeWidth="1.4" />

      {hairFront && <path d={hairFront} fill={hair} stroke={INK} strokeWidth="1.3" />}
      {avatar.hair === "gorro-natacion" && (
        <path d="M50 16.5 Q54 11.5 60.5 11" fill="none" stroke="#fff" strokeOpacity=".7" strokeWidth="1.6" />
      )}
      <Accessory accessory={avatar.accessory} />
    </g>
  );
}
