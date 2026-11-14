# 02 · Reto de 7 días: «Hablo con Dios cada día»

Fuente de verdad visual y de textos: páginas 3 y 4 del PDF de diseño (ver nota sobre su lectura en el README). Identidad, token y privacidad: [00-arquitectura.md §3](00-arquitectura.md). Endpoints: [03-api.md](03-api.md). Tablas: [04-base-de-datos.md](04-base-de-datos.md).

> **Primer lanzamiento:** el reto sale en una versión local, sin API ni base de datos (sin muro, río del grupo ni nickname). Ver [06-reto-version-local.md](06-reto-version-local.md). Esta spec describe la versión con backend.

> **Alcance de esta spec:** solo el reto. Las **peticiones de oración son otra funcionalidad**, con su propio alcance y su propia spec ([05-peticiones-de-oracion.md](05-peticiones-de-oracion.md)). Comparten identidad (nickname, token) pero no páginas, ni lanzamiento, ni dependencias: el reto debe poder salir y funcionar sin ellas.

## 1. Qué es

Un reto de 7 días: cinco minutos al día para una conversación con Dios, con una pregunta distinta cada día. Hoy cada quien lo haría solo; la novedad de esta etapa es que **se ve cómo van los demás** (el río del grupo, el muro) y que hay **rachas**, sin convertirlo en competencia.

## 2. Contenido de la página (según el PDF)

| Bloque | Contenido |
|---|---|
| Encabezado | «Volver al inicio»; «Serie Conexión · Tema 6 · Actividad para casa»; título «Hablo con Dios cada día»; introducción |
| **Mi compromiso** | Texto «Durante los próximos 7 días voy a separar al menos 5 minutos para hablar con Dios. No necesito palabras perfectas, solamente un corazón dispuesto.» y espacio de **Mi firma** |
| **Mi reto** | Contador «N de 7 días completados» y siete días: 1 Agradecer, 2 Ser sincero, 3 Pedir perdón, 4 Escuchar, 5 Pedir ayuda, 6 Orar por otros, 7 Conversar |
| Día seleccionado | Pregunta del día (p. ej. Día 1: «¿Qué cosas buenas tengo hoy por las que puedo darle gracias a Dios?»); **Mi conversación con Dios (opcional)**; botón **Marcar este día como completado** |
| Frase para recordar | «Dios no busca palabras perfectas, busca una relación sincera conmigo» |
| **Tu avance** | «Días completados N / 7» y «Conversaciones escritas N» |
| Fuentes de consulta | «Ahora Qué 2, punto 1» y dos prédicas de Andrés Corson (con título y fecha) |
| Próximamente | «Más actividades como esta para continuar en casa» |
| **¿Qué hago cada día?** | Tres pasos: buscar un momento tranquilo; hablar con Dios con palabras propias; leer la pregunta del día y reflexionar. Nota: se puede hacer en la mañana, antes de dormir, caminando o en cualquier momento |
| Para compartir en la siguiente reunión | Cuatro preguntas: ¿qué día te resultó más fácil orar?; ¿qué descubriste sobre tu manera de hablar con Dios?; ¿cambió tu percepción de la oración?; ¿qué te gustaría mantener de este reto? |

La pregunta de cada día, la frase, las fuentes y las preguntas finales son **contenido estático del front**. Recomendado: `src/data/challenges/oracion-7-dias.ts` (días, preguntas, frase, fuentes), siguiendo el patrón de `src/data/`. **Decidido:** la base nunca guarda este contenido ([04](04-base-de-datos.md)); así los textos se corrigen sin migraciones ni despliegue de la API.

## 3. Reglas del reto

### Decididas

| Regla | Razón |
|---|---|
| **Todos empiezan el mismo día**: el reto tiene una fecha de inicio común, de reunión a reunión. Quien llega tarde entra **en el día en que va el grupo** | Es una dinámica de grupo; sin fecha común no hay muro ni río del grupo con sentido |
| **No se pueden completar días futuros.** Se abre un día nuevo cada medianoche, hora de Bogotá | Honestidad del avance. El servidor decide el día, no el reloj del celular |
| **Ventana de un día:** quien se salta un día puede completar el **día anterior** | Una racha que se rompe para siempre hace que la gente abandone |
| **Escribir es opcional:** el día se completa sin escribir nada | El reto invita, no exige |

