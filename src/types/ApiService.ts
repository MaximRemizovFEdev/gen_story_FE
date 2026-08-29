import { FormDataType } from './index';

interface StoryResponse {
  status: string;
  storyId: string;
}

interface ApiError {
  message: string;
  status: number;
}

export type { StoryResponse, ApiError, FormDataType };
