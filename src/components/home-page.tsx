import Link from "next/link";
import { ArrowRight, Clock, MapPin } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/site-header";

export default function HomePage() {
  return (
    <div className="home-page">
      <SiteHeader />

      <main className="home-main">
        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-hero-copy">
            <p className="eyebrow">
              Grupo de conexión · Tengo un propósito y nadie me separa de Dios
            </p>
            <h1 className="home-title" id="home-title">
              Conecta con <em>Dios</em> y con <em>otros</em>, cada vez más{" "}
              <em>profundo</em>.
            </h1>
            <p className="home-description">
              DeepFlow es un grupo de conexión de la iglesia. Aquí compartimos
              y crecemos juntos, avanzando cada vez más hacia lo profundo.
            </p>
          </div>
        </section>

        <section className="home-about" aria-labelledby="about-title">
          <div className="home-about-copy">
            <p className="home-section-kicker">Quiénes somos</p>
            <h2 id="about-title">Un grupo que avanza junto hacia lo profundo</h2>
            <p>
              Conoce quiénes somos, de dónde viene el nombre DeepFlow y cómo
              puedes unirte.
            </p>
          </div>
          <Link className="primary-btn home-about-link" href="/quienes-somos">
            Conocer al grupo <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </section>

        <section
          className="home-activities"
          id="actividades"
          aria-labelledby="activities-title"
        >
          <p className="home-section-kicker">Actividades para casa</p>
          <h2 id="activities-title">Para vivir cada tema entre reuniones</h2>
          <p className="home-activities-intro">
            Retos y dinámicas interactivas que acompañan los temas. Iremos
            sumando más con el tiempo.
          </p>
          <Link className="home-activity-card" href="/cedula-del-cielo">
            <span className="home-activity-copy">
              <span className="home-card-kicker">Actividad</span>
              <span className="home-activity-title">Pasaporte del Cielo</span>
              <span className="home-activity-description">
                Personaliza tu pasaporte, abre sobres y pega los 12 sellos de tu
                identidad eterna.
              </span>
              <span className="home-activity-progress" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span className="home-activity-link">
                Abrir pasaporte <ArrowRight aria-hidden="true" size={17} />
              </span>
            </span>
          </Link>
        </section>

        <div className="home-logistics" aria-label="Día, hora y lugar">
          <p>
            <Clock aria-hidden="true" size={20} />
            <span>
              <span className="home-logistics-label">Día y hora</span>
              Sábados a las 3:00 pm
            </span>
          </p>
          <p>
            <MapPin aria-hidden="true" size={20} />
            <span>
              <span className="home-logistics-label">Lugar</span>
              SuPresencia, sede Castellana, salón teatro 303
            </span>
          </p>
        </div>
      </main>

      <footer className="home-footer">
        <Link className="brand-name" href="/" aria-label="DeepFlow, inicio">
          DeepFlow
        </Link>
        <div className="home-footer-meta">
          <span>Tengo un propósito y nadie me separa de Dios</span>
          <small>© 2026 DeepFlow</small>
        </div>
      </footer>
    </div>
  );
}
