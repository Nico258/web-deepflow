import type { Metadata } from "next";
import PassportApp from "@/components/passport-app";

export const metadata: Metadata = {
  title: "Pasaporte del Cielo | DeepFlow",
  description: "Personaliza tu pasaporte y descubre los sellos de la actividad.",
};

export default function PassportPage() {
  return <PassportApp />;
}
