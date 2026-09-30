import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { AuthProvider } from "../../auth/AuthContext";
import { RootRoute } from "../../App";
import { UserBooks } from "./UserBooks";

vi.mock("../../pages/HomePage", () => ({
  default: () => <UserBooks books={[{
    storyId: "session-book", title: "Session book", generatedAt: "2026-09-30",
  }]} />,
}));

afterEach(() => vi.unstubAllGlobals());

it("removes the viewer and restores the document when /book expires the session", async () => {
  let expire;
  const response = (body, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json" },
  });
  const fetchMock = vi.fn((url) => {
    if (url === "/api/auth/me") return Promise.resolve(response({ authenticated: true }));
    if (url === "/api/stories/session-book/book") {
      return new Promise((resolve) => { expire = () => resolve(response({ error: "Expired" }, 401)); });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  const root = document.createElement("div");
  root.id = "root";
  document.body.append(root);
  const view = render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/app"]}>
        <Routes>
          <Route path="/app" element={<RootRoute />} />
          <Route path="/auth" element={<p>Session ended</p>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
    { container: root },
  );
  try {
    fireEvent.click(await screen.findByRole("button", { name: /читать книгу/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(root).toHaveAttribute("inert");
    expect(document.body.style.overflow).toBe("hidden");
    await waitFor(() => expect(expire).toBeTypeOf("function"));
    expire();
    expect(await screen.findByText("Session ended")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(root).not.toHaveAttribute("inert");
    expect(root).not.toHaveAttribute("aria-hidden");
    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
    const bookRequest = fetchMock.mock.calls.find(([url]) => url.endsWith("/book"));
    expect(bookRequest[1]).toMatchObject({ credentials: "include" });
    expect(bookRequest[1].signal.aborted).toBe(true);
    expect(fetchMock.mock.calls.some(([url]) => url.endsWith("/download"))).toBe(false);
  } finally {
    view.unmount();
    root.remove();
  }
});
