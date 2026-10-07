import React, { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import Providers from "../components/Providers";
import SiteFooter from "../components/SiteFooter";
import LandingPage from "../screens/LandingPage";

vi.mock("../services/ApiService", () => ({
  default: {
    getCurrentUser: vi.fn(() => new Promise(() => {})),
    setUnauthorizedHandler: vi.fn(() => vi.fn()),
  },
}));

let hydratedRoot;

afterEach(() => {
  if (hydratedRoot) {
    act(() => hydratedRoot.unmount());
    hydratedRoot = undefined;
  }
});

it("hydrates the statically rendered storefront without a mismatch", async () => {
  const tree = (
    <Providers>
      <div id="root" className="site-layout">
        <div className="site-content"><LandingPage /></div>
        <SiteFooter />
      </div>
    </Providers>
  );
  const container = document.createElement("div");
  container.innerHTML = renderToString(tree);
  document.body.append(container);
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

  await act(async () => {
    hydratedRoot = hydrateRoot(container, tree);
  });

  expect(container.querySelector("#landing-title")).toHaveTextContent("Сказка");
  expect(container.querySelectorAll("footer")).toHaveLength(1);
  expect(consoleError.mock.calls.flat().join(" ")).not.toMatch(/hydration|did not match/i);
  container.remove();
});
