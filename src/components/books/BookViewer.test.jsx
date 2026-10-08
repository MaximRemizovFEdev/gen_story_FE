import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import apiService from "../../services/ApiService";
import { BookViewer } from "./BookViewer";

vi.mock("../../services/ApiService", () => ({
  default: {
    getStoryBook: vi.fn(),
    downloadBook: vi.fn(),
  },
}));

const book = {
  storyId: "story-1",
  title: "Read me",
  cover: { imageUrl: "/api/stories/story-1/cover" },
  scenes: [
    {
      sceneId: "10",
      imageUrl: "/api/stories/story-1/scenes/10/image",
      text: "First scene text",
    },
    {
      sceneId: "2",
      imageUrl: "/api/stories/story-1/scenes/2/image",
      text: "<script>alert(1)</script>",
    },
  ],
};

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
};

describe("BookViewer", () => {
  beforeEach(() => {
    apiService.getStoryBook.mockResolvedValue(book);
    apiService.downloadBook.mockResolvedValue(new Blob(["pdf"]));
  });

  it("loads a fresh book request and starts on the cover", async () => {
    render(<BookViewer storyId="story-1" title="Fallback" onClose={vi.fn()} />);

    expect(screen.getByText(/загружаем книгу/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(apiService.getStoryBook).toHaveBeenCalledWith(
        "story-1",
        expect.any(AbortSignal),
      ),
    );
    expect(await screen.findByRole("dialog", { name: "Read me" })).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector(".book-viewer__text-panel")).toHaveTextContent("Read me"));
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /обложка/i })).toHaveAttribute(
      "src",
      "/api/stories/story-1/cover",
    );
    expect(screen.getByRole("button", { name: /назад/i })).toBeDisabled();
  });

  it("keeps scene order from the response and navigates without cycling", async () => {
    render(<BookViewer storyId="story-1" title="Fallback" onClose={vi.fn()} />);
    await screen.findByText("1 / 3");

    fireEvent.click(screen.getByRole("button", { name: /вперёд/i }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(await screen.findByText("First scene text")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    expect(await screen.findByText("<script>alert(1)</script>")).toBeInTheDocument();
    expect(screen.queryByRole("script")).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /вперёд/i })).toBeDisabled();

    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("shows image failures without hiding scene text or navigation", async () => {
    render(<BookViewer storyId="story-1" title="Fallback" onClose={vi.fn()} />);
    await screen.findByText("1 / 3");
    fireEvent.click(screen.getByRole("button", { name: /вперёд/i }));
    await screen.findByText("First scene text");

    fireEvent.error(document.querySelector(".book-viewer__page-image"));

    expect(screen.getByText(/изображение страницы недоступно/i)).toBeInTheDocument();
    expect(
      screen.getAllByText("First scene text").some((node) =>
        node.closest(".book-viewer__text-panel"),
      ),
    ).toBe(true);
    expect(screen.getByRole("button", { name: /вперёд/i })).toBeEnabled();
  });

  it("supports retry after a local book loading error", async () => {
    apiService.getStoryBook
      .mockRejectedValueOnce(Object.assign(new Error("network down"), { status: 404 }))
      .mockResolvedValueOnce(book);

    render(<BookViewer storyId="story-1" title="Fallback" onClose={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/недоступна/i);
    fireEvent.click(screen.getByRole("button", { name: /повторить/i }));

    expect(await screen.findByText("1 / 3")).toBeInTheDocument();
    expect(apiService.getStoryBook).toHaveBeenCalledTimes(2);
  });

  it("closes with Escape and ignores late responses after unmount", async () => {
    const request = deferred();
    const onClose = vi.fn();
    apiService.getStoryBook.mockReturnValue(request.promise);

    const view = render(
      <BookViewer storyId="story-1" title="Fallback" onClose={onClose} />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    view.unmount();
    request.resolve(book);
    await Promise.resolve();
    expect(screen.queryByText("Read me")).not.toBeInTheDocument();
  });

  it("resets to the cover when switching books", async () => {
    const secondBook = {
      ...book,
      storyId: "story-2",
      title: "Second",
      cover: { imageUrl: "/api/stories/story-2/cover" },
      scenes: [],
    };
    apiService.getStoryBook
      .mockResolvedValueOnce(book)
      .mockResolvedValueOnce(secondBook);
    const view = render(
      <BookViewer storyId="story-1" title="First" onClose={vi.fn()} />,
    );
    await screen.findByText("1 / 3");
    fireEvent.click(screen.getByRole("button", { name: /вперёд/i }));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();

    view.rerender(<BookViewer storyId="story-2" title="Second" onClose={vi.fn()} />);

    expect(await screen.findByText("1 / 1")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Second" })).toBeInTheDocument();
  });

  it("does not skip the cover after arrows are pressed while loading", async () => {
    const request = deferred();
    apiService.getStoryBook.mockReturnValueOnce(request.promise);
    render(<BookViewer storyId="story-1" onClose={vi.fn()} />);
    fireEvent.keyDown(document, { key: "ArrowRight" });
    await act(async () => request.resolve(book));
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("ignores a stale response after switching books", async () => {
    const oldRequest = deferred();
    apiService.getStoryBook.mockReturnValueOnce(oldRequest.promise);
    const view = render(<BookViewer storyId="old" onClose={vi.fn()} />);
    const signal = apiService.getStoryBook.mock.calls[0][1];
    view.rerender(<BookViewer storyId="story-1" onClose={vi.fn()} />);
    await screen.findByText("Read me");
    await act(async () => oldRequest.resolve({ ...book, title: "Stale" }));
    expect(signal.aborted).toBe(true);
    expect(screen.queryByText("Stale")).not.toBeInTheDocument();
  });

  it.each(["loading", "error", "ready"])("contains keyboard focus and restores the background after closing from %s", async (status) => {
    const user = userEvent.setup();
    const root = document.createElement("div");
    root.id = "root";
    root.setAttribute("aria-hidden", "false");
    document.body.append(root);
    const opener = document.createElement("button");
    opener.textContent = "Open";
    root.append(opener);
    opener.focus();
    document.body.style.overflow = "auto";
    const pending = deferred();
    if (status === "loading") apiService.getStoryBook.mockReturnValueOnce(pending.promise);
    if (status === "error") apiService.getStoryBook.mockRejectedValueOnce(new Error("Offline"));
    const onClose = vi.fn();
    const view = render(<BookViewer storyId="story-1" onClose={onClose} />);
    try {
      if (status === "error") await screen.findByRole("alert");
      if (status === "ready") await screen.findByText("1 / 3");
      const close = screen.getByRole("button", { name: /закрыть просмотр/i });
      const last = status === "ready" ? screen.getByRole("button", { name: /вперёд/i })
        : status === "error" ? screen.getByRole("button", { name: /повторить/i }) : close;
      expect(close).toHaveFocus();
      expect(root).toHaveAttribute("inert");
      expect(root).toHaveAttribute("aria-hidden", "true");
      expect(document.body.style.overflow).toBe("hidden");
      await user.tab({ shift: true });
      expect(last).toHaveFocus();
      await user.tab();
      expect(close).toHaveFocus();
      opener.focus();
      expect(close).toHaveFocus();
      await user.keyboard("{Escape}");
      await user.click(close);
      expect(onClose).toHaveBeenCalledTimes(2);
      view.unmount();
      expect(root).not.toHaveAttribute("inert");
      expect(root).toHaveAttribute("aria-hidden", "false");
      expect(document.body.style.overflow).toBe("auto");
      expect(document.documentElement.style.overflow).toBe("");
      expect(opener).toHaveFocus();
      expect(apiService.getStoryBook.mock.calls[0][1].aborted).toBe(true);
    } finally {
      view.unmount();
      root.remove();
      document.body.style.overflow = "";
    }
  });

  it("preserves a background that was already inert", () => {
    const root = document.createElement("div");
    root.id = "root";
    root.setAttribute("inert", "");
    root.setAttribute("aria-hidden", "true");
    document.body.append(root);
    apiService.getStoryBook.mockReturnValueOnce(new Promise(() => {}));
    const view = render(<BookViewer storyId="story-1" onClose={vi.fn()} />);
    view.unmount();
    expect(root).toHaveAttribute("inert");
    expect(root).toHaveAttribute("aria-hidden", "true");
    root.remove();
  });

  it("only navigates deliberate single-pointer horizontal gestures", async () => {
    render(<BookViewer storyId="story-1" onClose={vi.fn()} />);
    await screen.findByText("1 / 3");
    const stage = document.querySelector(".book-viewer__stage");
    const pointer = (type, x, y, extra = {}) => {
      const event = new Event(type, { bubbles: true });
      Object.assign(event, { pointerType: "touch", pointerId: 1, isPrimary: true, clientX: x, clientY: y, ...extra });
      fireEvent(stage, event);
    };
    pointer("pointerdown", 200, 100);
    pointer("pointerup", 100, 100);
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    pointer("pointerdown", 200, 100);
    pointer("pointercancel", 200, 100);
    pointer("pointerup", 100, 100);
    pointer("pointerdown", 200, 100);
    pointer("pointerdown", 180, 100, { pointerId: 2, isPrimary: false });
    pointer("pointerup", 100, 100);
    pointer("pointerdown", 200, 100);
    pointer("pointerup", 180, 200);
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    vi.spyOn(window, "getSelection").mockReturnValue({ toString: () => "Selected text" });
    pointer("pointerdown", 200, 100);
    pointer("pointerup", 100, 100);
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("seeks with an accessible range without a second keyboard transition", async () => {
    render(<BookViewer storyId="story-1" onClose={vi.fn()} />);
    await screen.findByText("1 / 3");
    const range = screen.getByRole("slider", { name: /выбрать страницу/i });
    expect(range).toHaveAttribute("aria-valuetext", "Страница 1 из 3");
    fireEvent.change(range, { target: { value: "2" } });
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    fireEvent.keyDown(range, { key: "ArrowRight" });
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });

  it("collapses scene text and resets it after leaving and returning", async () => {
    render(<BookViewer storyId="story-1" onClose={vi.fn()} />);
    await screen.findByText("1 / 3");
    expect(screen.queryByRole("button", { name: /свернуть текст/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /вперёд/i }));
    const collapse = await screen.findByRole("button", { name: /свернуть текст/i });
    fireEvent.click(collapse);
    expect(screen.queryByText("First scene text")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /вперёд/i }));
    fireEvent.click(screen.getByRole("button", { name: /назад/i }));
    expect(await screen.findByText("First scene text")).toBeInTheDocument();
  });

  it("downloads PDF explicitly without changing the current page", async () => {
    render(<BookViewer storyId="story-1" onClose={vi.fn()} />);
    await screen.findByText("1 / 3");
    expect(apiService.downloadBook).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /вперёд/i }));
    fireEvent.click(screen.getByRole("button", { name: /скачать pdf/i }));
    await waitFor(() => expect(apiService.downloadBook).toHaveBeenCalledWith("story-1"));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
  });
});
