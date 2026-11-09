export interface FormDataType {
  childName: string;
  ageGroup: string;
  heroType: string;
  heroCustom: string;
  adventureGoal: string;
  adventureCustom: string;
  storyMood: string;
  interests: string[];
  childPhoto: File | null;
}

export interface GenerationResult {
  storyId: string;
  coverUrl: string;
  images: string[];
  pdfUrl: string;
  error?: string;
}
