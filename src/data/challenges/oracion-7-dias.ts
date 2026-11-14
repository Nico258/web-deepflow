// Contenido estático del reto «Hablo con Dios todos los días» (spec 02 §2).

export type Verse = { text: string; ref: string };

export type ChallengeDay = {
  number: number;
  title: string;
  question: string;
  // Versículo corto que acompaña la pregunta (Reina-Valera 1960).
  verse: Verse;
};

export const challenge = {
  slug: "oracion-7-dias",
  theme: "Hablo con Dios todos los días",
  intro:
    "Un reto de 7 días para tener una pequeña conversación con Dios cada día: genuina, íntima y sin barreras.",
  commitment:
    "Durante los próximos 7 días voy a separar al menos 5 minutos para hablar con Dios.",
  commitmentNote: "No necesito palabras perfectas, solamente un corazón dispuesto.",
  // Versículo para recordar: Dios escucha a quien le habla de verdad, no a quien usa palabras perfectas.
  verse: { text: "Cercano está Jehová a todos los que le invocan, a todos los que le invocan de veras.", ref: "Salmos 145:18" } satisfies Verse,
  // Sábado 14 a viernes 20 de noviembre. Cada día solo se puede marcar en su fecha (hora de Bogotá).
  startsOn: "2026-11-14",
  totalDays: 7,
  // Lo mínimo que hay que escribir para marcar el día: una frase corta.
  minNoteLength: 15,
};

// Solo la pregunta del día 1 viene literal de las specs. Las de los días 2 a 7
// son una propuesta: deben confirmarse contra el PDF de diseño.
export const days: ChallengeDay[] = [
  {
    number: 1,
    title: "Agradecer",
    question: "¿Qué cosas buenas tengo hoy por las que puedo darle gracias a Dios?",
    verse: { text: "Dad gracias en todo, porque esta es la voluntad de Dios para con vosotros en Cristo Jesús.", ref: "1 Tesalonicenses 5:18" },
  },
  {
    number: 2,
    title: "Ser sincero",
    question: "¿Qué hay en mi corazón hoy que quiero contarle a Dios tal como es?",
    verse: { text: "Derramad delante de él vuestro corazón; Dios es nuestro refugio.", ref: "Salmos 62:8" },
  },
  {
    number: 3,
    title: "Pedir perdón",
    question: "¿Hay algo por lo que necesito pedirle perdón a Dios hoy?",
    verse: { text: "Si confesamos nuestros pecados, él es fiel y justo para perdonar nuestros pecados, y limpiarnos de toda maldad.", ref: "1 Juan 1:9" },
  },
  {
    number: 4,
    title: "Escuchar",
    question: "Si hago silencio unos minutos, ¿qué creo que Dios quiere decirme hoy?",
    verse: { text: "Estad quietos, y conoced que yo soy Dios.", ref: "Salmos 46:10" },
  },
  {
    number: 5,
    title: "Pedir ayuda",
    question: "¿En qué área de mi vida necesito hoy la ayuda de Dios?",
    verse: { text: "Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego, con acción de gracias.", ref: "Filipenses 4:6" },
  },
  {
    number: 6,
    title: "Orar por otros",
    question: "¿Por qué personas quiero orar hoy y qué le pido a Dios por ellas?",
    verse: { text: "Orad unos por otros, para que seáis sanados.", ref: "Santiago 5:16" },
  },
  {
    number: 7,
    title: "Conversar",
    question: "Si hoy hablara con Dios como con un amigo, ¿de qué le hablaría?",
    verse: { text: "Os he llamado amigos, porque todas las cosas que oí de mi Padre, os las he dado a conocer.", ref: "Juan 15:15" },
  },
];

export const dailySteps = [
  "Busco un momento tranquilo del día.",
  "Hablo con Dios con mis propias palabras, como con alguien de confianza.",
  "Leo la pregunta del día y reflexiono sobre ella.",
];

export const dailyStepsNote =
  "Puedo hacerlo en la mañana, antes de dormir, caminando o en cualquier momento que tenga disponible.";

export const shareQuestions = [
  "¿Qué día te resultó más fácil orar?",
  "¿Qué descubriste sobre tu manera de hablar con Dios?",
  "¿Cambió tu percepción de la oración?",
  "¿Qué te gustaría mantener de este reto?",
];

// Niveles del río (spec 02 §5) según los días completados.
export const riverLevels = [
  { level: 1, title: "Hasta los tobillos", min: 1 },
  { level: 2, title: "Hasta las rodillas", min: 3 },
  { level: 3, title: "Hasta la cintura", min: 5 },
  { level: 4, title: "Un río para nadar", min: 7 },
];

export function riverLevelFor(completed: number) {
  return [...riverLevels].reverse().find((l) => completed >= l.min) ?? null;
}

export function nextRiverLevel(completed: number) {
  return riverLevels.find((l) => l.min > completed) ?? null;
}
