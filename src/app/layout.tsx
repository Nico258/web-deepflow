import type { Metadata } from "next";
import { ViewTransition } from "react";
import { Playfair_Display, Caveat_Brush, Nunito } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const caveat = Caveat_Brush({ subsets: ["latin"], weight: "400", variable: "--font-script", display: "swap" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-ui", display: "swap" });

export const metadata: Metadata = {
  title: "DeepFlow | Grupo de conexión",
  description: "Conecta con Dios y con otros, cada vez más profundo.",
  icons: { icon: "/deepflowlogo-mini.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${playfair.variable} ${caveat.variable} ${nunito.variable}`}>
        {/* Al navegar entre páginas, la vieja se funde con la nueva (View Transitions). */}
        <ViewTransition name="page">{children}</ViewTransition>
      </body>
    </html>
  );
}
