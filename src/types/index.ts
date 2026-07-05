export interface FormDataType {
  phone: string;
  childName: string;
  age: string;
  hero: string;
  heroCustom: string;
  adventure: string;
  adventureCustom: string;
  atmosphere: string;
  interests: string[];
}

export interface GenerationResult {
  storyId: string;
  coverUrl: string;
  images: string[];
  pdfUrl: string;
  error?: string;
}