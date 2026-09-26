import React from "react";
import { Link } from "react-router-dom";
import logo from "../assets/horizont-logo.png";
import { AUTH_STATUS, useAuth } from "../auth/AuthContext";

export default function PublicHeader() {
  const { status } = useAuth();
  const authenticated = status === AUTH_STATUS.AUTHENTICATED;
  return (
    <header className="public-header container">
      <Link className="brand" to="/" aria-label="Детки-сказки — на главную">
        <img className="brand__logo" src={logo} alt="Детки-сказки" />
      </Link>
      <Link className="header-cta" to={authenticated ? "/app" : "/auth"}>
        {authenticated ? "Личный кабинет" : "Войти"}
      </Link>
    </header>
  );
}
