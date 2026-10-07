import Metrica from "../components/Metrica";
import Providers from "../components/Providers";
import RouteEffects from "../components/RouteEffects";
import SiteFooter from "../components/SiteFooter";
import "../styles.css";

export const metadata = {
  title: "Создать сказку для ребёнка по фото и имени | Детки-сказки",
  description:
    "Создайте персональную сказку для ребёнка по имени и фото. Уникальная история, где ваш ребёнок становится главным героем. Электронная и печатная книга.",
  referrer: "strict-origin",
  alternates: { canonical: "https://aidaskazka.ru/" },
  icons: { icon: "/favicon.png" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content="Персональные сказки для детей | Детки-сказки"
        />
        <meta
          property="og:description"
          content="Создайте уникальную сказку, где ваш ребёнок станет главным героем."
        />
        <meta property="og:url" content="https://aidaskazka.ru/" />
      </head>
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
