import { expect, test, type Page } from "@playwright/test";
import { chapterLabel, chapters } from "@/data/novena/chapters";
import type { NovenaDebug } from "@/game/novena/chapter-scene";
import type { Chapter, ChapterInfo } from "@/game/novena/types";
import { validateChapter } from "@/game/novena/validate";

// Pruebas de todos los capítulos jugables (los que tienen `load` en chapters.ts).
// No hay que escribir nada nuevo al agregar un capítulo: entra solo.
//
// 1. «El guion es válido»: corre el validador (sin navegador, en menos de un segundo).
// 2. «Se juega de punta a punta»: abre el capítulo y lo recorre sin jugarlo de verdad.
//    Cierra los diálogos al instante (con toques en el celular y con Enter en el computador),
//    toca de verdad a la persona con quien hay que hablar (en `flags`, a quien marca una bandera
//    que falta) y el resto de las metas las cumple con window.__novena.completeStep(): llega a la
//    zona o mete las ovejas al corral de una vez.
//    Termina cuando aparece el cierre con el versículo.
//
// Correr: `pnpm test:novena` (ver playwright.config.ts para elegir el navegador).

declare global {
  interface Window {
    __novena?: NovenaDebug;
  }
}

const playable = chapters.filter((c) => c.load);

/**
 * Carga el guion fuera del navegador. Playwright convierte los módulos a CommonJS, así que
 * `m.default` de chapters.ts llega envuelto una vez más.
 */
async function loadChapter(info: ChapterInfo): Promise<Chapter> {
  const loaded = (await info.load!()) as Chapter | { default: Chapter };
  return "default" in loaded ? loaded.default : loaded;
}

for (const info of playable) {
  const label = chapterLabel(info);

  test(`${label}: el guion es válido`, async ({}, testInfo) => {
    test.skip(testInfo.project.name !== "escritorio", "No depende de la pantalla: basta con correrlo una vez.");
    const { errors, warnings } = validateChapter(await loadChapter(info));
    for (const w of warnings) testInfo.annotations.push({ type: "aviso", description: w });
    expect(errors, `Errores del guion de ${label}`).toEqual([]);
  });

  test(`${label}: se juega de punta a punta`, async ({ page }, testInfo) => {
    const mobile = testInfo.project.name === "celular";
    const problems: string[] = [];
    page.on("pageerror", (e) => problems.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") problems.push(m.text());
    });

    await page.goto(`/novena?cap=${info.number}`);
    await page.waitForFunction(() => !!window.__novena, null, { timeout: 30_000 });

    const deadline = Date.now() + 75_000;
    const ending = page.locator(".nv-ending");
    const dialog = page.locator(".nv-dialog-layer");
    let steps = 0;
    let exitChecked = false;

    while (!(await ending.isVisible())) {
      expect(Date.now() < deadline, `${label} no llegó al cierre (paso: ${await currentStep(page)})`).toBe(true);

      if (await dialog.isVisible()) {
        if (mobile) await dialog.tap();
        else await page.keyboard.press("Enter");
        continue;
      }

      // Una vez por capítulo: «Mapa» a mitad del juego pregunta antes de salir, y se puede seguir jugando.
      if (!exitChecked) {
        exitChecked = true;
        const mapButton = page.getByRole("button", { name: "Mapa" });
        if (mobile) await mapButton.tap();
        else await mapButton.click();
        const confirm = page.getByRole("dialog", { name: "¿Salir del capítulo?" });
        await expect(confirm).toBeVisible();
        await confirm.getByRole("button", { name: "Seguir jugando" }).click();
        await expect(confirm).toBeHidden();
        continue;
      }

      const state = await page.evaluate(() => window.__novena!.state());
      if (state.busy || state.goal === "auto" || state.done) {
        await page.waitForTimeout(100);
        continue;
      }

      steps++;
      if (state.talkTo && (await tapActor(page, state.talkTo, mobile))) {
        // Tocar a la persona tiene que llevar al jugador hasta ella y abrir el diálogo.
        await expect(dialog, `Tocar a «${state.talkTo}» en el paso «${state.step}» no abrió su diálogo`).toBeVisible();
        continue;
      }
      const ok = await page.evaluate(() => window.__novena!.completeStep());
      expect(ok, `No se pudo cumplir el paso «${state.step}»`).toBe(true);
      await page.waitForTimeout(100);
    }

    const chapter = await loadChapter(info);
    await expect(ending.getByRole("heading", { level: 2 })).toHaveText(info.title);
    await expect(ending.locator("blockquote")).toContainText(chapter.ending.reference);
    expect(steps, "El capítulo debería tener al menos un paso jugable").toBeGreaterThan(0);

    const saved = await page.evaluate(() => localStorage.getItem("deepflow:novena:v1"));
    expect(saved, "El capítulo completado se guarda en el dispositivo").toContain(`"${info.slug}"`);
    expect(problems, "Errores en la consola").toEqual([]);
  });
}

async function currentStep(page: Page) {
  return page.evaluate(() => window.__novena?.state().step ?? "sin juego").catch(() => "sin juego");
}

/** Toca (o hace clic) a un personaje si está a la vista. Devuelve false si está fuera de la pantalla. */
async function tapActor(page: Page, id: string, mobile: boolean) {
  const point = await page.evaluate((actor) => {
    const api = window.__novena!;
    const tile = api.actorTile(actor);
    return tile ? api.screenPoint(tile) : null;
  }, id);
  const view = page.viewportSize()!;
  // Lejos de los bordes, para no tocar la barra de arriba ni quedar fuera de la pantalla.
  if (!point || point.x < 24 || point.y < 120 || point.x > view.width - 24 || point.y > view.height - 24) return false;
  if (mobile) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
  return true;
}
