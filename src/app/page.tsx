import type { Metadata } from "next";
import HomePage from "@/components/home-page";

export const metadata: Metadata = {
  title: "DeepFlow | Grupo de conexión",
  description: "Un grupo que avanza junto hacia lo profundo.",
};

export default function Home() {
  return <HomePage />;
}
