import type { Metadata } from "next";
import AboutPage from "@/components/about-page";

export const metadata: Metadata = {
  title: "Quiénes somos | DeepFlow",
  description: "Conoce el propósito, la visión y las personas detrás de DeepFlow.",
};

export default function WhoWeArePage() {
  return <AboutPage />;
}
