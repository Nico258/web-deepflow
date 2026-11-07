import type { Metadata } from "next";
import PassportApp from "@/components/passport-app";

export const metadata: Metadata = {
  title: "Pasaporte del Cielo | Deepflow",
  description: "Una identidad que no se pierde, se vive.",
};

export default function PassportPage() {
  return <PassportApp />;
}
