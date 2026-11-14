import Link from "next/link";
import { ArrowRight, ArrowSquareOut, Clock, MapPin } from "@phosphor-icons/react/dist/ssr";
import { ActivityCarousel } from "@/components/activity-carousel";
import { ChallengeDateLabel, ChallengeDayDots } from "@/components/challenge-day-dots";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { challenge } from "@/data/challenges/oracion-7-dias";
import { meeting, motto } from "@/data/site";

export default function HomePage() {
  return (
    <div className="home-page">
      <SiteHeader />

      <main className="home-main">
        <section className="intro home-hero" aria-labelledby="home-title">
          <p className="eyebrow">{motto}</p>
          <h1 className="hero-title" id="home-title">
            Conecta con <em>Dios</em> y con <em>otros</em>, cada vez más <em>profundo</em>.
          </h1>
          <p className="home-description">
            DeepFlow es un grupo de conexión de la iglesia El Lugar de Su Presencia. Aquí compartimos y crecemos
            juntos, avanzando cada vez más profundo en Dios.
          </p>
        </section>

        <div className="home-logistics" aria-label="Día, hora y lugar">
          <p>
            <Clock aria-hidden="true" size={20} />
            <span>
              <span className="home-logistics-label">Día y hora</span>
              {meeting.schedule}
            </span>
          </p>
          <a href={meeting.mapsUrl} target="_blank" rel="noopener noreferrer">
            <MapPin aria-hidden="true" size={20} />
            <span>
              <span className="home-logistics-label">
                Lugar · ver en Maps <ArrowSquareOut aria-hidden="true" size={11} />
              </span>
              {meeting.place}
            </span>
          </a>
        </div>

        <section className="home-activities" id="actividades" aria-labelledby="activities-title">
          <p className="home-section-kicker">Contenido interactivo</p>
          <h2 id="activities-title">Para vivir cada tema entre reuniones</h2>
          <p className="home-activities-intro">Retos y dinámicas interactivas que acompañan los temas.</p>
          <ActivityCarousel label="Actividades">
            <Link className="home-activity-card home-activity-card--reto" href="/hablo-con-dios">
              <span className="home-activity-title">{challenge.theme}</span>
              <span className="home-activity-description">
                Un reto de 7 días para separar al menos 5 minutos y hablar con Dios, y ver cómo el grupo avanza
                junto.
              </span>
              <ChallengeDayDots startsOn={challenge.startsOn} totalDays={challenge.totalDays} />
              <ChallengeDateLabel startsOn={challenge.startsOn} totalDays={challenge.totalDays} />
              <span className="home-activity-link">
                Ir al reto <ArrowRight aria-hidden="true" size={17} />
              </span>
            </Link>
            <Link className="home-activity-card" href="/cedula-del-cielo">
              <span className="home-activity-title">Pasaporte del Cielo</span>
              <span className="home-activity-description">
                Personaliza tu pasaporte, abre sobres y pega los 12 sellos de tu identidad eterna.
              </span>
              <span className="home-activity-progress" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span className="home-activity-link">
                Abrir pasaporte <ArrowRight aria-hidden="true" size={17} />
              </span>
            </Link>
          </ActivityCarousel>
        </section>

        <section className="home-about" aria-labelledby="about-title">
          <div className="home-about-copy">
            <p className="home-section-kicker">Quiénes somos</p>
            <h2 id="about-title">Un grupo que avanza junto hacia lo profundo</h2>
            <p>Conoce quiénes somos, de dónde viene el nombre DeepFlow y cómo puedes unirte.</p>
          </div>
          <Link className="primary-btn home-about-link" href="/quienes-somos">
            Conoce al grupo <ArrowRight aria-hidden="true" size={17} />
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
