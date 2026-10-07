import React from "react";
import { act, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "./auth/AuthContext";
import SiteFooter from "./components/SiteFooter";
import { useGenerationProcessContext } from "./hooks/GenerationProcessContext";
import AuthErrorPage from "./screens/AuthErrorPage";
import AuthSuccessPage from "./screens/AuthSuccessPage";
import LandingPage from "./screens/LandingPage";
import LegalDocumentPage from "./screens/LegalDocumentPage";
import LoginRoute from "./screens/LoginRoute";
import NotFoundPage from "./screens/NotFoundPage";
import PaymentReturnPage from "./screens/PaymentReturnPage";
import ProtectedAppPage from "./screens/ProtectedAppPage";

vi.mock("./auth/AuthContext", () => ({
  AUTH_STATUS: { CHECKING: "checking", AUTHENTICATED: "authenticated", ANONYMOUS: "anonymous" },
  useAuth: vi.fn(),
}));
vi.mock("./hooks/GenerationProcessContext", () => ({ useGenerationProcessContext: vi.fn() }));
vi.mock("./screens/HomePage", () => ({ default: () => <p>protected application</p> }));

const documents = Object.fromEntries(
  ["privacy", "policy", "oferta"].map(name => [
    name,
    readFileSync(join(process.cwd(), "src", "layerDocs", `${name}.md`), "utf8"),
  ]),
);

function Shell({ children }) {
  return <div className="site-layout"><div className="site-content">{children}</div><SiteFooter /></div>;
}

function open(content) {
  return render(<Shell>{content}</Shell>);
}

function checkFooter() {
  expect(screen.getAllByRole("contentinfo")).toHaveLength(1);
  const footer = within(screen.getByRole("contentinfo"));
  expect(footer.getByText(/623009423005/)).toBeInTheDocument();
  expect(footer.getByText("Ремизов Максим Сергеевич")).toBeInTheDocument();
  expect(footer.getByRole("link", { name: "webreznow@vk.com" })).toHaveAttribute("href", "mailto:webreznow@vk.com");
  expect(footer.getAllByRole("link").map(link => link.getAttribute("href"))).toEqual(expect.arrayContaining(["/privacy", "/policy", "/oferta"]));
}

beforeEach(() => {
  useAuth.mockReturnValue({ status: "anonymous" });
  useGenerationProcessContext.mockReturnValue({
    activeOperation: null,
    activeFlow: null,
    operationUiState: "idle",
    statusError: "",
    isRecovering: false,
    recoverOperation: vi.fn(),
    refreshStatus: vi.fn(),
  });
});

describe("public and protected App Router screens", () => {
  it.each(["checking", "anonymous", "authenticated"])("keeps the storefront public for %s", status => {
    useAuth.mockReturnValue({ status });
    open(<LandingPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Сказка");
    expect(screen.getByText(/199 ₽/, { selector: ".landing-price" })).toBeInTheDocument();
    expect(screen.getByText(/Заполните 7 вопросов/)).toBeInTheDocument();
    expect(screen.queryByText("protected application")).not.toBeInTheDocument();
    checkFooter();
  });

  it.each(Object.entries(documents))("renders the full %s document while session is pending", (_name, source) => {
    useAuth.mockReturnValue({ status: "checking" });
    open(<LegalDocumentPage source={source} />);
    const article = screen.getByRole("article");
    for (const line of source.split(/\r?\n/).filter(line => line.trim())) expect(article).toHaveTextContent(line);
    checkFooter();
  });

  it("links the policy to its correct route", () => {
    open(<LegalDocumentPage source={documents.policy} />);
    expect(within(screen.getByRole("article")).getByRole("link", { name: "https://aidaskazka.ru/policy" })).toHaveAttribute("href", "/policy");
  });

  it("links guests from the offer to login without exposing protected content", () => {
    open(<LandingPage />);
    expect(screen.getAllByRole("link", { name: "Войти и создать сказку" })[0]).toHaveAttribute("href", "/auth");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it.each(["anonymous", "authenticated"])("shows 404 for an unknown route as %s", status => {
    useAuth.mockReturnValue({ status });
    open(<NotFoundPage />);
    expect(screen.getByRole("heading", { name: "Страница не найдена" })).toBeInTheDocument();
    checkFooter();
  });

  it("protects the application while checking and sends guests to login", () => {
    const replace = vi.fn();
    globalThis.__NEXT_ROUTER_MOCK__ = { replace };
    useAuth.mockReturnValue({ status: "checking" });
    const view = open(<ProtectedAppPage />);
    expect(screen.getByText(/Проверяем сессию/)).toBeInTheDocument();
    useAuth.mockReturnValue({ status: "anonymous" });
    view.rerender(<Shell><ProtectedAppPage /></Shell>);
    expect(replace).toHaveBeenCalledWith("/auth");
    expect(screen.queryByText("protected application")).not.toBeInTheDocument();
  });

  it("redirects authenticated login to the application", () => {
    const replace = vi.fn();
    globalThis.__NEXT_ROUTER_MOCK__ = { replace };
    useAuth.mockReturnValue({ status: "authenticated" });
    open(<LoginRoute />);
    expect(replace).toHaveBeenCalledWith("/app");
  });

  it("keeps the footer during callback verification and missing session", async () => {
    let resolve;
    const replace = vi.fn();
    globalThis.__NEXT_ROUTER_MOCK__ = { replace };
    useAuth.mockReturnValue({ status: "checking", refreshSession: () => new Promise(done => { resolve = done; }) });
    open(<AuthSuccessPage />);
    checkFooter();
    await act(async () => resolve(null));
    expect(replace).toHaveBeenCalledWith("/auth");
    checkFooter();
  });

  it("shows footer on authentication errors", () => { open(<AuthErrorPage />); checkFooter(); });

  it("shows a read-only payment return page without opening the protected app", () => {
    open(<PaymentReturnPage />);
    expect(screen.getByRole("heading", { name: "Ищем операцию" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Обновить статус" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "В библиотеку" })).toHaveAttribute("href", "/app");
    expect(screen.queryByText("protected application")).not.toBeInTheDocument();
    checkFooter();
  });

  it.each(["draftId", "draft_id", "operationId", "operation_id"])("recovers payment return from %s", async parameter => {
    const recoverOperation = vi.fn().mockResolvedValue(undefined);
    useAuth.mockReturnValue({ status: "authenticated" });
    useGenerationProcessContext.mockReturnValue({
      activeOperation: null,
      activeFlow: null,
      operationUiState: "idle",
      statusError: "",
      isRecovering: false,
      recoverOperation,
      refreshStatus: vi.fn(),
    });
    window.history.replaceState({}, "", `/payment-return?${parameter}=draft-42`);
    open(<PaymentReturnPage />);
    expect(recoverOperation).toHaveBeenCalledWith("draft-42", expect.objectContaining({ explicit: true }));
  });
});
