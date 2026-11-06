# Pasaporte del Cielo

Primera versión de la actividad del grupo Conexión. Aplicación web con Next.js App Router, React, TypeScript y Tailwind CSS.

## Ejecutar en desarrollo

Requiere Node.js 20.9 o posterior.

```bash
pnpm install
pnpm dev
```

Abre `http://localhost:3000`.

Para compilar una versión de producción, ejecuta `pnpm build`; para servirla, ejecuta `pnpm start`.

## Estructura

- `src/app`: rutas y estilos globales.
- `src/components`: interfaz del editor del pasaporte.
- `src/data`: contenido de los doce sellos y sus versículos.
- `src/data/themes.ts`: paletas completas del pasaporte (borde, tinta, papel, líneas y acentos).
- `src/data/badges.ts` y `src/components/badge-icon.tsx`: las imágenes de «Tus gustos» (hasta 2 por pasaporte).
- `src/data/verses-ntv.ts`: texto de los versículos en la NTV; mientras un sello no tenga texto aquí se muestra en Reina-Valera 1960.
- `pasaporte-specs.md`: especificaciones funcionales de la actividad.

El pasaporte se dibuja en un lienzo fijo de 750 × 1500 px (constante `PASSPORT_H` en `passport-app.tsx`) que se escala a la pantalla, así la vista previa y la imagen exportada son idénticas.

El progreso se conserva en IndexedDB en el navegador del dispositivo. Las fotos no se envían a ningún servicio. El reparto aleatorio de sobres se crea una vez y también queda guardado localmente. No hay base de datos ni cuentas en esta versión.

La interfaz y la lógica están separadas por responsabilidad para que el sitio pueda incorporar después nuevas rutas y actividades. Si en otra etapa se requiere sincronización o participación compartida, se podrá añadir una capa de almacenamiento remoto (por ejemplo, Supabase) sin convertir el estado local actual en una dependencia de ese servicio.

## Privacidad

Todo se guarda solo en el navegador del dispositivo (IndexedDB). La app no usa cookies, analítica, anuncios ni servicios de terceros en tiempo de ejecución (las tipografías se descargan al compilar y se sirven desde el mismo sitio), y no envía nombre, foto ni sellos a ningún servidor. Los datos solo salen del dispositivo cuando la persona descarga o comparte la imagen. Al final de la página hay un aviso breve que lo explica. Si en el futuro se añade sincronización, experiencias compartidas o analítica, hay que revisar este punto (política de tratamiento de datos y autorización, con especial cuidado si participan menores).
