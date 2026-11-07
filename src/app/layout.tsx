import type { Metadata } from "next";
import { Playfair_Display, Caveat_Brush, Nunito } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const caveat = Caveat_Brush({ subsets: ["latin"], weight: "400", variable: "--font-script", display: "swap" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-ui", display: "swap" });

export const metadata: Metadata = {
  title: "Deepflow  ",
  description: "Contenido del Grupo ",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${playfair.variable} ${caveat.variable} ${nunito.variable}`}>{children}</body>
    </html>
  );
}
