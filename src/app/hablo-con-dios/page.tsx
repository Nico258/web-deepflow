import type { Metadata } from "next";
import ChallengeApp from "@/components/challenge-app";
import { SiteHeader } from "@/components/site-header";
import { challenge, dailySteps, dailyStepsNote, shareQuestions } from "@/data/challenges/oracion-7-dias";

export const metadata: Metadata = {
  title: "Hablo con Dios todos los días | DeepFlow",
  description: challenge.intro,
};

export default function ChallengePage() {
  return (
    <div className="app-shell">
      <SiteHeader />

      <main className="main-wrap reto-main">
        <section className="intro home-hero" aria-labelledby="reto-title">
          <p className="eyebrow">{challenge.theme}</p>
          <h1 className="hero-title" id="reto-title">
            Siete días para hablar con <em>Dios</em> de <em>corazón</em>.
          </h1>
          <p className="home-description">{challenge.intro}</p>
        </section>

        <ChallengeApp />

        <section className="reto-how" aria-labelledby="como-title">
          <h2 id="como-title">¿Qué hago cada día?</h2>
          <ol className="reto-how-steps">
            {dailySteps.map((step, i) => (
              <li key={step}>
                <span>{i + 1}</span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
          <p className="reto-how-note">{dailyStepsNote}</p>
        </section>

        <section className="reto-share" aria-labelledby="compartir-title">
          <p className="reto-kicker reto-kicker-green">Después de los 7 días</p>
          <h2 id="compartir-title">Para compartir en la siguiente reunión</h2>
          <ol>
            {shareQuestions.map((q, i) => (
              <li key={q}>
                <span>{i + 1}</span>
                {q}
              </li>
            ))}
          </ol>
        </section>

        <footer className="site-note">
          <p>
            Tu nombre, los días que completas y lo que le escribes a Dios se guardan solo en este dispositivo, dentro de tu
            navegador. No usamos cookies ni enviamos tus datos a ningún servidor: nadie más puede leer lo que escribes. Solo
            sale de aquí la imagen de tu progreso, cuando tú decides descargarla o compartirla. Si borras los datos del sitio,
            se pierde tu avance.
          </p>
        </footer>
      </main>
    </div>
  );
}
