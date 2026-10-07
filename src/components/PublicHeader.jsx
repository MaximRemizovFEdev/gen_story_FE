"use client";

import React from "react";
import Link from "next/link";
import logo from "../assets/horizont-logo.png";
import { AUTH_STATUS, useAuth } from "../auth/AuthContext";

export default function PublicHeader() {
  const { status } = useAuth();
  const authenticated = status === AUTH_STATUS.AUTHENTICATED;
  return (
    <header className="public-header container">
      <Link className="brand" href="/" aria-label="Детки-сказки — на главную">
        <img className="brand__logo" src={logo.src} alt="Детки-сказки" />
      </Link>
      <Link className="header-cta" href={authenticated ? "/app" : "/auth"}>
        {authenticated ? "Личный кабинет" : "Войти"}
      </Link>
    </header>
  );
}