Consecuencia práctica con la ventana de un día: si hoy es el día D, se pueden completar **D** y **D−1**, nada más antiguo ni nada futuro. Esto es lo que la API valida ([03](03-api.md)). La ventana sigue valiendo el día posterior al último: el día 7 se puede completar durante el día 8.

### Recomendadas

- **Medianoche:** el front debe volver a pedir el estado al recuperar el foco o cada vez que haga polling, para que el día nuevo se abra sin recargar.
- **Si falla la API al marcar el día:** mostrar el error y conservar el texto escrito (que ya está en el dispositivo). No dar el día por completado hasta que el servidor lo confirme.
- **Marcar un día es idempotente:** repetir la acción no duplica nada, y permite actualizar «sí escribí» si la persona escribió después de marcarlo.

### Abiertas

- **Quien llega tarde:** entra «en el día en que va el grupo». ¿Qué pasa con los días anteriores a su llegada? Con las reglas tal como están solo puede completar el día actual y el anterior; los demás quedan vacíos y su contador se ve bajo («2 de 7»). ¿Se ocultan, se marcan distinto, o se permite ponerse al día?
- **Fecha de inicio:** ¿el reto arranca el día de la reunión para todos, o ya hay gente haciéndolo por su cuenta? (pregunta 1 del README).

## 4. Tres medidas distintas

| Medida | Qué cuenta | De dónde sale |
|---|---|---|
| **Avance en el reto** | Días completados de 7 | Check-ins de la persona en este reto |
| **Racha personal** | Días seguidos con actividad. **No se reinicia al terminar el reto:** continúa con los retos y actividades siguientes | Se **calcula** a partir de los check-ins, nunca se guarda como contador |
| **Racha del grupo** | Días seguidos en que al menos cierta cantidad o porcentaje de personas completó el día | Se calcula igual, a partir de los check-ins de todos |

### Recomendado: cómo calcular las rachas

Para que la ventana de un día **proteja** la racha (esa es su razón de ser), la racha debe contar por el **día al que pertenece el check-in** (`starts_on + día − 1`), no por la fecha real en que se pulsó el botón. Si una persona completa el día 3 durante el día 4, el día 3 sigue contando como «día con actividad» y la racha no se rompe. Si se contara por fecha real, completar dos días el mismo día daría solo un día de racha y la ventana no serviría.

- La racha **actual** es la cantidad de días consecutivos con actividad que termina hoy o ayer: que hoy aún no esté marcado no rompe la racha (todavía se puede).
- Un check-in tardío con fecha real distinta se distingue en la base con `completed_on` ([04](04-base-de-datos.md)).

### Abierto

- **Umbral de la racha del grupo** (cantidad o porcentaje) depende de cuántas personas hay (pregunta 2 del README).
- **«La racha continúa con los retos y actividades siguientes»:** entre este reto y el siguiente puede haber días sin ninguna actividad abierta. ¿Cuentan o no? ¿Y la actividad del pasaporte, que es local y no llega a la API? Se necesita una regla antes de implementar «continúa».
- Cómo se calcula la racha del grupo para quien se inscribió a mitad del reto (propuesta: contar solo a quienes ya estaban inscritos ese día).

## 5. El río como medidor

En lugar de números, el nivel del río (los mismos cuatro niveles de «Quiénes somos» en la página principal):

| Días completados | Nivel |
|---|---|
| 1 a 2 | Hasta los tobillos |
| 3 a 4 | Hasta las rodillas |
| 5 a 6 | Hasta la cintura |
| 7 | Un río para nadar |

Hay un **nivel personal** y un **río del grupo**, que sube con la suma de los check-ins de todos, como meta compartida.

**Decidido:** esos rangos y nombres, y que el río del grupo es la suma de check-ins de todos.

**Recomendado:** que el nivel se calcule en el **front** a partir de «días completados» (es una tabla de 4 filas; evita acoplar la API a nombres de nivel que podrían cambiar). Para el río del grupo, usar la misma proporción sobre el total posible (personas inscritas × 7): el río sube a lo largo de la semana, y 7 de 7 para todos es «un río para nadar». Los números exactos de cada tramo del río del grupo son una propuesta, no una decisión.

**Abierto:**
- Qué mostrar con **0 días completados** (el diseño no define un nivel para eso; no se inventa uno aquí).
- Si el río del grupo cuenta también a quienes tienen el muro desactivado. Recomendado que sí, ya que es un agregado sin nombres.

## 6. Muro del grupo

Todos ven cómo van los demás. Reglas **decididas**:

