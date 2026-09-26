import React from "react";
import { Link } from "react-router-dom";
import PublicHeader from "../components/PublicHeader";
import privacy from "../layerDocs/privacy.md?raw";
import policy from "../layerDocs/policy.md?raw";
import oferta from "../layerDocs/oferta.md?raw";

const documents = { privacy, policy, oferta };
const linkPattern =
  /(https?:\/\/[^\s]+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|8 910 562-97-08)/gi;

function linkedText(text) {
  return text.split(linkPattern).map((part, index) => {
    if (part === "8 910 562-97-08")
      return (
        <a key={index} href="tel:+79105629708">
          {part}
        </a>
      );
    if (/^[\w.+-]+@/.test(part))
      return (
        <a key={index} href={`mailto:${part}`}>
          {part}
        </a>
      );
    if (/^https?:\/\//.test(part)) {
      const url = part.replace(/[.,;:!?]+$/, "");
      const suffix = part.slice(url.length);
      const local = /^https:\/\/aidaskazka\.ru(?:\/|$)/.test(url);
      return (
        <React.Fragment key={index}>
          {local ? (
            <Link to={url.replace("https://aidaskazka.ru", "") || "/"}>
              {url}
            </Link>
          ) : (
            <a href={url}>{url}</a>
          )}
          {suffix}
        </React.Fragment>
      );
    }
    return part;
  });
}

export default function LegalDocumentPage({ document }) {
  const [title, ...lines] = documents[document].trim().split(/\r?\n/);
  return (
    <>
      <PublicHeader />
      <main className="legal-page container">
        <Link className="back-link" to="/">
          ← На главную
        </Link>
        <article className="legal-document">
          <h1>{title}</h1>
          {lines.map((line, index) => {
            if (!line.trim()) return null;
            if (/^\d+\.\s/.test(line)) return <h2 key={index}>{line}</h2>;
            return <p key={index}>{linkedText(line)}</p>;
          })}
        </article>
      </main>
    </>
  );
}
