import apiService from "../services/ApiService";

export const downloadBookPdf = async (storyId, title) => {
  const blob = await apiService.downloadBook(storyId);
  const objectUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.className = "ym-disable-tracklink";
    link.href = objectUrl;
    link.download = `${title || storyId}.pdf`;
    link.click();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};