| Regla | Razón |
|---|---|
| **Sin ranking por puntaje.** Se ordena por actividad reciente o alfabéticamente | Un podio de quién ora más contradice el espíritu del tema y desanima a quienes van atrás |
| Se muestra **solo nickname, nivel del río y racha, nunca contenido** | Privacidad ([00 §3](00-arquitectura.md)) |
| **Sin estados negativos** como «perdió la racha» | Coherente con la ventana de un día: no se castiga |
| **Aparecer es opcional, activado por defecto** (`show_on_wall`) | Quien no quiera verse puede salir |
| La interacción es **animar** («enviar ánimo» u «oré por ti»), no comparar | |

**Recomendado:** polling cada 30–60 s, pausado cuando la pestaña no está visible. Una racha de 0 simplemente no se muestra.

## 7. Qué vive en el dispositivo y qué viene de la API

| Dato | Dónde | Por qué |
|---|---|---|
| Token | Dispositivo (`localStorage`) | Es la credencial |
| Texto de «Mi conversación con Dios» | **Solo dispositivo**, por reto y día | Contenido íntimo |
| **Firma** del compromiso | **Solo dispositivo** | Ídem |
| Cómo se hace la firma (dibujada, escrita) | *Abierto* | El PDF solo muestra «Mi firma» |
| Compromiso aceptado, preferencias de la vista | Dispositivo | Conveniencia |
| Nombre y nickname propios | API; copia local para mostrarlos | Fuente de verdad: servidor |
| **Qué días están completos, si se escribió** | **API** | Es lo que alimenta el muro y las rachas |
| «Conversaciones escritas N» de «Tu avance» | API (cuenta de `wrote_note`) | Evita contar desde el dispositivo, que no ve otros equipos |
| Día actual del reto, fecha de inicio | API (hora de Bogotá) | El servidor decide |
| Niveles del río, rachas (personal y del grupo) | API calcula; el front traduce a nivel | |
| Muro y río del grupo | API | |
| Preguntas, frase, fuentes, textos | Front (datos estáticos) | |

**Ojo con una consecuencia:** el texto vive solo en el dispositivo, así que **si la persona cambia de celular pierde sus conversaciones escritas** (el avance sí se conserva con el código de recuperación, el texto no). Debe decirse con claridad en la pantalla, y es una razón más para valorar un botón «descargar mis conversaciones» más adelante.

## 8. Flujo de la persona

1. Abre `/hablo-con-dios` (contenido visible sin registrarse: es estático) y toca «Empezar el reto».
2. Si no tiene token: ingresa **código de invitación**, **nombre** y **nickname**. La API devuelve el token y se guarda en el dispositivo.
3. Se inscribe en el reto y firma el compromiso (la firma queda en el dispositivo).
4. Cada día: lee la pregunta, escribe si quiere, marca el día. El río sube.
5. Ve el muro y el río del grupo.

**Abierto:** ¿la página es visible para quien no tiene el código, en modo solo lectura? Recomendado que sí (no hay nada sensible en el contenido estático), ocultando «Tu avance» y el muro.

## 9. Alcance del primer lanzamiento

**Incluye:** unirse con código del grupo, nombre y nickname; marcar el día como completado con la regla de ponerse al día; muro del grupo con niveles del río y racha; río del grupo.

**Queda para después** (iteraciones, de menor a mayor esfuerzo):

| Idea | Nota |
|---|---|
| Celebración al completar el día | El agua sube y aparece la frase para recordar. Solo front |
| Resumen personal al cerrar el día 7 | Con las cuatro preguntas para la reunión |
| Recordatorio diario | Enlace al calendario o mensaje del líder; las notificaciones push pueden esperar |
| Enviar ánimo («oré por ti») | Interacción del muro. Necesita su propia tabla (no está en el modelo acordado) |
| Código de recuperación | Ver [00 §3](00-arquitectura.md) |
| Sellos por reto terminado | Reutilizando la idea del pasaporte |
| Panel de líderes | |

## 10. Fuera de alcance por ahora

- **Peticiones de oración, «estoy orando» y su moderación:** funcionalidad aparte ([05](05-peticiones-de-oracion.md)).
- Ranking, puntos, insignias competitivas.
- Notificaciones push.
- Escribir o leer conversaciones de otras personas.
- Edición de la fecha de inicio por parte de las personas.
- Otros retos distintos a este (el modelo ya lo permite; ver [04](04-base-de-datos.md)).
