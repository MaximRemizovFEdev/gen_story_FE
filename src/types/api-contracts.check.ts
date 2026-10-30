import type {
  BookListItem,
  GenerateBookResponse,
  NormalizedOperation,
  StoryScenesResponse,
  UpdateStoryScenesRequest,
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

export { book, scenes, result, operation, response };
