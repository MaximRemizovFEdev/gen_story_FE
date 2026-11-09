import type { FormDataType } from "./index";

export type StoryId = string;
export type SceneId = string | number;
export interface StoryQuestionnaire {
  childName: string;
  ageGroup: string;
  heroType: string;
  adventureGoal: string;
  storyMood: string;
  interests: string[];
}
export interface AuthMeResponse {
  authenticated?: boolean;
  phone?: string | null;
}
export interface DevLoginResponse {
  authenticated: true;
  phone: string;
}
export interface GenerationDraftCreation {
  draftId: string;
  expiresAt: string;
}
export interface GenerationStartResponse {
  operationId: string;
  draftId: string;
  generationStatus: GenerationStatus;
  storyId?: StoryId;
}
export interface PaymentCreation {
  purchaseId: string;
  providerPaymentId: string;
  confirmationUrl: string;
}
export type PaymentStatus =
  | "not_created"
  | "pending"
  | "paid"
  | "reserved"
  | "consumed"
  | "canceled"
  | "failed"
  | "generation_failed";
export type GenerationStatus =
  | "not_started"
  | "queued"
  | "running"
  | "success"
  | "error";
export interface GenerationOperationStatus {
  operationId?: string;
  fundingSource?: string;
  draftId: string;
  paymentStatus: PaymentStatus;
  generationStatus: GenerationStatus;
  storyId?: StoryId;
  error?: string;
}
export interface CurrentGenerationOperation {
  operation: GenerationOperationStatus | null;
}
export type GenerationFlowStage = "story" | "cover" | "scenes" | "book";
export type GenerationFlowStatus = "pending" | "success" | "error";
export interface GenerationFlowState {
  storyId: StoryId;
  stage: GenerationFlowStage;
  status: GenerationFlowStatus;
}
export interface BookListItem {
  storyId: string;
  title: string;
  coverUrl: string;
  downloadUrl: string;
  /** Local timestamp derived from storyId; no timezone suffix. */ generatedAt: string;
}
// TODO(api-contract): GET /stories/{storyId}/scenes does not validate title/text types or presence.
export interface EditableSceneResponse {
  sceneId: SceneId;
  text?: unknown;
}
export interface StoryScenesResponse {
  title?: unknown;
  scenes: EditableSceneResponse[];
}
export interface EditableSceneInput {
  sceneId: SceneId;
  text: string;
}
export interface UpdateStoryScenesRequest {
  scenes: EditableSceneInput[];
}
export interface UpdateStoryScenesResponse {
  success: true;
  updatedScenes: number;
  requiresBookRegeneration: true;
}
export interface GenerateBookRequest {
  storyId: StoryId;
}
export interface GenerateBookResponse {
  success: true;
  title: string;
  downloadUrl: string;
}
export interface BookViewerScene {
  sceneId: SceneId;
  imageUrl: string;
  text: string;
}
export interface BookViewerDto {
  storyId: StoryId;
  title: string;
  cover: { imageUrl: string };
  scenes: BookViewerScene[];
}
export interface NormalizedOperation {
  operationId?: string;
  fundingSource?: string;
  draftId: string;
  paymentStatus: PaymentStatus;
  generationStatus: GenerationStatus;
  storyId: string | null;
  error: string | null;
}
export interface NormalizedBookViewer {
  storyId: string;
  title: string;
  cover: { imageUrl: string };
  scenes: Array<{ sceneId: string; imageUrl: string; text: string }>;
}
export interface ApiErrorResponse {
  error?: string;
  message?: string;
}
export interface ApiError extends Error {
  status?: number;
  endpoint?: string;
  cause?: unknown;
}
export type GenerationFlowResponse = { status: "pending"; storyId: string };
export type GenerationFlowStatusResponse = GenerationFlowState;
export type GenerationPaymentStatusResponse = {
  paid: boolean;
  availableGenerations: number;
  reservedGenerations: number;
  balanceVersion: number;
  packageSize: number;
  canPurchase: boolean;
  purchaseId?: string;
  paidAt?: string;
};
export type GenerationPaymentCreateResponse = PaymentCreation;
export type { FormDataType };
