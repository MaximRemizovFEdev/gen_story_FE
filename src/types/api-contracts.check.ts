import type {
  BookListItem,
  GenerateBookResponse,
  NormalizedOperation,
  StoryScenesResponse,
  UpdateStoryScenesRequest,
  GenerationPaymentStatusResponse,
  GenerationStartResponse,
} from "./ApiService";

const book: BookListItem = {
  storyId: "14-30_26-10-2026",
  title: "Story",
  coverUrl: "/api/cover",
  downloadUrl: "/api/download",
  generatedAt: "2026-10-26T14:30:00",
};
const scenes: UpdateStoryScenesRequest = {
  scenes: [{ sceneId: 1, text: "Updated" }],
};
const result: GenerateBookResponse = {
  success: true,
  title: "Story",
  downloadUrl: "/api/download",
};
const operation: NormalizedOperation = {
  draftId: "draft",
  paymentStatus: "pending",
  generationStatus: "not_started",
  storyId: null,
  error: null,
};
const response: StoryScenesResponse = {
  scenes: [{ sceneId: "1", text: null }],
};

const balance: GenerationPaymentStatusResponse = {
  paid: false, availableGenerations: 4, reservedGenerations: 0,
  balanceVersion: 2, packageSize: 5, canPurchase: false,
};
const started: GenerationStartResponse = {
  operationId: "operation", draftId: "draft", generationStatus: "queued",
};

export { book, scenes, result, operation, response, balance, started };
