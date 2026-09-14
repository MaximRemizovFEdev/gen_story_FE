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

interface ApiError {
  message: string;
  status: number;
}

export type { GenerationFlowResponse, GenerationFlowStatusResponse, ApiError, FormDataType };
