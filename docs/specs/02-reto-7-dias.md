# 02 · Reto de 7 días: «Hablo con Dios cada día»

Fuente de verdad visual y de textos: páginas 3 y 4 del PDF de diseño (ver nota sobre su lectura en el README). Identidad, token y privacidad: [00-arquitectura.md §3](00-arquitectura.md). Endpoints: [03-api.md](03-api.md). Tablas: [04-base-de-datos.md](04-base-de-datos.md).

> **Primer lanzamiento:** el reto sale en una versión local, sin API ni base de datos (sin muro, río del grupo ni nickname). Ver [06-reto-version-local.md](06-reto-version-local.md). Esta spec describe la versión con backend.

> **Esta spec es solo del reto de 7 días.** Las **peticiones de oración son una funcionalidad completamente distinta** ([05-peticiones-de-oracion.md](05-peticiones-de-oracion.md)): otra página, otras tablas, otros endpoints y otro lanzamiento. Lo único que comparten es la identidad (nickname y token). Nada de esta spec depende de las peticiones: el reto sale y funciona sin ellas. Que el día 6 del reto se llame «Orar por otros» no las conecta.

## 1. Qué es

Un reto de 7 días: cinco minutos al día para una conversación con Dios, con una pregunta distinta cada día. Hoy cada quien lo haría solo; la novedad de esta etapa es que **se ve cómo van los demás** (el río del grupo, el muro) y que hay **rachas**, sin convertirlo en competencia.

**Primera edición (decidido):** del **sábado 14 de noviembre de 2026** (día 1, el día de la reunión) al **viernes 20 de noviembre de 2026** (día 7). En la reunión del sábado todos los presentes hacen juntos el día 1.

## 2. Contenido de la página (según el PDF)

| Bloque | Contenido |
|---|---|
| Encabezado | «Volver al inicio»; «Serie Conexión · Tema 6 · Actividad para casa»; título «Hablo con Dios cada día»; introducción |
| **Mi compromiso** | Texto «Durante los próximos 7 días voy a separar al menos 5 minutos para hablar con Dios. No necesito palabras perfectas, solamente un corazón dispuesto.» El espacio que el diseño rotula **Mi firma** es donde la persona **escribe su nickname**: firmar el compromiso es registrarse (decidido, ver §8). No hay firma dibujada ni escrita aparte |
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
| **Todos empiezan el mismo día**: el reto tiene una fecha de inicio común (sábado 14 de noviembre de 2026) | Es una dinámica de grupo; sin fecha común no hay muro ni río del grupo con sentido |
| **Cada día solo se puede completar ese mismo día**, hora de Bogotá. A medianoche el día **se bloquea**: si no se completó, queda sin completar y ya no se puede marcar | El reto es diario: el valor está en hacerlo cada día, no en ponerse al día después |
| **No se pueden completar días futuros.** Se abre un día nuevo cada medianoche, hora de Bogotá | Honestidad del avance. El servidor decide el día, no el reloj del celular |
| **Quien llega tarde solo participa en los días restantes.** Los días que pasaron antes de su llegada ya están bloqueados | Consecuencia directa del bloqueo diario |
| **La inscripción en el reto ocurre al completar el primer día**, no al registrarse ni al abrir la página | Quien solo se registra o curiosea no cuenta para las medidas del grupo (ver §4 y §5) |
| **Escribir es opcional:** el día se completa sin escribir nada | El reto invita, no exige |

Consecuencia práctica: si hoy es el día D del reto, **solo se puede completar el día D**. Esto es lo que la API valida ([03](03-api.md)). El viernes 20 a medianoche el reto queda cerrado.

### Recomendadas

- **Medianoche:** el front debe volver a pedir el estado al recuperar el foco o cada vez que haga polling, para que el día nuevo se abra (y el anterior se bloquee) sin recargar. Si la persona tiene el día abierto en pantalla y pasa la medianoche, la API rechazará el día anterior (`409 day_closed`): el front debe explicarlo con un mensaje amable y conservar el texto escrito.
- **Si falla la API al marcar el día:** mostrar el error y conservar el texto escrito (que ya está en el dispositivo). No dar el día por completado hasta que el servidor lo confirme.
- **Marcar un día es idempotente:** repetir la acción el mismo día no duplica nada, y permite actualizar «sí escribí» si la persona escribió después de marcarlo.
- **Días bloqueados sin completar:** mostrarlos de forma neutra (p. ej. atenuados), sin mensajes negativos. Para quien llegó tarde, los días anteriores a su llegada pueden mostrarse como «antes de que llegaras» en lugar de como días perdidos.

### Abiertas

### Delegada a quien hace la página del reto

- **Contador de quien llega tarde:** «N de 7» o «N de los días desde que llegaste». Con «de 7» quien llega el día 4 nunca pasa de 4 de 7. La API devuelve el día de inscripción (`joined_day`), así que cualquiera de las dos es posible.

## 4. Tres medidas distintas

