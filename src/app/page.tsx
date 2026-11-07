import Link from "next/link";

const contents = [
  {
    href: "/pasaporte-del-cielo",
    category: "Fe · Actividad interactiva",
    title: "Pasaporte del Cielo",
    description:
      "Explora tu identidad en Dios, reúne tus sellos y crea un pasaporte personal para guardar o compartir.",
    label: "Explorar el pasaporte",
    featured: true,
  },
];

export default function Home() {
  return (
    <main className="deepflow-home">
      <header className="deepflow-nav">
        <Link className="deepflow-brand" href="/" aria-label="Deepflow, inicio">
          <span className="deepflow-mark" aria-hidden="true">d</span>
          <span>deepflow</span>
        </Link>
        <span className="deepflow-nav-note"></span>
      </header>

      <section className="deepflow-hero">
        <p className="deepflow-eyebrow">poner frase</p>
        <h1>Bienvenido a <span>Deepflow.</span></h1>
        <p className="deepflow-intro">
          Encuentra aquí
          contenido para aprender, reflexionar y seguir creciendo sobre la palabra de Dios
        </p>
      </section>

      <section className="deepflow-content" aria-labelledby="content-title">
        <div className="deepflow-section-heading">
          <div>
            <p className="deepflow-eyebrow">Descubre</p>
            <h2 id="content-title">Contenido</h2>
          </div>
          <span>Una colección en crecimiento</span>
        </div>

        <div className="deepflow-cards">
          {contents.map((content) => (
            <article
              className={`deepflow-card${content.featured ? " deepflow-card-featured" : ""}`}
              key={content.href}
            >
              <div className="deepflow-card-art" aria-hidden="true">
                <span className="deepflow-orbit deepflow-orbit-one" />
                <span className="deepflow-orbit deepflow-orbit-two" />
                <span className="deepflow-card-symbol">✦</span>
              </div>
              <div className="deepflow-card-copy">
                <p className="deepflow-card-category">{content.category}</p>
                <h3>{content.title}</h3>
                <p className="deepflow-card-description">{content.description}</p>
                <Link className="deepflow-card-link" href={content.href}>
                  {content.label}<span aria-hidden="true"> →</span>
                </Link>
              </div>
            </article>
          ))}
          <article className="deepflow-coming-card">
            <span className="deepflow-coming-icon" aria-hidden="true">+</span>
            <h3>Más contenido, pronto</h3>
            <p>Este espacio irá creciendo con nuevas ideas y experiencias.</p>
          </article>
        </div>
      </section>

      <footer className="deepflow-footer">
        <span className="deepflow-brand-name">deepflow</span>
        <span>Un espacio para fluir, descubrir y crecer.</span>
      </footer>
    </main>
  );
}
