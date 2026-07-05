class ApiService {
  async generateStory(formData) {
    const response = await fetch('/api/generate-story', {
      method: 'POST',
      body: JSON.stringify(formData),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error('Ошибка генерации сценария');
    return response.json();
  }

  async generateCover(formData) {
    const response = await fetch('/api/generate-cover', {
      method: 'POST',
      body: JSON.stringify(formData),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error('Ошибка генерации обложки');
    return response.json();
  }

  async generateScenes(formData) {
    const response = await fetch('/api/generate-scenes', {
      method: 'POST',
      body: JSON.stringify(formData),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error('Ошибка генерации иллюстраций');
    return response.json();
  }

  async generateBook(formData) {
    const response = await fetch('/api/generate-book', {
      method: 'POST',
      body: JSON.stringify(formData),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error('Ошибка создания книги');
    return response.json();
  }
}

const apiService = new ApiService();
export default apiService;