| Medida | Qué cuenta | De dónde sale |
|---|---|---|
| **Avance en el reto** | Días completados de 7 | Check-ins de la persona en este reto |
| **Racha personal** | Días seguidos con actividad. **No se reinicia al terminar el reto:** continúa con los retos y actividades siguientes | Se **calcula** a partir de los check-ins, nunca se guarda como contador |
| **Racha del grupo** | Días seguidos en que al menos cierta **fracción de las personas inscritas** completó el día (**umbral diario**) | Se calcula igual, a partir de los check-ins de todos. El umbral vive en `challenges.config` (`group_streak_threshold`) |

**Decidido: quién cuenta como «inscrito».** Solo quien **completó al menos un día** del reto (la inscripción se crea con su primer check-in). Quien se registra con un nickname y nunca completa un día no cuenta en ninguna medida del grupo. Quien completó algún día y después dejó de hacerlo **sí** sigue contando.

### Recomendado: cómo calcular las rachas

Como cada día solo se completa ese mismo día, el día de actividad de un check-in coincide con la fecha en que se marcó (`starts_on + day_number − 1` = `completed_on`).

- **Racha personal actual:** días consecutivos con actividad que terminan hoy o ayer. Que hoy aún no esté marcado no rompe la racha (todavía se puede); si ayer quedó sin completar, la racha actual empieza de nuevo.
- **Racha del grupo:** un día «cuenta» si, de las personas inscritas **hasta ese día** (su primer check-in fue ese día o antes), la fracción que lo completó alcanza el umbral. Quien se inscribe más tarde no cuenta en los días anteriores a su llegada.

**Decidido: el umbral del grupo es 60 %** (`group_streak_threshold = 0.6`). Se evalúa **cada día**: si al menos el 60 % de las personas inscritas hasta ese día lo completó, el día cuenta como **ganado en equipo**; si no, el día queda **sin ganar en equipo** y la racha del grupo vuelve a cero. Ejemplo: con 20 personas inscritas, un día cuenta si lo completan 12 o más.

### Abierto

- **«La racha continúa con los retos y actividades siguientes»:** entre este reto y el siguiente puede haber días sin ninguna actividad abierta. ¿Cuentan o no? ¿Y la actividad del pasaporte, que es local y no llega a la API? Se necesita una regla antes de implementar «continúa». Para esta primera edición no afecta: solo hay un reto.

## 5. El río como medidor

En lugar de números, el nivel del río (los mismos cuatro niveles de «Quiénes somos» en la página principal):

| Días completados | Nivel |
|---|---|
| 1 a 2 | Hasta los tobillos |
| 3 a 4 | Hasta las rodillas |
| 5 a 6 | Hasta la cintura |
| 7 | Un río para nadar |

Hay un **nivel personal** y un **río del grupo**, que sube con la suma de los check-ins de todos, como meta compartida.

**Decidido:** esos rangos y nombres; que el río del grupo es la suma de check-ins de todos; y que **el grupo se mide contra las personas inscritas** (quien completó al menos un día, ver §4): el río es **proporcional** (check-ins hechos / check-ins posibles) y la racha del grupo usa un **umbral diario**. No hay un «el grupo lo logró» binario al final.

**Recomendado:**

- Que el nivel se calcule en el **front** a partir de «días completados» (es una tabla de 4 filas; evita acoplar la API a nombres de nivel que podrían cambiar).
- **Check-ins posibles** = para cada persona inscrita, los días transcurridos desde el día en que se inscribió hasta hoy (o hasta el día 7). Así quien llega tarde no baja el río por días en que no podía participar. El río sube a lo largo de la semana, y todos con todos sus días es «un río para nadar». Los números exactos de cada tramo del río del grupo son una propuesta, no una decisión.
- Tener presente que quien llega tarde no puede llegar al nivel personal «Un río para nadar» (7 días). Encaja con el bloqueo diario y no requiere nada especial.

**0 días completados (delegado a quien hace la página del reto):** la idea propuesta es un personaje **fuera del agua, esperando**, antes del primer nivel. La página también debe dejar claro **qué día del reto es hoy**.

**Abierto:**
- Si el río del grupo cuenta también a quienes tienen el muro desactivado. Recomendado que sí, ya que es un agregado sin nombres.

## 6. Muro del grupo

Todos ven cómo van los demás. Reglas **decididas**:

| Regla | Razón |
|---|---|
| **Sin ranking por puntaje.** Se ordena por actividad reciente o alfabéticamente | Un podio de quién ora más contradice el espíritu del tema y desanima a quienes van atrás |
| Se muestra **solo nickname, nivel del río y racha, nunca contenido** | Privacidad ([00 §3](00-arquitectura.md)) |
| Aparecen solo las **personas inscritas** (completaron al menos un día) | Quien solo se registró no tiene nada que mostrar |
| **Sin estados negativos** como «perdió la racha» o «se saltó un día» | Los días se bloquean, pero no se castiga a nadie por ello |
| **Aparecer es opcional, activado por defecto** (`show_on_wall`) | Quien no quiera verse puede salir |
| La interacción es **animar**, no comparar | Enviar ánimo queda para después (§9). No tiene relación con las peticiones de oración |

