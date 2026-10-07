import React from "react";
import { act, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, expect, it, vi } from "vitest";
import { AuthProvider } from "./auth/AuthContext";
import SiteFooter from "./components/SiteFooter";
import LegalDocumentPage from "./screens/LegalDocumentPage";
import apiService from "./services/ApiService";

vi.mock("./services/ApiService", () => ({ default: {
  getCurrentUser: vi.fn(), setUnauthorizedHandler: vi.fn(() => vi.fn()),
} }));

beforeEach(() => vi.spyOn(window, "scrollTo").mockImplementation(() => {}));

const policy = readFileSync(join(process.cwd(), "src", "layerDocs", "policy.md"), "utf8");

it.each([401, 500])("keeps legal content visible when session bootstrap fails with %s", async status => {
  let reject;
  apiService.getCurrentUser.mockReturnValue(new Promise((_resolve, fail) => { reject = fail; }));
  render(
    <AuthProvider>
      <div className="site-layout">
        <div className="site-content"><LegalDocumentPage source={policy} /></div>
        <SiteFooter />
      </div>
    </AuthProvider>,
  );
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Политика");
  await act(async () => reject(Object.assign(new Error("session failed"), { status })));
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Политика");
  expect(screen.getAllByRole("contentinfo")).toHaveLength(1);
  expect(screen.queryByRole("button", { name: /Яндекс/ })).not.toBeInTheDocument();
  expect(apiService.getCurrentUser).toHaveBeenCalled();
});
