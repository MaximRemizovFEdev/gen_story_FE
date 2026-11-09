import type {
  AuthMeResponse, BookListItem, DevLoginResponse, GenerateBookResponse,
  GenerationDraftCreation, GenerationFlowState, GenerationOperationStatus,
  NormalizedBookViewer, NormalizedOperation, PaymentCreation, StoryQuestionnaire,
  StoryScenesResponse, UpdateStoryScenesResponse,
  GenerationPaymentStatusResponse, GenerationStartResponse,
} from "../types/ApiService";

type RequestConfig = { suppressUnauthorized?: boolean; responseType?: "blob" };
type ApiError = Error & { status?: number; endpoint?: string; cause?: unknown };

class ApiService {
  baseUrl: string;
  unauthorizedHandler: ((error: ApiError) => void) | null;
  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
    this.unauthorizedHandler = null;
  }

  setUnauthorizedHandler(handler: ((error: ApiError) => void) | null) {
    this.unauthorizedHandler = typeof handler === "function" ? handler : null;
    return () => {
      if (this.unauthorizedHandler === handler) this.unauthorizedHandler = null;
    };
  }

  async request(
    path: string,
    options: RequestInit = {},
    fallbackMessage = "Ошибка запроса",
    config: RequestConfig = {},
  ): Promise<any> {
    let response;
    const requestOptions: RequestInit = { ...options, credentials: "include" };
    try {
      response = await fetch(`${this.baseUrl}${path}`, requestOptions);
    } catch (error) {
      if (error.name === "AbortError") throw error;
      const networkError = new Error(
        `${fallbackMessage}. Не удалось связаться с сервером`,
      );
      (networkError as ApiError).endpoint = path;
      (networkError as ApiError).cause = error;
      throw networkError;
    }

    if (!response.ok) {
      let serverMessage = "";
      try {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const body = await response.json();
          serverMessage = body?.message || body?.error || "";
        } else {
          const body = await response.text();
          if (body && !/<[a-z][\s\S]*>/i.test(body))
            serverMessage = body.slice(0, 300);
        }
      } catch {
        // Use the endpoint-specific fallback when the response is unreadable.
      }

      const requestError = new Error(serverMessage || fallbackMessage) as ApiError;
      requestError.status = response.status;
      requestError.endpoint = path;
      if (response.status === 401 && !config.suppressUnauthorized) {
        this.unauthorizedHandler?.(requestError);
      }
      throw requestError;
    }

    if (response.status === 204) return null;
    if (config.responseType === "blob") return response.blob();
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return null;
    return response.json();
  }

  getCurrentUser(): Promise<AuthMeResponse> {
    return this.request("/auth/me", {}, "Не удалось проверить сессию", {
      suppressUnauthorized: true,
    });
  }

  devLogin(): Promise<DevLoginResponse> {
    return this.request(
      "/auth/dev-login",
      { method: "POST" },
      "Не удалось выполнить тестовый вход",
      { suppressUnauthorized: true },
    );
  }

  logout(): Promise<null> {
    return this.request(
      "/auth/logout",
      { method: "POST" },
      "Не удалось выйти",
      { suppressUnauthorized: true },
    );
  }

  async createGenerationDraft(questionnaire: StoryQuestionnaire, childPhoto: File | null): Promise<GenerationDraftCreation> {
    const response = !childPhoto
      ? await this.request(
          "/generation-drafts",
          {
            method: "POST",
            body: JSON.stringify(questionnaire),
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          },
          "Не удалось сохранить анкету",
        )
      : await this.request(
          "/generation-drafts",
          {
            method: "POST",
            body: this.createStoryFormData(questionnaire, childPhoto),
            headers: { Accept: "application/json" },
          },
          "Не удалось сохранить анкету и фото",
        );
    if (!response?.draftId || typeof response.draftId !== "string") {
      throw new Error("Сервер не вернул draftId анкеты");
    }
    return response;
  }

  async createGenerationPayment(draftId: string): Promise<PaymentCreation> {
    if (!draftId || typeof draftId !== "string") {
      throw new Error("Не найден draftId для создания платежа");
    }
    const payment = await this.request(
      "/payments/generation/create",
      {
        method: "POST",
        body: JSON.stringify({ draftId }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
      "Не удалось создать платеж",
    );
    if (
      !payment?.confirmationUrl ||
      typeof payment.confirmationUrl !== "string" ||
      !/^https?:\/\//i.test(payment.confirmationUrl)
    ) {
      throw new Error("Сервер не вернул ссылку на оплату");
    }
    return payment;
  }

  async getGenerationBalance(signal?: AbortSignal): Promise<GenerationPaymentStatusResponse> {
    const balance = await this.request("/payments/generation/status", {
      cache: "no-store", signal, headers: { Accept: "application/json" },
    }, "Не удалось проверить остаток генераций");
    if (!balance || typeof balance.paid !== "boolean" || typeof balance.canPurchase !== "boolean" ||
      !["availableGenerations", "reservedGenerations", "balanceVersion", "packageSize"].every(
        (key) => Number.isSafeInteger(balance[key]) && balance[key] >= (key === "packageSize" ? 1 : 0),
      )) throw new Error("Сервер вернул некорректный баланс генераций");
    return balance;
  }

  async startGenerationDraft(draftId: string): Promise<GenerationStartResponse> {
    if (!draftId || typeof draftId !== "string") throw new Error("Не найден draftId для запуска");
    const result = await this.request(`/generation-drafts/${encodeURIComponent(draftId)}/start`, {
      method: "POST", headers: { Accept: "application/json" },
    }, "Не удалось запустить создание сказки");
    if (!result || result.draftId !== draftId || typeof result.operationId !== "string" || !result.operationId ||
      !["queued", "running", "success", "error"].includes(result.generationStatus) ||
      (result.storyId !== undefined && typeof result.storyId !== "string")) {
      throw new Error("Сервер вернул некорректный ответ запуска");
    }
    return result;
  }

  createStoryFormData(questionnaire: StoryQuestionnaire, childPhoto: File): FormData {
    const body = new FormData();
    body.append("formData", JSON.stringify(questionnaire));
    body.append("childPhoto", childPhoto);
    return body;
  }

  normalizeGenerationOperation(operation: GenerationOperationStatus | null): NormalizedOperation | null {
    if (operation === null) return null;
    if (
      !operation ||
      typeof operation.draftId !== "string" ||
      !operation.draftId ||
      typeof operation.paymentStatus !== "string" ||
      typeof operation.generationStatus !== "string"
    ) {
      throw new Error("Сервер вернул некорректный статус операции");
    }
    return {
      ...(typeof operation.operationId === "string" ? { operationId: operation.operationId } : {}),
      ...(typeof operation.fundingSource === "string" ? { fundingSource: operation.fundingSource } : {}),
      draftId: operation.draftId,
      paymentStatus: operation.paymentStatus,
      generationStatus: operation.generationStatus,
      storyId:
        typeof operation.storyId === "string" && operation.storyId
          ? operation.storyId
          : null,
      error:
        typeof operation.error === "string" && operation.error
          ? operation.error
          : null,
    };
  }

  async getGenerationOperationStatus(draftId: string, signal?: AbortSignal): Promise<NormalizedOperation> {
    if (!draftId || typeof draftId !== "string") {
      throw new Error("Не найден draftId для проверки статуса");
    }
    const operation = await this.request(
      `/generation-drafts/${encodeURIComponent(draftId)}/status`,
      {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal,
      },
      "Не удалось проверить статус операции",
    );
    const normalized = this.normalizeGenerationOperation(operation);
    if (!normalized) throw new Error("Сервер вернул пустой статус операции");
    return normalized;
  }

  async getCurrentGenerationOperation(signal?: AbortSignal): Promise<NormalizedOperation | null> {
    const response = await this.request(
      "/payments/generation/current",
      {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal,
      },
      "Не удалось восстановить текущую операцию",
    );
    if (!response || !Object.prototype.hasOwnProperty.call(response, "operation")) {
      throw new Error("Сервер вернул некорректный ответ восстановления");
    }
    return this.normalizeGenerationOperation(response.operation);
  }

  getGenerationFlowStatus(storyId: string, signal?: AbortSignal): Promise<GenerationFlowState> {
    return this.request(
      `/generate-flow/${encodeURIComponent(storyId)}/status`,
      {
        headers: { Accept: "application/json" },
        signal,
      },
      "Не удалось проверить статус создания книги",
    );
  }

  regenerateBook(storyId: string): Promise<GenerateBookResponse> {
    return this.request(
      "/generate-book",
      {
        method: "POST",
        body: JSON.stringify({ storyId }),
        headers: { "Content-Type": "application/json" },
      },
      "Ошибка пересборки книги",
    );
  }

  getUserBooks(signal?: AbortSignal): Promise<BookListItem[]> {
    return this.request(
      "/books",
      { headers: { Accept: "application/json" }, signal },
      "Ошибка загрузки списка книг",
    );
  }

  getStoryScenes(storyId: string, signal?: AbortSignal): Promise<StoryScenesResponse> {
    return this.request(
      `/stories/${encodeURIComponent(storyId)}/scenes`,
      { headers: { Accept: "application/json" }, signal },
      "Не удалось загрузить сцены сказки",
    );
  }

  async getStoryBook(storyId: string, signal?: AbortSignal): Promise<NormalizedBookViewer> {
    const result = await this.request(
      `/stories/${encodeURIComponent(storyId)}/book`,
      { headers: { Accept: "application/json" }, signal },
      "Не удалось загрузить книгу",
    );

    if (
      !result ||
      typeof result.storyId !== "string" ||
      typeof result.title !== "string" ||
      !result.cover ||
      typeof result.cover.imageUrl !== "string" ||
      !Array.isArray(result.scenes)
    ) {
      throw new Error("Сервер вернул некорректную книгу");
    }

    return {
      storyId: result.storyId,
      title: result.title,
      cover: {
        imageUrl: this.getFileUrl(result.cover.imageUrl),
      },
      scenes: result.scenes.map((scene) => {
        if (
          !scene ||
          !Object.prototype.hasOwnProperty.call(scene, "sceneId") ||
          typeof scene.imageUrl !== "string" ||
          typeof scene.text !== "string"
        ) {
          throw new Error("Сервер вернул некорректную сцену книги");
        }
        return {
          sceneId: String(scene.sceneId),
          imageUrl: this.getFileUrl(scene.imageUrl),
          text: scene.text,
        };
      }),
    };
  }

  updateStoryScenes(storyId: string, scenes: Array<{ sceneId: string | number; text: string }>): Promise<UpdateStoryScenesResponse> {
    return this.request(
      `/stories/${encodeURIComponent(storyId)}/scenes`,
      {
        method: "PUT",
        body: JSON.stringify({ scenes }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
      "Не удалось сохранить изменения",
    );
  }

  downloadBook(storyId: string): Promise<Blob> {
    return this.request(
      `/books/${encodeURIComponent(storyId)}/download`,
      {},
      "Книга недоступна",
      { responseType: "blob" },
    );
  }

  getCoverUrl(storyId) {
    return this.getFileUrl(`/stories/${encodeURIComponent(storyId)}/cover`);
  }
  getBookDownloadUrl(storyId) {
    return this.getFileUrl(`/books/${encodeURIComponent(storyId)}/download`);
  }
  getSceneImageUrl(storyId, sceneId) {
    return this.getFileUrl(
      `/stories/${encodeURIComponent(storyId)}/scenes/${encodeURIComponent(sceneId)}/image`,
    );
  }

  getFileUrl(path) {
    if (!path) return path;
    if (/^https?:\/\//i.test(path)) {
      const url = new URL(path);
      return url.origin === window.location.origin &&
        url.pathname.startsWith("/api/")
        ? url.toString()
        : "";
    }
    if (path.startsWith("/api/")) return path;
    const base = this.baseUrl.replace(/\/$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalizedPath}`;
  }
}

export { ApiService };
const apiService = new ApiService();
export default apiService;
