import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
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
      <span className="top-note home-top-note">Ezequiel 47:1-12</span>
    </header>
  );
}
