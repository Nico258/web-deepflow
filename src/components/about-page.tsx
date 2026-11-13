import {
  ChatCircleDots,
  Heart,
  HouseSimple,
} from "@phosphor-icons/react/dist/ssr";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const riverSteps = [
  { title: "Hasta los tobillos", verse: "Ez 47:3" },
  { title: "Hasta las rodillas", verse: "Ez 47:4" },
  { title: "Hasta la cintura", verse: "Ez 47:4" },
  { title: "Un río para nadar", verse: "Ez 47:5" },
];

const leaders = ["Laura Diaz", "Paola Morales", "Valentina Perico", "Ivan Camilo"];
const developers = ["Nico", "Johny", "Dani"];

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
      <SiteHeader />

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
        </section>

        <section className="about-river about-river-box" aria-labelledby="river-title">
          <div className="about-river-copy">
            <p className="home-section-kicker">Ezequiel 47:1-12</p>
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

        <section className="about-team about-creators" aria-labelledby="developers-title">
          <p className="home-section-kicker">Developers</p>
          <h2 id="developers-title">Developers</h2>
          <ul className="about-people-list about-creators-list">
            {developers.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </section>

      </main>

      <SiteFooter />
    </div>
  );
}
