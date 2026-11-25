import type { Metadata } from "next";
import { Pixelify_Sans } from "next/font/google";
import { NovenaApp } from "@/components/novena/novena-app";
import { SiteHeader } from "@/components/site-header";
import { novena } from "@/data/novena/chapters";

const pixel = Pixelify_Sans({ subsets: ["latin"], variable: "--font-pixel", display: "swap" });

export const metadata: Metadata = {
  title: `${novena.title} | DeepFlow`,
  description: novena.intro,
};

export default function NovenaPage() {
  return (
    <div className={`app-shell nv-shell ${pixel.variable}`}>
      <SiteHeader />

      <main className="main-wrap nv-main">
        <section className="nv-intro" aria-labelledby="nv-title">
          <p className="nv-kicker">Novena de Aguinaldos · Prototipo</p>
          <h1 id="nv-title">{novena.title}</h1>
          <p>{novena.intro}</p>
        </section>

        <NovenaApp />

        <footer className="site-note">
          <p>
            Los capítulos que completas se guardan solo en este dispositivo, dentro de tu navegador. No usamos cookies ni
            enviamos nada a ningún servidor. Si borras los datos del sitio, se pierde tu avance.
          </p>
        </footer>
      </main>
    </div>
  );
}
