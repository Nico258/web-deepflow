import Image from "next/image";
import Link from "next/link";

// Mismo encabezado que tenía la Cédula del Cielo antes de existir la página principal.
export function SiteHeader() {
  return (
    <header className="topbar">
      <Link className="brand" href="/" aria-label="DeepFlow, inicio">
        <Image className="brand-mark" src="/deepflowlogo.png" alt="" width={50} height={42} priority />
        <span className="brand-name">DeepFlow</span>
      </Link>
      <span className="top-note">Ezequiel 47:1-12</span>
    </header>
  );
}
