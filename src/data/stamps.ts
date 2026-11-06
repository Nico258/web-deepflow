import { versesNtv } from "@/data/verses-ntv";

export type Stamp = {
  id: number;
  title: string;
  declaration: string;
  reference: string;
  verse: string;
  icon: "Cross" | "Bird" | "LinkBreak" | "Crown" | "HouseLine" | "Compass" | "Plant" | "Key" | "Handshake" | "Scales" | "Globe" | "Heart";
  tone: string;
};

export const stamps: Stamp[] = [
  { id: 1, title: "Soy salvo", declaration: "Por gracia he recibido salvación por medio de la fe.", reference: "Efesios 2:8", verse: "Porque por gracia sois salvos por medio de la fe; y esto no de vosotros, pues es don de Dios.", icon: "Cross", tone: "navy" },
  { id: 2, title: "Soy santo", declaration: "Dios me llama a vivir apartado para Él.", reference: "1 Pedro 1:16", verse: "Porque escrito está: Sed santos, porque yo soy santo.", icon: "Bird", tone: "sky" },
  { id: 3, title: "Soy perdonado", declaration: "En Jesús tengo redención y perdón.", reference: "Efesios 1:7", verse: "En quien tenemos redención por su sangre, el perdón de pecados según las riquezas de su gracia.", icon: "LinkBreak", tone: "teal" },
  { id: 4, title: "Soy hijo de Dios", declaration: "Al recibir a Jesús, soy hecho hijo de Dios.", reference: "Juan 1:12", verse: "Mas a todos los que le recibieron, a los que creen en su nombre, les dio potestad de ser hechos hijos de Dios.", icon: "Crown", tone: "gold" },
  { id: 5, title: "Soy su casa", declaration: "El Espíritu de Dios vive en mí.", reference: "1 Corintios 3:16", verse: "¿No sabéis que sois templo de Dios, y que el Espíritu de Dios mora en vosotros?", icon: "HouseLine", tone: "lavender" },
  { id: 6, title: "Tengo propósito", declaration: "Fui creado para las buenas obras que Dios preparó.", reference: "Efesios 2:10", verse: "Porque somos hechura suya, creados en Cristo Jesús para buenas obras, las cuales Dios preparó de antemano para que anduviésemos en ellas.", icon: "Compass", tone: "green" },
  { id: 7, title: "Soy nueva creación", declaration: "En Cristo, lo viejo pasó y todo es hecho nuevo.", reference: "2 Corintios 5:17", verse: "De modo que si alguno está en Cristo, nueva criatura es; las cosas viejas pasaron; he aquí todas son hechas nuevas.", icon: "Plant", tone: "teal" },
  { id: 8, title: "Soy heredero", declaration: "Soy heredero de Dios y coheredero con Cristo.", reference: "Romanos 8:17", verse: "Y si hijos, también herederos; herederos de Dios y coherederos con Cristo, si es que padecemos juntamente con él, para que juntamente con él seamos glorificados.", icon: "Key", tone: "amber" },
  { id: 9, title: "Soy amigo de Dios", declaration: "Jesús me llama amigo y comparte conmigo al Padre.", reference: "Juan 15:15", verse: "Ya no os llamaré siervos, porque el siervo no sabe lo que hace su señor; pero os he llamado amigos, porque todas las cosas que oí de mi Padre, os las he dado a conocer.", icon: "Handshake", tone: "sky" },
  { id: 10, title: "Soy justificado", declaration: "Por la fe tengo paz para con Dios.", reference: "Romanos 5:1", verse: "Justificados, pues, por la fe, tenemos paz para con Dios por medio de nuestro Señor Jesucristo.", icon: "Scales", tone: "green" },
  { id: 11, title: "Soy ciudadano del cielo", declaration: "Mi ciudadanía está en los cielos.", reference: "Filipenses 3:20", verse: "Mas nuestra ciudadanía está en los cielos, de donde también esperamos al Salvador, al Señor Jesucristo.", icon: "Globe", tone: "navy" },
  { id: 12, title: "Nada me separa de su amor", declaration: "Nada creado puede separarme del amor de Dios.", reference: "Romanos 8:38-39", verse: "Por lo cual estoy seguro de que ni la muerte, ni la vida, ni ángeles, ni principados, ni potestades, ni lo presente, ni lo por venir, ni lo alto, ni lo profundo, ni ninguna otra cosa creada nos podrá separar del amor de Dios, que es en Cristo Jesús Señor nuestro.", icon: "Heart", tone: "rose" },
];

/** Versículo del sello: NTV cuando está cargado en verses-ntv.ts; si no, Reina-Valera 1960. */
export function getVerse(stamp: Stamp): { text: string; version: string } {
  const ntv = versesNtv[stamp.id]?.trim();
  return ntv ? { text: ntv, version: "NTV" } : { text: stamp.verse, version: "Reina-Valera 1960" };
}
