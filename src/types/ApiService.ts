import { FormDataType } from './types';

interface StoryResponse {
  id: string;
  text: string;
  success: boolean;
}

interface CoverResponse {
  url: string;
  timestamp: number;
}

interface ScenesResponse {
  images: string[];
  success: boolean;
}

interface BookResponse {
  pdfUrl: string;
  success: boolean;
}

interface ApiError {
  message: string;
  status: number;
}

// Managed through dependency injection
const apiService = new ApiService();
export { fetch, apiService };
