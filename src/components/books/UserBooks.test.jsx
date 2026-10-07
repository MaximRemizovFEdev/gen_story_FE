import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import apiService from "../../services/ApiService";
import { UserBooks } from "./UserBooks";

vi.mock("../../services/ApiService", () => ({
  default: {
    getCoverUrl: vi.fn((id) => `/api/stories/${id}/cover`),
    getBookDownloadUrl: vi.fn((id) => `/api/books/${id}/download`),
    getStoryBook: vi.fn(),
    downloadBook: vi.fn(),
  },
}));

const book = {
  storyId: "12-34_28-08-2026",
  title: "Сказка",
  generatedAt: "2026-08-28T12:34:00",
};

describe("UserBooks", () => {
  beforeEach(() => {
    apiService.getStoryBook.mockResolvedValue({
      storyId: book.storyId,
      title: book.title,
      cover: { imageUrl: `/api/stories/${book.storyId}/cover` },
      scenes: [],
    });
    apiService.downloadBook.mockResolvedValue(new Blob(["pdf"]));
    URL.createObjectURL = vi.fn(() => "blob:book");
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
      () => undefined,
    );
  });

  it("renders canonical story-scoped resources", () => {
    render(<UserBooks books={[book]} isLoading={false} error={null} />);
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "/api/stories/12-34_28-08-2026/cover",
    );
    expect(screen.getByRole("link", { name: /скачать/i })).toHaveAttribute(
      "href",
      "/api/books/12-34_28-08-2026/download",
    );
  });

  it("reports a missing book without expiring auth", async () => {
    apiService.downloadBook.mockRejectedValue(
      Object.assign(new Error("missing"), { status: 404 }),
    );
    render(<UserBooks books={[book]} isLoading={false} error={null} />);
    fireEvent.click(screen.getByRole("link", { name: /скачать/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Запрошенная книга недоступна",
    );
  });

  it("does not turn 401 into a local file error", async () => {
    apiService.downloadBook.mockRejectedValue(
      Object.assign(new Error("expired"), { status: 401 }),
    );
    render(<UserBooks books={[book]} isLoading={false} error={null} />);
    fireEvent.click(screen.getByRole("link", { name: /скачать/i }));
    await waitFor(() => expect(apiService.downloadBook).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    ["story", "Создаем историю"],
    ["cover", "Рисуем обложку"],
    ["scenes", "Готовим иллюстрации"],
    ["book", "Собираем книгу"],
  ])("renders a non-interactive placeholder for the %s stage", (stage, label) => {
    render(
      <UserBooks
        books={[]}
        isLoading={false}
        error={null}
        activeFlow={{ storyId: "flow-1", stage, status: "pending" }}
      />,
    );
    const placeholder = screen.getByTestId("generation-placeholder");
    expect(placeholder).toHaveTextContent(label);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /читать книгу/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /редактировать/i }),
    ).not.toBeInTheDocument();
  });

  it("shows a read-only status refresh for an explicit backend error", () => {
    const onRetry = vi.fn();
    render(
      <UserBooks
        books={[]}
        isLoading={false}
        error={null}
        activeFlow={{ storyId: "flow-1", stage: "scenes", status: "error" }}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText(/ошибка на этапе: готовим иллюстрации/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /обновить статус/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("deduplicates a placeholder when the completed book is already listed", () => {
    render(
      <UserBooks
        books={[book]}
        isLoading={false}
        error={null}
        activeFlow={{ storyId: book.storyId, stage: "book", status: "success" }}
      />,
    );
    expect(screen.queryByTestId("generation-placeholder")).not.toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /читать книгу/i })).toBeEnabled();
  });

  it("opens reading through /book without downloading PDF", async () => {
    render(<UserBooks books={[book]} isLoading={false} error={null} />);

    fireEvent.click(screen.getByRole("button", { name: /читать книгу/i }));

    expect(apiService.downloadBook).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(apiService.getStoryBook).toHaveBeenCalledWith(
        book.storyId,
        expect.any(AbortSignal),
      ),
    );
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("1 / 1")).toBeInTheDocument();
  });

  it("keeps PDF download independent from reading", async () => {
    render(<UserBooks books={[book]} isLoading={false} error={null} />);
    fireEvent.click(screen.getByRole("link"));

    await waitFor(() => expect(apiService.downloadBook).toHaveBeenCalledWith(book.storyId));
    expect(apiService.getStoryBook).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("reopens with a fresh request and updated content on the cover", async () => {
    render(<UserBooks books={[book]} isLoading={false} error={null} />);
    const opener = screen.getByRole("button", { name: /читать книгу/i });
    opener.focus();
    fireEvent.click(opener);
    await screen.findByText("1 / 1");
    fireEvent.click(screen.getByRole("button", { name: /закрыть просмотр/i }));
    expect(opener).toHaveFocus();
    apiService.getStoryBook.mockResolvedValueOnce({
      storyId: book.storyId, title: "Updated", cover: { imageUrl: "/new-cover" }, scenes: [],
    });
    fireEvent.click(opener);
    expect(await screen.findByRole("heading", { name: "Updated" })).toBeInTheDocument();
    expect(apiService.getStoryBook).toHaveBeenCalledTimes(2);
    expect(screen.getByText("1 / 1")).toBeInTheDocument();
  });

  it("does not offer reading without a story id", () => {
    render(<UserBooks books={[{ ...book, storyId: undefined }]} isLoading={false} error={null} />);
    expect(screen.queryByRole("button", { name: /читать книгу/i })).not.toBeInTheDocument();
  });
});
