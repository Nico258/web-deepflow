import { Cross, Bird, LinkBreak, Crown, HouseLine, Compass, Plant, Key, Handshake, Scales, Globe, Heart } from "@phosphor-icons/react";
import type { Stamp } from "@/data/stamps";

const icons = { Cross, Bird, LinkBreak, Crown, HouseLine, Compass, Plant, Key, Handshake, Scales, Globe, Heart };

export function StampSeal({ stamp, compact = false }: { stamp: Stamp; compact?: boolean }) {
  const Icon = icons[stamp.icon];
  const tilt = (stamp.id * 37 % 9) - 4;
  return <div className={`stamp-seal stamp-${stamp.tone} ${compact ? "compact" : ""}`} style={{ "--tilt": `${tilt}deg` } as React.CSSProperties} aria-label={`${stamp.title}, ${stamp.reference}`}>
    <div className="seal-ring"><Icon weight="duotone" aria-hidden="true" /><strong>{stamp.title}</strong><small>{stamp.reference}</small></div>
  </div>;
}
