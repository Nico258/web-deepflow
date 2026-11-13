import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChatCircleDots,
  Heart,
  HouseSimple,
} from "@phosphor-icons/react/dist/ssr";

const riverSteps = [
  { title: "Hasta los tobillos", verse: "Ez 47:3" },
  { title: "Hasta las rodillas", verse: "Ez 47:4" },
  { title: "Hasta la cintura", verse: "Ez 47:4" },
  { title: "Un río para nadar", verse: "Ez 47:5" },
];

const leaders = ["Laura Diaz", "Paola Morales", "Valentina Perico", "Ivan Camilo"];
const creators = ["Nico", "Johny", "Dani"];

const practices = [
  {
    title: "Conversamos un tema",
    description:
      "Cada semana tratamos un tema de la serie Conexión, con preguntas para conversar en la microcélula.",
    Icon: ChatCircleDots,
  },
  {
    title: "Oramos juntos",
    description:
      "Cerramos cada tema con un tiempo de ministración para responder a Dios.",
    Icon: Heart,
  },
  {
    title: "Lo vivimos en casa",
    description:
      "Cada tema se acompaña de una actividad para continuar entre reuniones.",
    Icon: HouseSimple,
  },
];

export default function AboutPage() {
  return (
    <div className="home-page about-page">
      <header className="topbar home-topbar">
        <Link className="brand home-brand" href="/" aria-label="DeepFlow, inicio">
          <Image
            className="brand-mark"
            src="/deepflowlogo.png"
            alt=""
            width={48}
            height={42}
            priority
          />
          <span className="brand-name">DeepFlow</span>
        </Link>
        <nav className="home-nav" aria-label="Navegación principal">
          <Link href="/">Inicio</Link>
          <Link className="active" href="/quienes-somos" aria-current="page">
            Quiénes somos
          </Link>
          <Link href="/#actividades">Actividades</Link>
        </nav>
        <span className="top-note home-top-note">Ezequiel 47:1-12</span>
      </header>

      <main className="about-main">
        <section className="about-hero" aria-labelledby="about-title">
          <div className="about-hero-copy">
            <p className="home-section-kicker">Quiénes somos</p>
            <h1 id="about-title">
              Somos <em>DeepFlow</em>, un grupo de{" "}
              <em>conexión</em> de la iglesia.
            </h1>
            <p>
              Un lugar para crecer con Dios y con otros. Aquí compartimos el
              contenido de cada tema y las actividades para vivirlo en casa.
            </p>
          </div>
          <div className="about-rings" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        </section>

        <section className="about-motto" aria-label="Nuestro lema">
          <p className="home-section-kicker">Nuestro lema</p>
          <p>«Tengo un propósito y nadie me separa de Dios.»</p>
        </section>

        <section className="about-river" aria-labelledby="river-title">
          <div className="about-river-copy">
            <p className="home-section-kicker">El nombre · Ezequiel 47:1-12</p>
            <h2 id="river-title">Un río que se vuelve más profundo con cada paso</h2>
            <p>
              En el río de Ezequiel el agua sube del tobillo a la rodilla, a la
              cintura hasta que solo se puede nadar. Así queremos crecer en
              DeepFlow: tema a tema, con Dios y acompañados.
            </p>
          </div>
          <ol className="about-river-steps">
            {riverSteps.map((step, index) => (
              <li className={`river-step-${index + 1}`} key={step.title}>
                <span>{index + 1}</span>
                <strong>{step.title}</strong>
                <small>{step.verse}</small>
              </li>
            ))}
          </ol>
        </section>

        <section className="about-practices" aria-labelledby="practices-title">
          <p className="home-section-kicker">Lo que hacemos</p>
          <h2 id="practices-title">Crecemos juntos, tema a tema</h2>
          <div className="about-practice-grid">
            {practices.map(({ title, description, Icon }) => (
              <article className="about-practice-card" key={title}>
                <Icon aria-hidden="true" size={20} />
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-team" aria-labelledby="leaders-title">
          <p className="home-section-kicker">Quién lidera</p>
          <h2 id="leaders-title">Las personas detrás del grupo</h2>
          <ul className="about-people-list">
            {leaders.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </section>

        <section className="about-team about-creators" aria-labelledby="creators-title">
          <p className="home-section-kicker">Equipo creativo</p>
          <h2 id="creators-title">Creadores</h2>
          <ul className="about-people-list about-creators-list">
            {creators.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </section>

        <Link className="about-back-link" href="/">
          Volver al inicio <ArrowRight aria-hidden="true" size={17} />
        </Link>
      </main>

      <footer className="home-footer">
        <Link className="brand-name" href="/" aria-label="DeepFlow, inicio">
          DeepFlow
        </Link>
        <span>Tengo un propósito y nadie me separa de Dios</span>
        <small>© 2026 DeepFlow</small>
      </footer>
    </div>
  );
}
