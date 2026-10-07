import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiService } from "./ApiService";

const jsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => "application/json" },
  json: vi.fn().mockResolvedValue(body),
  text: vi.fn().mockResolvedValue(""),
});

describe("ApiService", () => {
  let service;
  beforeEach(() => {
    service = new ApiService();
    service.baseUrl = "/api";
    vi.stubGlobal("fetch", vi.fn());
  });

  it("includes credentials and reports protected 401 responses", async () => {
    const handler = vi.fn();
    service.setUnauthorizedHandler(handler);
    fetch.mockResolvedValue(jsonResponse({ error: "AUTH_REQUIRED" }, 401));
    await expect(service.getUserBooks()).rejects.toMatchObject({
      status: 401,
      endpoint: "/books",
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/books",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("suppresses global 401 handling for bootstrap and logout", async () => {
    const handler = vi.fn();
    service.setUnauthorizedHandler(handler);
    fetch.mockResolvedValue(jsonResponse({ error: "AUTH_REQUIRED" }, 401));
    await expect(service.getCurrentUser()).rejects.toMatchObject({ status: 401 });
    await expect(service.logout()).rejects.toMatchObject({ status: 401 });
    expect(handler).not.toHaveBeenCalled();
  });

  it("creates JSON generation drafts with session credentials and no ownership fields", async () => {
    const questionnaire = { childName: "Миша", interests: ["Космос"] };
    fetch.mockResolvedValue(jsonResponse({ draftId: "draft-1" }, 201));

    await expect(service.createGenerationDraft(questionnaire, null)).resolves.toEqual({
      draftId: "draft-1",
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/generation-drafts",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify(questionnaire),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }),
    );
    expect(fetch.mock.calls[0][1].body).not.toContain("phone");
  });

  it("creates multipart generation drafts with the original photo", async () => {
    fetch.mockResolvedValue(jsonResponse({ draftId: "draft-photo" }, 201));
    const photo = new File(["image"], "child.png", { type: "image/png" });
    await service.createGenerationDraft({ childName: "Миша" }, photo);
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("/api/generation-drafts");
    expect(options.body).toBeInstanceOf(FormData);
    expect(JSON.parse(options.body.get("formData"))).toEqual({
      childName: "Миша",
    });
    expect(options.body.get("childPhoto")).toBe(photo);
    expect(options.headers).toEqual({ Accept: "application/json" });
    expect(options.credentials).toBe("include");
  });

  it("rejects draft responses without a usable draftId", async () => {
    fetch.mockResolvedValue(jsonResponse({ draftId: "" }, 201));
    await expect(service.createGenerationDraft({ childName: "Миша" })).rejects.toThrow(
      /draftId/,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("creates draft-linked payments and validates confirmation URLs", async () => {
    const payment = {
      purchaseId: "purchase_id",
      providerPaymentId: "yookassa_payment_id",
      confirmationUrl: "https://yoomoney.ru/checkout/payments/123",
    };
    fetch.mockResolvedValue(jsonResponse(payment, 201));

    await expect(service.createGenerationPayment("draft-1")).resolves.toEqual(payment);
    expect(fetch).toHaveBeenCalledWith(
      "/api/payments/generation/create",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ draftId: "draft-1" }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }),
    );
  });

  it("does not call payment creation without draftId or with invalid checkout URL", async () => {
    await expect(service.createGenerationPayment("")).rejects.toThrow(/draftId/);
    expect(fetch).not.toHaveBeenCalled();

    fetch.mockResolvedValue(jsonResponse({ confirmationUrl: "javascript:bad" }, 201));
    await expect(service.createGenerationPayment("draft-1")).rejects.toThrow(
      /ссылку на оплату/,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("reads explicit and current operations with abort signals and normalized absence", async () => {
    const controller = new AbortController();
    fetch
      .mockResolvedValueOnce(
        jsonResponse({
          draftId: "draft/1",
          paymentStatus: "reserved",
          generationStatus: "running",
          storyId: "12-34_25-09-2026",
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ operation: null }));

    await expect(
      service.getGenerationOperationStatus("draft/1", controller.signal),
    ).resolves.toEqual({
      draftId: "draft/1",
      paymentStatus: "reserved",
      generationStatus: "running",
      storyId: "12-34_25-09-2026",
      error: null,
    });
    await expect(
      service.getCurrentGenerationOperation(controller.signal),
    ).resolves.toBeNull();

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "/api/generation-drafts/draft%2F1/status",
      expect.objectContaining({
        credentials: "include",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/payments/generation/current",
      expect.objectContaining({
        credentials: "include",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      }),
    );
  });

  it("rejects unknown or malformed operation payloads", async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ operation: { draftId: "draft-1" } }));
    await expect(service.getCurrentGenerationOperation()).rejects.toThrow(
      /статус операции/,
    );
    fetch.mockResolvedValueOnce(jsonResponse({}));
    await expect(service.getCurrentGenerationOperation()).rejects.toThrow(
      /ответ восстановления/,
    );
  });

  it("normalizes representative operation states from the backend contract", () => {
    const cases = [
      ["pending", "not_started"],
      ["paid", "not_started"],
      ["reserved", "queued"],
      ["reserved", "running"],
      ["consumed", "success"],
      ["generation_failed", "error"],
    ];
    for (const [paymentStatus, generationStatus] of cases) {
      expect(
        service.normalizeGenerationOperation({
          draftId: `${paymentStatus}-${generationStatus}`,
          paymentStatus,
          generationStatus,
          storyId: generationStatus === "not_started" ? undefined : "12-34_25-09-2026",
        }),
      ).toMatchObject({
        draftId: `${paymentStatus}-${generationStatus}`,
        paymentStatus,
        generationStatus,
      });
    }
    expect(service.normalizeGenerationOperation(null)).toBeNull();
  });

  it("keeps book regeneration for scene editing and canonical resource URLs", async () => {
    fetch.mockResolvedValue(jsonResponse({ success: true }));
    await service.regenerateBook("12-34_28-08-2026");
    expect(fetch).toHaveBeenCalledWith(
      "/api/generate-book",
      expect.objectContaining({
        body: JSON.stringify({ storyId: "12-34_28-08-2026" }),
        credentials: "include",
      }),
    );
    expect(service.getBookDownloadUrl("12-34_28-08-2026")).toBe(
      "/api/books/12-34_28-08-2026/download",
    );
  });

  it("uses authenticated library and scene paths", async () => {
    fetch.mockResolvedValue(jsonResponse([]));
    await service.getUserBooks();
    await service.getStoryScenes("12-34_28-08-2026");
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "/api/books",
      "/api/stories/12-34_28-08-2026/scenes",
    ]);
  });

  it("loads story books through the JSON viewer contract", async () => {
    const controller = new AbortController();
    fetch.mockResolvedValue(
      jsonResponse({
        storyId: "story/with space",
        title: "Viewer book",
        cover: { imageUrl: "/api/stories/story%2Fwith%20space/cover" },
        scenes: [
          {
            sceneId: 10,
            imageUrl: "/api/stories/story/scenes/10/image",
            text: "Scene ten",
          },
          {
            sceneId: "2",
            imageUrl: "/api/stories/story/scenes/2/image",
            text: "Scene two",
          },
        ],
      }),
    );

    await expect(
      service.getStoryBook("story/with space", controller.signal),
    ).resolves.toEqual({
      storyId: "story/with space",
      title: "Viewer book",
      cover: { imageUrl: "/api/stories/story%2Fwith%20space/cover" },
      scenes: [
        {
          sceneId: "10",
          imageUrl: "/api/stories/story/scenes/10/image",
          text: "Scene ten",
        },
        {
          sceneId: "2",
          imageUrl: "/api/stories/story/scenes/2/image",
          text: "Scene two",
        },
      ],
    });
    expect(fetch).toHaveBeenCalledWith(
      "/api/stories/story%2Fwith%20space/book",
      expect.objectContaining({
        credentials: "include",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }),
    );
  });

  it("accepts an empty story book scene list and rejects malformed books", async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        storyId: "story-1",
        title: "Cover only",
        cover: { imageUrl: "/api/stories/story-1/cover" },
        scenes: [],
      }),
    );
    await expect(service.getStoryBook("story-1")).resolves.toMatchObject({
      scenes: [],
    });

    fetch.mockResolvedValueOnce(jsonResponse({ storyId: "story-1" }));
    await expect(service.getStoryBook("story-1")).rejects.toThrow(
      /некорректную книгу/i,
    );

    fetch.mockResolvedValueOnce(
      jsonResponse({
        storyId: "story-1",
        title: "Bad scene",
        cover: { imageUrl: "/api/stories/story-1/cover" },
        scenes: [{ sceneId: 1, imageUrl: "/api/image" }],
      }),
    );
    await expect(service.getStoryBook("story-1")).rejects.toThrow(
      /некорректную сцену/i,
    );
  });

  it("keeps book request failures and global auth handling consistent", async () => {
    const handler = vi.fn();
    service.setUnauthorizedHandler(handler);
    fetch.mockResolvedValueOnce(jsonResponse({ error: "missing" }, 404));
    await expect(service.getStoryBook("story-1")).rejects.toMatchObject({
      status: 404,
      endpoint: "/stories/story-1/book",
    });
    expect(handler).not.toHaveBeenCalled();

    fetch.mockRejectedValueOnce(Object.assign(new Error("offline"), { name: "TypeError" }));
    await expect(service.getStoryBook("story-1")).rejects.toMatchObject({
      endpoint: "/stories/story-1/book",
    });

    fetch.mockRejectedValueOnce(Object.assign(new Error("cancelled"), { name: "AbortError" }));
    await expect(service.getStoryBook("story-1")).rejects.toMatchObject({
      name: "AbortError",
    });

    fetch.mockResolvedValueOnce(jsonResponse({ error: "AUTH_REQUIRED" }, 401));
    await expect(service.getStoryBook("story-1")).rejects.toMatchObject({
      status: 401,
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
