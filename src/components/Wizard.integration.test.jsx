import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Wizard from "./Wizard";
import { GenerationProcessProvider } from "../hooks/GenerationProcessContext";

vi.mock("../auth/AuthContext", () => ({
  AUTH_STATUS: { CHECKING: "checking", AUTHENTICATED: "authenticated" },
  useAuth: () => ({ status: "authenticated", isAuthenticated: true, sessionVersion: 0 }),
}));

const book = {
  storyId: "20-55_28-09-2026",
  title: "Готовая сказка",
  generatedAt: "2026-09-28T20:55:00",
};
const completed = {
  draftId: "old-draft",
  paymentStatus: "consumed",
  generationStatus: "success",
  storyId: book.storyId,
};
const response = (body, status = 200) => ({
  ok: status === 200 || status === 201,
  status,
  headers: { get: () => "application/json" },
  json: async () => body,
});
const next = () => fireEvent.click(screen.getByRole("button", { name: /далее/i }));
const createButton = () => screen.getByRole("button", { name: /создать мою сказку/i });
async function fillQuestionnaire() {
  fireEvent.change(screen.getByPlaceholderText("Введите имя"), { target: { value: "Миша" } });
  next();
  for (let index = 0; index < 4; index += 1) {
    fireEvent.click(screen.getAllByRole("radio")[0]);
    next();
  }
  fireEvent.click(screen.getAllByRole("checkbox")[0]);
  next();
  await waitFor(() => expect(createButton()).toBeEnabled());
}

describe("Wizard with recovered consumed operation", () => {
  let requests;
  let library;
  let libraryError;
  let current;
  beforeEach(() => {
    requests = [];
    library = [book];
    libraryError = false;
    current = completed;
    window.__GEN_STORY_NAVIGATE__ = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async (url, options = {}) => {
      const path = String(url).replace(/^.*\/api/, "/api");
      requests.push({ path, method: options.method || "GET", body: options.body });
      if (path === "/api/books") return libraryError ? response({ message: "library unavailable" }, 500) : response(library);
      if (path === "/api/payments/generation/current") return response({ operation: current });
      if (path === `/api/generation-drafts/${current.draftId}/status`) return response({ ...current });
      if (path === "/api/generation-drafts") return response({ draftId: "new-draft" }, 201);
      if (path === "/api/payments/generation/create") return response({ confirmationUrl: "https://example.com/new-checkout" }, 201);
      throw new Error(`Unexpected request: ${path}`);
    }));
  });
  afterEach(() => {
    delete window.__GEN_STORY_NAVIGATE__;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  const mount = () => render(
    <GenerationProcessProvider><Wizard booksPortalTarget={document.body} /></GenerationProcessProvider>,
  );

  it("keeps the ready card across photo-step rechecks and creates a new checkout only on click", async () => {
    mount();
    await screen.findByRole("heading", { name: book.title });
    await fillQuestionnaire();
    expect(screen.queryByTestId("generation-placeholder")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /читать книгу/i })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /назад/i }));
    next();
    await waitFor(() => expect(createButton()).toBeEnabled());
    expect(screen.getAllByRole("heading", { name: book.title })).toHaveLength(1);
    expect(screen.queryByTestId("generation-placeholder")).not.toBeInTheDocument();
    expect(requests.filter(r => r.path.endsWith("/current"))).toHaveLength(3);
    expect(requests.filter(r => r.method === "POST")).toHaveLength(0);
    fireEvent.click(createButton());
    await waitFor(() => expect(window.__GEN_STORY_NAVIGATE__).toHaveBeenCalledWith("https://example.com/new-checkout"));
    expect(requests.filter(r => r.method === "POST").map(r => r.path)).toEqual([
      "/api/generation-drafts", "/api/payments/generation/create",
    ]);
    expect(JSON.parse(requests.find(r => r.path.endsWith("/create")).body)).toEqual({ draftId: "new-draft" });
  });

  it.each([false, true])("retries library reads after lag/error (%s) without blocking checkout", async (failed) => {
    library = [];
    libraryError = failed;
    mount();
    await screen.findByTestId("generation-placeholder");
    await fillQuestionnaire();
    const readCount = requests.filter(r => r.path === "/api/books").length;
    await act(async () => { await Promise.resolve(); });
    expect(requests.filter(r => r.path === "/api/books")).toHaveLength(readCount);
    library = [book];
    libraryError = false;
    fireEvent.click(screen.getByRole("button", { name: /обновить библиотеку/i }));
    await screen.findByRole("heading", { name: book.title });
    expect(screen.queryByTestId("generation-placeholder")).not.toBeInTheDocument();
    expect(createButton()).toBeEnabled();
    expect(requests.filter(r => r.method === "POST")).toHaveLength(0);
  });

  it.each([
    ["consumed", "error", true], ["generation_failed", "error", true],
    ["canceled", "error", true], ["failed", "error", true],
    ["reserved", "error", false], ["paid", "error", false],
    ["pending", "error", false], ["not_created", "error", false], ["unknown", "error", false],
  ])("checks %s/%s consistently on the final step", async (paymentStatus, generationStatus, allowed) => {
    current = { ...completed, paymentStatus, generationStatus };
    mount();
    fireEvent.change(screen.getByPlaceholderText("Введите имя"), { target: { value: "Миша" } });
    next();
    for (let i = 0; i < 4; i += 1) { fireEvent.click(screen.getAllByRole("radio")[0]); next(); }
    fireEvent.click(screen.getAllByRole("checkbox")[0]);
    next();
    await waitFor(() => expect(screen.queryByText(/проверяем возможность создания/i)).not.toBeInTheDocument());
    if (allowed) expect(createButton()).toBeEnabled();
    else expect(createButton()).toBeDisabled();
    expect(requests.filter(r => r.method === "POST")).toHaveLength(0);
  });
  it("allows a new pending checkout, stops its old polling, and recovers pending again on reload", async () => {
    current = { ...completed, paymentStatus: "pending", generationStatus: "not_started", storyId: null };
    const first = mount();
    await fillQuestionnaire();
    expect(requests.filter(r => r.method === "POST")).toHaveLength(0);
    expect(createButton()).toBeEnabled();
    first.unmount();
    const restored = mount();
    await fillQuestionnaire();
    fireEvent.click(createButton());
    await waitFor(() => expect(window.__GEN_STORY_NAVIGATE__).toHaveBeenCalled());
    expect(JSON.parse(requests.find(r => r.path.endsWith("/create")).body)).toEqual({ draftId: "new-draft" });
    const count = requests.filter(r => r.path.includes("/old-draft/status")).length;
    vi.useFakeTimers();
    await act(async () => { await vi.advanceTimersByTimeAsync(9000); });
    expect(requests.filter(r => r.path.includes("/old-draft/status"))).toHaveLength(count);
    expect(requests.filter(r => r.method === "POST")).toHaveLength(2);
    restored.unmount();
  });

});
