import { defineConfig, devices } from "@playwright/test";

// Pruebas automáticas de la novena (tests/novena). Ver docs/specs/07-novena-interactiva.md §3.
//
// Corren contra `pnpm dev` porque usan las herramientas de depuración del juego (window.__novena),
// que no existen en producción. Si ya hay un `pnpm dev` abierto en el puerto 3000, lo reutilizan.
//
// Navegador: por defecto, el Chromium de Playwright (se instala una vez con
// `pnpm exec playwright install chromium`). Para usar uno ya instalado, sin descargar nada:
// PW_CHANNEL=msedge (Edge en Windows) o PW_CHANNEL=chrome.

const channel = process.env.PW_CHANNEL || undefined;

export default defineConfig({
  testDir: "tests",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 }, channel } },
    {
      name: "celular",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 780 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, channel },
    },
  ],
  webServer: { command: "pnpm dev", url: "http://localhost:3000/novena", reuseExistingServer: true, timeout: 180_000 },
});
