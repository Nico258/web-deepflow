# Especificación – Pasaporte del Cielo

## 1. Objetivo

Crear una página web sencilla, visual e interactiva para que cada participante construya su pasaporte digital de identidad en Cristo, abra sobres con sellos de la actividad y descargue el resultado como imagen.

## 2. Requerimientos funcionales

- **RF-01. Mostrar el pasaporte:** reproducir la estructura de la referencia con el título «Cédula del Cielo», el subtítulo «Identidad eterna», espacio para foto, nombre, ciudadanía (etiqueta «Tu ciudadanía»: «Reino de Dios»), expedición («Expedida por Dios»), área para sellos y la frase «Una identidad que no se pierde, se vive» (Isaías 43:4). A los lados del título se muestran el planeta (izquierda) y la corona (derecha), cada uno con un espacio de «Tus gustos» debajo (ver RF-02). En la interfaz, el documento se llama «pasaporte».
- **RF-02. Personalizar:** permitir cargar una fotografía (tocando el espacio de la foto en el pasaporte), escribir el nombre, elegir entre algunas opciones básicas de color y elegir «Tus gustos». Los cambios deben reflejarse inmediatamente.
  - **Color:** cada opción cambia la paleta completa del pasaporte (borde, tinta, papel, líneas y acentos), no solo el borde. La paleta del pasaporte es independiente del diseño de la web. Los sellos conservan sus colores propios.
  - **Tus gustos:** el pasaporte tiene 2 espacios, uno debajo del planeta (izquierda) y otro debajo de la corona (derecha). La persona puede llenar cada espacio con una de estas imágenes: balón de fútbol, audífonos, libro, mancuerna y mando de videojuegos. No se puede repetir la misma imagen en los dos espacios, y se puede cambiar o quitar en cualquier momento. Son opcionales y no afectan a los sellos.
- **RF-03. Mostrar los sellos:** incluir los 12 sellos definidos para la actividad, cada uno con su diseño, declaración y referencia bíblica:
  1. Soy salvo — Efesios 2:8.
  2. Soy santo — 1 Pedro 1:16.
  3. Soy perdonado — Efesios 1:7.
  4. Soy hijo de Dios — Juan 1:12.
  5. Soy su casa — 1 Corintios 3:16.
  6. Tengo propósito — Efesios 2:10.
  7. Soy nueva creación — 2 Corintios 5:17.
  8. Soy heredero — Romanos 8:17.
  9. Soy amigo de Dios — Juan 15:15.
  10. Soy justificado — Romanos 5:1.
  11. Soy ciudadano del cielo — Filipenses 3:20.
  12. Nada me separa de su amor — Romanos 8:38-39.
- **RF-04. Abrir sobres aleatorios:** presentar tres sobres, cada uno con cuatro sellos. Al iniciar la actividad, mezclar aleatoriamente los 12 sellos y repartirlos entre los tres sobres, sin repetir ninguno. Cada participante tendrá su propio reparto aleatorio, por lo que los mismos sellos no estarán necesariamente en los mismos sobres para todos. El reparto se genera una vez por pasaporte y se conserva al volver a abrir o consultar la página; no debe volver a mezclarse en cada visita ni al recargar.
- **RF-05. Revelar y consultar sellos:** al abrir un sobre, revelar sus cuatro sellos. Los sobres ya abiertos se pueden volver a consultar. Al tocar un sello, mostrar su declaración, el versículo bíblico completo y la referencia.
- **RF-06. Pegar y organizar sellos:** ofrecer en cada sello revelado la opción «Pegar en mi pasaporte». El pasaporte tiene 12 espacios para sellos. La persona puede elegir libremente cualquier espacio disponible; el orden de los sellos en los sobres no determina su posición en el pasaporte. Los 12 espacios se organizan en 3 columnas y 4 filas. Permitir mover un sello pegado a otro espacio disponible y retirar un sello si desea reorganizarlo. Al pegar o mover un sello no debe volver a abrirse la ventana de detalle. Un sello solo puede ocupar un espacio a la vez y no se puede duplicar en el mismo pasaporte.
- **RF-07. Exportar:** generar una imagen del pasaporte terminado, incluyendo fotografía, nombre, personalización y sellos en sus posiciones elegidas, y permitir descargarla o compartirla desde el dispositivo.

## 3. Requerimientos no funcionales

- Diseño adaptable a celulares, tablets y computadores; priorizar el uso desde celulares.
- Interfaz intuitiva, clara y fácil de utilizar.
- Carga e interacción fluidas al abrir sobres y colocar o reorganizar sellos.
- En pantallas táctiles, ofrecer controles claros para pegar, mover y retirar sellos, sin depender exclusivamente de arrastrar y soltar.
- Mantener el estilo gráfico de la referencia y asegurar que el pasaporte exportado sea legible y conserve su distribución.
- Compatibilidad con navegadores modernos.
- Guardar el progreso localmente en el navegador del dispositivo, sin enviar datos ni fotos a una base de datos. Conservar el reparto aleatorio, sobres abiertos, personalización (incluidos color y «Tus gustos») y ubicación de los sellos entre sesiones. El almacenamiento local depende del navegador y del dispositivo, y puede borrarse si la persona limpia los datos del sitio; la descarga de la imagen es la forma de conservar una copia compartible.

## 4. Funcionalidades opcionales

- **Experiencias asociadas a los sellos:** permitir que los participantes escriban situaciones o reflexiones relacionadas con un sello y que el grupo pueda consultarlas. Esta idea se mencionó en la reunión, pero su implementación y visibilidad no quedaron definidas.
- **Sincronización del pasaporte:** permitir retomar el pasaporte en otro dispositivo. Esta funcionalidad requiere almacenamiento compartido y queda fuera de la primera versión local.

## 5. Decisiones pendientes

- Definir si los sobres se pueden abrir en cualquier orden o si se debe abrir el siguiente solo después del anterior. Por defecto, los tres sobres estarán disponibles para abrir en cualquier orden.
- Definir si los pasaportes y las experiencias serán visibles para todo el grupo. En la primera versión, el pasaporte y el progreso son privados en el dispositivo del participante.
- Si se implementan experiencias compartidas o sincronización entre dispositivos, definir cómo se identificarán los participantes y dónde se almacenarán los datos. La visibilidad compartida requiere almacenamiento común; guardar datos solo en el navegador no permite que los demás los consulten.

## 6. Fuera del alcance inicial

El reto de reflexión «3 cosas que yo era antes y 3 cosas que Dios dice de mí ahora» y la conversación sobre la herencia familiar se realizarán durante la actividad, sin añadir formularios o secciones específicas a la web.

## 7. Flujo principal

1. El participante abre la página desde su celular.
2. Ingresa su nombre, carga una fotografía, personaliza los colores y elige hasta 2 «Tus gustos».
3. La página genera y guarda una distribución aleatoria de los 12 sellos entre tres sobres, con cuatro sellos distintos en cada uno.
4. El participante abre los sobres y consulta los sellos que contiene cada uno. Puede conversar con el grupo sobre los sellos que le salieron.
5. Desde un sello revelado, consulta su versículo y elige «Pegar en mi pasaporte».
6. Elige libremente uno de los 12 espacios disponibles. Puede repetir el proceso con los sellos de cualquier sobre y reorganizar las posiciones.
7. Descarga la imagen final o la comparte desde su dispositivo. La imagen conserva la proporción vertical del pasaporte (750 × 1500 px a doble resolución).
