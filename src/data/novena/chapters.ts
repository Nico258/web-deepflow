import type { ChapterInfo } from "@/game/novena/types";

// Los capítulos de la novena, en orden. `mapAt` es la posición del lugar en el mapa general
// (en porcentaje del ancho y del alto). Un capítulo sin `load` sale como «Próximamente».

export const novena = {
  title: "Camino a Belén",
  intro:
    "La historia del nacimiento de Jesús, contada en nueve capítulos para jugar a tu ritmo. Un complemento a la novena: juega uno por día o varios seguidos, como quieras.",
};

export const chapters: ChapterInfo[] = [
  {
    number: 1,
    slug: "templo",
    title: "La espera",
    place: "Templo de Jerusalén",
    playAs: "Zacarías",
    passage: "Lucas 1:5-25",
    summary: "Un sacerdote anciano entra a ofrecer el incienso y sale sin poder hablar.",
    mapAt: { x: 52, y: 64 },
  },
  {
    number: 2,
    slug: "anunciacion",
    title: "La Anunciación",
    place: "Casa de María, Nazaret",
    playAs: "María",
    passage: "Lucas 1:26-38",
    summary: "Un día normal en Nazaret… hasta que llega una visita inesperada.",
    mapAt: { x: 36, y: 15 },
  },
  {
    number: 3,
    slug: "visitacion",
    title: "La Visitación",
    place: "Montañas de Judea",
    playAs: "María",
    passage: "Lucas 1:39-80",
    summary: "Un viaje por las montañas para visitar a Isabel, y un niño que se llamará Juan.",
    mapAt: { x: 30, y: 70 },
  },
  {
    number: 4,
    slug: "sueno-de-jose",
    title: "El sueño de José",
    place: "Taller de José, Nazaret",
    playAs: "José",
    passage: "Mateo 1:18-25",
    summary: "Un carpintero con una decisión difícil y un sueño que lo cambia todo.",
    mapAt: { x: 50, y: 11 },
  },
  {
    number: 5,
    slug: "censo",
    title: "El edicto",
    place: "Plaza de Nazaret",
    playAs: "José",
    passage: "Lucas 2:1-4",
    summary: "Roma ordena un censo y hay que preparar un viaje largo.",
    mapAt: { x: 44, y: 23 },
  },
  {
    number: 6,
    slug: "camino",
    title: "El camino",
    place: "El camino a Judea",
    playAs: "José",
    passage: "Lucas 2:4-5",
    summary: "Unos 150 kilómetros a pie, con María a punto de dar a luz.",
    mapAt: { x: 54, y: 44 },
  },
  {
    number: 7,
    slug: "no-hay-lugar",
    title: "No hay lugar",
    place: "Belén",
    playAs: "José",
    passage: "Lucas 2:6-7",
    summary: "Belén está llena. Puerta tras puerta, nadie tiene lugar.",
    mapAt: { x: 46, y: 80 },
  },
  {
    number: 8,
    slug: "pastores",
    title: "Los pastores",
    place: "Campos de pastores",
    playAs: "Eliel, un pastor joven",
    passage: "Lucas 2:8-15",
    summary: "Una noche fría cuidando ovejas… hasta que el cielo se ilumina.",
    mapAt: { x: 64, y: 86 },
    load: () => import("./capitulos/08-pastores").then((m) => m.default),
  },
  {
    number: 9,
    slug: "establo",
    title: "Nochebuena",
    place: "El establo",
    playAs: "Eliel",
    passage: "Lucas 2:16-20",
    summary: "Un niño envuelto en tiras de tela, acostado en un pesebre.",
    mapAt: { x: 38, y: 89 },
  },
  {
    number: 10,
    bonus: true,
    slug: "reyes",
    title: "Desde el oriente",
    place: "Tierras del oriente",
    playAs: "Un mago",
    passage: "Mateo 2:1-12",
    summary: "Capítulo extra: una estrella nueva y un viaje para adorar al Rey.",
    mapAt: { x: 88, y: 52 },
  },
];

export const chapterLabel = (c: ChapterInfo) => (c.bonus ? "Capítulo extra" : `Capítulo ${c.number}`);
