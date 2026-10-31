import type { Metadata } from "next";
import type { ReactNode } from "react";
import Metrica from "../components/Metrica";
import Providers from "../components/Providers";
import RouteEffects from "../components/RouteEffects";
import SiteFooter from "../components/SiteFooter";
import "../styles.css";

export const metadata: Metadata = {
  title: "Создать сказку для ребёнка по фото и имени | Детки-сказки",
  description:
    "Создайте персональную сказку для ребёнка по имени и фото. Уникальная история, где ваш ребёнок становится главным героем. Электронная и печатная книга.",
  referrer: "strict-origin",
  alternates: { canonical: "https://aidaskazka.ru/" },
  icons: { icon: "/favicon.png" },
  openGraph: {
    type: "website",
    title: "Персональные сказки для детей | Детки-сказки",
    description: "Создайте уникальную сказку, где ваш ребёнок станет главным героем.",
    url: "https://aidaskazka.ru/",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <Providers>
          <div id="root" className="site-layout">
            <div className="site-content">{children}</div>
            <SiteFooter />
          </div>
          <RouteEffects />
        </Providers>
        <Metrica />
      </body>
    </html>
  );
}
