import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import apiService from "../../services/ApiService";
import { UserBooks } from "./UserBooks";

vi.mock("../../services/ApiService", () => ({
  default: {
    getCoverUrl: vi.fn((id) => `/api/stories/${id}/cover`),
    getBookDownloadUrl: vi.fn((id) => `/api/books/${id}/download`),
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
    expect(screen.getByTestId("generation-placeholder")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