**Recomendado:** polling cada 30–60 s, pausado cuando la pestaña no está visible. Una racha de 0 simplemente no se muestra.

## 7. Qué vive en el dispositivo y qué viene de la API

| Dato | Dónde | Por qué |
|---|---|---|
| Token | Dispositivo (`localStorage`) | Es la credencial |
| Texto de «Mi conversación con Dios» | **Solo dispositivo**, por reto y día | Contenido íntimo |
| Preferencias de la vista | Dispositivo | Conveniencia |
| Nickname propio | API; copia local para mostrarlo | Fuente de verdad: servidor. No se guarda nombre de pila |
| **Qué días están completos, si se escribió** | **API** | Es lo que alimenta el muro y las rachas |
| «Conversaciones escritas N» de «Tu avance» | API (cuenta de `wrote_note`) | Evita contar desde el dispositivo, que no ve otros equipos |
| Día actual del reto, fecha de inicio | API (hora de Bogotá) | El servidor decide |
| Niveles del río, rachas (personal y del grupo) | API calcula; el front traduce a nivel | |
| Muro y río del grupo | API | |
| Preguntas, frase, fuentes, textos | Front (datos estáticos) | |

**Ojo con una consecuencia:** no hay código de recuperación ni contraseña (decidido, para no añadir fricción; ver [00 §3](00-arquitectura.md)). Las conversaciones escritas viven solo en el dispositivo: **si la persona cambia de celular o borra los datos del navegador, las pierde**. También pierde su cuenta: el nickname va atado al token de ese dispositivo, así que desde otro celular la API lo rechaza como «no disponible» ([00 §3](00-arquitectura.md)). Puede elegir otro nickname o pedir a un líder que libere el suyo (empieza de cero en ambos casos). Debe decirse con claridad en la pantalla.

## 8. Flujo de la persona

1. Abre `/hablo-con-dios` (contenido visible sin registrarse: es estático) y ve qué día del reto es hoy.
2. **Firma el compromiso escribiendo su nickname** (sin código de invitación, sin nombre ni contraseña). Si el nickname no existe, se crea la cuenta: la API devuelve el token y se guarda en el dispositivo. Si ya existe y no es suyo (otro token), se rechaza con «Ese nickname no está disponible» y debe elegir otro ([00 §3](00-arquitectura.md)). Si el dispositivo ya tiene su token, no necesita volver a registrarse.
3. Cada día: lee la pregunta, escribe si quiere, marca el día. **Al marcar su primer día acepta el aviso de privacidad y queda inscrita** en el reto. El río sube.
4. Ve el muro y el río del grupo.

**Decidido:** la página es visible para cualquiera (el contenido es estático y no hay código de invitación). «Tu avance» aparece para quien ya se registró; el muro y el río del grupo, también para quien se registró.

En la reunión del sábado 14 todos los presentes hacen los pasos 1 a 3 con el día 1, así que la mayoría queda inscrita desde el primer día.

## 9. Alcance del primer lanzamiento

**Incluye:** unirse eligiendo un nickname (entrada libre); marcar el día como completado, solo el mismo día; inscripción automática con el primer día completado; muro del grupo con niveles del río y racha; río del grupo.

**Queda para después** (iteraciones, de menor a mayor esfuerzo):

| Idea | Nota |
|---|---|
| Celebración al completar el día | El agua sube y aparece la frase para recordar. Solo front |
| Resumen personal al cerrar el día 7 | Con las cuatro preguntas para la reunión |
| Recordatorio diario | Enlace al calendario o mensaje del líder; las notificaciones push pueden esperar |
| Enviar ánimo | Interacción del muro dentro del reto. Necesita su propia tabla (no está en el modelo acordado). No es parte de las peticiones de oración |
| Sellos por reto terminado | Reutilizando la idea del pasaporte |
| Panel de líderes | |

## 10. Fuera de alcance por ahora

- **Peticiones de oración, «estoy orando» y su moderación:** son otra funcionalidad, con su propia spec ([05](05-peticiones-de-oracion.md)). El reto no las incluye, no las enlaza y no depende de ellas.
- Código de recuperación de cuenta (decidido no implementarlo por ahora; ver [00 §3](00-arquitectura.md)).
- Ponerse al día con días anteriores (los días se bloquean a medianoche).
- Ranking, puntos, insignias competitivas.
- Notificaciones push.
- Escribir o leer conversaciones de otras personas.
- Edición de la fecha de inicio por parte de las personas.
- Otros retos distintos a este (el modelo ya lo permite con `kind` y `config`; un tipo que no sea de pasos diarios traería su propia tabla de hechos; ver [04](04-base-de-datos.md)).
