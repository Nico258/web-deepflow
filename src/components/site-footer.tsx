import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin } from "@phosphor-icons/react/dist/ssr";
import { meeting, motto, siteLinks } from "@/data/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link className="brand" href="/" aria-label="DeepFlow, inicio">
            <Image className="brand-mark" src="/deepflowlogo.png" alt="" width={50} height={42} />
            <span className="brand-name">DeepFlow</span>
          </Link>
          <p>{motto}</p>
        </div>

        <nav className="site-footer-col" aria-label="Páginas">
          <p className="site-footer-label">Explora</p>
          <ul>
            {siteLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-footer-col">
          <p className="site-footer-label">Encuéntranos</p>
          <ul>
            <li className="site-footer-info">
              <Clock aria-hidden="true" size={15} /> {meeting.schedule}
            </li>
            <li>
              <a className="site-footer-info" href={meeting.mapsUrl} target="_blank" rel="noopener noreferrer">
                <MapPin aria-hidden="true" size={15} /> {meeting.place}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <p className="site-footer-bottom">Grupo de conexión de la iglesia El Lugar de Su Presencia</p>
    </footer>
  );
}
