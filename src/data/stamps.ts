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
  { id: 1, title: "Soy salvo", declaration: "Por gracia he recibido salvación por medio de la fe.", reference: "Efesios 2:8", verse: "Dios los salvó por su gracia cuando creyeron. Ustedes no tienen ningún mérito en eso; es un regalo de Dios.", icon: "Cross", tone: "navy" },
  { id: 2, title: "Soy santo", declaration: "Dios me llama a vivir apartado para Él.", reference: "1 Pedro 1:16", verse: "Pues las Escrituras dicen: «Ustedes deben ser santos porque yo soy santo».", icon: "Bird", tone: "sky" },
  { id: 3, title: "Soy perdonado", declaration: "En Jesús tengo redención y perdón.", reference: "Efesios 1:7", verse: "Dios es tan rico en gracia y bondad que compró nuestra libertad con la sangre de su Hijo y perdonó nuestros pecados.", icon: "LinkBreak", tone: "teal" },
  { id: 4, title: "Soy hijo de Dios", declaration: "Al recibir a Jesús, soy hecho hijo de Dios.", reference: "Juan 1:12", verse: "Pero a todos los que creyeron en él y lo recibieron, les dio el derecho de llegar a ser hijos de Dios.", icon: "Crown", tone: "gold" },
  { id: 5, title: "Soy su casa", declaration: "El Espíritu de Dios vive en mí.", reference: "1 Corintios 3:16", verse: "¿No se dan cuenta de que todos ustedes juntos son el templo de Dios y que el Espíritu de Dios vive en ustedes?", icon: "HouseLine", tone: "lavender" },
  { id: 6, title: "Tengo propósito", declaration: "Fui creado para las buenas obras que Dios preparó.", reference: "Efesios 2:10", verse: "Pues somos la obra maestra de Dios. Él nos creó de nuevo en Cristo Jesús a fin de que hagamos las cosas buenas que preparó para nosotros tiempo atrás.", icon: "Compass", tone: "green" },
  { id: 7, title: "Soy nueva creación", declaration: "En Cristo, lo viejo pasó y todo es hecho nuevo.", reference: "2 Corintios 5:17", verse: "Esto significa que todo el que pertenece a Cristo se ha convertido en una persona nueva. La vida antigua ha pasado; ¡una nueva vida ha comenzado!", icon: "Plant", tone: "teal" },
  { id: 8, title: "Soy heredero", declaration: "Soy heredero de Dios y coheredero con Cristo.", reference: "Romanos 8:17", verse: "Y, como somos sus hijos, también somos sus herederos. De hecho, somos herederos junto con Cristo de la gloria de Dios; pero si vamos a participar de su gloria, también debemos participar de su sufrimiento.", icon: "Key", tone: "amber" },
  { id: 9, title: "Soy amigo de Dios", declaration: "Jesús me llama amigo y comparte conmigo al Padre.", reference: "Juan 15:15", verse: "Ya no los llamo esclavos, porque el amo no confía sus asuntos a los esclavos. Ustedes ahora son mis amigos, porque les he contado todo lo que el Padre me dijo.", icon: "Handshake", tone: "sky" },
  { id: 10, title: "Soy justificado", declaration: "Por la fe tengo paz para con Dios.", reference: "Romanos 5:1", verse: "Por lo tanto, ya que fuimos hechos justos a los ojos de Dios por medio de la fe, tenemos paz con Dios gracias a lo que Jesucristo nuestro Señor hizo por nosotros.", icon: "Scales", tone: "green" },
  { id: 11, title: "Soy ciudadano del cielo", declaration: "Mi ciudadanía está en los cielos.", reference: "Filipenses 3:20", verse: "En cambio, somos ciudadanos del cielo, donde vive el Señor Jesucristo; y esperamos con mucho anhelo que él regrese como nuestro Salvador.", icon: "Globe", tone: "navy" },
  { id: 12, title: "Nada me separa de su amor", declaration: "Nada creado puede separarme del amor de Dios.", reference: "Romanos 8:38-39", verse: "Y estoy convencido de que nada podrá jamás separarnos del amor de Dios. Ni la muerte ni la vida, ni ángeles ni demonios, ni nuestros temores de hoy ni nuestras preocupaciones de mañana. Ni siquiera los poderes del infierno pueden separarnos del amor de Dios. Ningún poder en las alturas ni en las profundidades, de hecho, nada en toda la creación podrá jamás separarnos del amor de Dios, que está revelado en Cristo Jesús nuestro Señor.", icon: "Heart", tone: "rose" },
];

/** Los versículos de los sellos están en Nueva Traducción Viviente. */
export function getVerse(stamp: Stamp): { text: string; version: string } {
  return { text: stamp.verse, version: "NTV" };
}
