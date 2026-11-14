# 06 · Reto de 7 días: versión local (primer lanzamiento)

El reto «Hablo con Dios todos los días» sale **sin API ni base de datos**, igual que el Pasaporte del Cielo: todo se guarda en el navegador de cada persona. Esta spec describe cómo funciona esa versión y qué pasa en cada escenario. Las specs [02](02-reto-7-dias.md), [03](03-api.md) y [04](04-base-de-datos.md) siguen siendo la referencia para cuando exista el backend (muro, río del grupo, rachas, nickname).

Código: página en `src/app/hablo-con-dios/`, lógica en `src/hooks/use-challenge-progress.ts`, contenido en `src/data/challenges/oracion-7-dias.ts`.

## 1. Qué cambia frente a la spec 02

### Decidido

| Antes (spec 02, con API) | Ahora (versión local) | Por qué |
|---|---|---|
| Firma con nickname y token de dispositivo | Campo **Nombre** como en la cédula; si ya lo escribieron allí, aparece lleno | No hay servidor que necesite identificar a nadie |
| Muro del grupo y río del grupo | No existen | Requieren juntar datos de varias personas |
| Aviso de privacidad que se acepta | Nota informativa al final de la página | No se envía nada, no hay nada que aceptar |
| Escribir era opcional | **Escribir es obligatorio**, mínimo 15 caracteres (una frase corta) | El texto es la evidencia de que hubo conversación |
| Marcar día sin confirmación | Confirmación que muestra el texto antes de guardar | El texto deja de poder editarse cuando termina el día |
| Río personal en una lista de niveles | Ilustración de una persona en el río («Mi progreso») | Ocupa menos espacio y se entiende de un vistazo |
| — | Imagen para compartir (1080 × 1920) con la profundidad alcanzada | Cierre del reto, igual que la descarga del pasaporte |

## 2. Reglas

### Decidido

- **Fechas.** El reto va del sábado 14 al viernes 20 de noviembre de 2026. Todo se calcula con la **hora de Bogotá**, sin importar la zona horaria del celular.
- **Un día solo se marca en su fecha.** El día N se abre a las 00:00 de su fecha y se cierra a las 23:59. Un día que pasa sin guardarse queda gris y no se recupera.
- **Guardar.** Hay que escribir al menos 15 caracteres; si no, el campo se marca y aparece el aviso. Con el mínimo, una confirmación muestra el texto y avisa que, cuando termine el día, ya no se podrá editar.
- **Editar.** Durante el mismo día se puede editar lo guardado, con la misma validación y confirmación. Desde el día siguiente queda solo para leer.
- **Niveles** (spec 02 §5): 1 día = hasta los tobillos, 3 = rodillas, 5 = cintura, 7 = un río para nadar. El agua del dibujo sube con cada día, no solo al cambiar de nivel.
- **Imagen.** Se habilita al completar el día 7 o, si no se completó, desde el sábado 21 cuando el reto se cierra. Hace falta al menos un día completado. Antes de eso, «Compartir» y «Descargar» se ven en gris.

## 3. Qué se guarda y dónde

| Dato | Dónde | Clave |
|---|---|---|
| Días completados (fecha y texto) | `localStorage` | `deepflow:reto:oracion-7-dias:v3` → `entries` |
| Borradores sin guardar | `localStorage` | misma clave → `drafts` |
| Nombre escrito en el reto | `localStorage` | misma clave → `name` (`null` si nunca se escribió aquí) |
| Nombre de la cédula (solo lectura) | IndexedDB del pasaporte | `conexion-pasaporte` / `pasaporte-del-cielo-v1` |

No se usan cookies ni se hacen peticiones con datos. La imagen se genera en el navegador y solo sale si la persona la comparte o la descarga.

## 4. Escenarios

