import { FormDataType } from './index';

interface GenerationFlowResponse {
  status: 'pending';
  storyId: string;
}

interface GenerationFlowStatusResponse {
  storyId: string;
  stage: 'story' | 'cover' | 'scenes' | 'book';
  status: 'pending' | 'success' | 'error';
}

interface GenerationPaymentStatusResponse {
  paid: boolean;
  purchaseId?: string;
  paidAt?: string;
}

interface GenerationPaymentCreateResponse {
  purchaseId: string;
  providerPaymentId: string;
  confirmationUrl: string;
}

interface ApiError {
  message: string;
  status: number;
}

export type {
  GenerationFlowResponse,
  GenerationFlowStatusResponse,
  GenerationPaymentStatusResponse,
  GenerationPaymentCreateResponse,
  ApiError,
  FormDataType,
};
