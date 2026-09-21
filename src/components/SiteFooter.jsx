import React from "react";
import { Link } from "react-router-dom";
import { legalLinks, service } from "../config/service";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container site-footer__grid">
        <div>
          <Link className="site-footer__brand" to="/">
            {service.name}
          </Link>
          <p>Истории, в которых живёт детство.</p>
        </div>
        <nav aria-label="Юридические документы">
          {legalLinks.map(({ path, label }) => (
            <Link key={path} to={path}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="site-footer__contacts">
          <p>{service.fullName}</p>
          <p>
            {service.status} · ИНН {service.inn}
          </p>
          <a href={`mailto:${service.email}`}>{service.email}</a>
          <a href={`tel:${service.phoneHref}`}>{service.phone}</a>
        </div>
      </div>
    </footer>
  );
}