| # | Escenario | Qué pasa |
|---|---|---|
| 1 | Entra antes del 14 de noviembre | Todos los días aparecen bloqueados; al tocar uno dice cuándo se abre. «Mi progreso» dice cuándo empieza el reto |
| 2 | Escribe y guarda en su día | El óvalo se llena, el agua sube y el texto queda visible con «Editar» hasta medianoche |
| 3 | Escribe pero no guarda y vuelve más tarde ese día | El borrador sigue ahí (se guarda mientras escribe) |
| 4 | Escribe pero no guarda y pasa la medianoche | El día queda gris; se muestra «Lo que alcanzaste a escribir» con el aviso de que no se guardó |
| 5 | Confirma justo después de medianoche | La hora se revisa al guardar: no se guarda y aparece «El día terminó a medianoche y ya no se pudo guardar» |
| 6 | Tiene la página abierta al pasar la medianoche | El día cambia en máximo un minuto, o al volver a la pestaña. Si no había elegido otro día, salta al nuevo |
| 7 | Llega tarde (empieza el día 4) | Los días anteriores quedan grises. Lo más profundo que puede alcanzar es según los días que le quedan |
| 8 | Se salta días | Quedan grises; los demás siguen funcionando |
| 9 | Completa el día 7 el viernes | La imagen se habilita ese mismo momento |
| 10 | No completa el día 7 | La imagen se habilita el sábado 21 si completó al menos un día |
| 11 | Termina el reto con 0 días | No hay imagen; se explica que necesita al menos un día |
| 12 | Entra después del reto | Todo queda en modo lectura, con su progreso e imagen disponibles |
| 13 | Está en otra zona horaria | Rige la hora de Bogotá: en España el día cambia hacia las 6:00 am |
| 14 | Abre el reto en otro navegador o celular | Empieza de cero: el progreso no se comparte entre navegadores |
| 15 | Abre el enlace desde WhatsApp o Instagram | Algunos navegadores internos de apps guardan aparte del navegador normal. Recomendación: abrirlo siempre en el mismo navegador |
| 16 | Usa una ventana de incógnito | Funciona, pero se pierde al cerrarla. Si el navegador no deja guardar, aparece un aviso en rojo |
| 17 | Borra los datos del navegador | Se pierde el progreso; no hay copia en ningún servidor |
| 18 | Usa Safari (iPhone) | Safari puede borrar datos de sitios que no se visitan en 7 días. Durante el reto no afecta si entra cada día; después del reto, la imagen descargada es la copia |
| 19 | Tiene el reto abierto en dos pestañas | Se sincronizan: lo que guarda una aparece en la otra, sin pisarse |
| 20 | Escribió su nombre en la cédula | Aparece en el reto. Si lo cambia aquí, queda propio del reto y la cédula no cambia. Si no lo toca, sigue el de la cédula |
| 21 | No escribe nombre | La imagen sale sin nombre |
| 22 | Nombre muy largo | En la imagen el tamaño de letra se reduce para que quepa |
| 23 | Comparte desde un celular | Se abre el menú de compartir del celular. Si el navegador no puede compartir archivos, la imagen se descarga |
| 24 | Pulsa «Borrar mi progreso» | Se borran días, textos y borradores de ese navegador; el nombre se conserva |
| 25 | Datos guardados dañados o editados a mano | Se ignoran las partes que no tienen la forma esperada; el resto sigue funcionando |
| 26 | Sin internet | La página necesita conexión para abrirse; una vez abierta, guardar funciona sin internet |
| 27 | Cambia la fecha del celular | Ver §5 |

## 5. Cambiar la fecha del celular

### Decidido: riesgo aceptado

El «hoy» sale del reloj del celular (convertido a hora de Bogotá). Si alguien cambia la fecha, puede marcar días adelantados o recuperar días pasados. Se acepta porque:

- solo afecta su propio progreso y su propia imagen, que nadie más ve en la página;
- no hay servidor contra el cual comparar, y el reto se basa en la confianza.

### Abierto: si llega a importar

- Leer la hora de la respuesta del propio sitio (cabecera `Date`) al guardar, sin enviar datos. Cubre a quien está en línea.
- No aceptar fechas anteriores a la última fecha vista en ese navegador. Impide recuperar días pasados, no adelantar.
- Con la API (spec 03), el servidor decide la fecha y el problema desaparece.

## 6. Probar en local

El panel «Simulación local» (esquina inferior izquierda) cambia la fecha simulada y borra los datos. **Solo existe con `pnpm dev`**: en un build de producción el panel no se dibuja y la fecha simulada se ignora.

### Decidido

No habrá un modo de prueba con parámetro en la URL en producción: se podría filtrar y permitir adelantar el reto.

## 7. Pendientes

- Las preguntas de los días 2 a 7 son una propuesta; deben confirmarse contra el PDF de diseño.
- Confirmar los textos de los versículos en la versión que use la iglesia (están en Reina-Valera 1960).
- La página está hecha para un solo reto (fechas fijas). Para el siguiente, se agrega otro archivo en `src/data/challenges/` y su página.

## 8. Fuera de alcance por ahora

- Muro y río del grupo, rachas y nickname: llegan con la API (specs 02 a 04).
- Copia de seguridad o pasar el progreso a otro celular.
