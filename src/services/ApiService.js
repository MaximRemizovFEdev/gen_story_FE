class ApiService {
  constructor() {
    // Берем URL из переменных окружения или используем пустую строку (относительный путь)
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    console.log('API Base URL:', this.baseUrl); // 👈 для отладки
  }

  async generateStory(formData) {
    const response = await fetch(`${this.baseUrl}/generate-story`, {
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
    const response = await fetch(`${this.baseUrl}/generate-cover`, {
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
    const response = await fetch(`${this.baseUrl}/generate-scenes`, {
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
    const response = await fetch(`${this.baseUrl}/generate-book`, {
      method: 'POST',
      body: JSON.stringify(formData),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error('Ошибка создания книги');
    return response.json();
  }

  async getUserBooks(phone, signal) {
    const response = await fetch(
      `${this.baseUrl}/books/${encodeURIComponent(phone)}`,
      {
        headers: {
          Accept: 'application/json'
        },
        signal
      }
    );
    if (!response.ok) throw new Error('Ошибка загрузки списка книг');
    return response.json();
  }

  getFileUrl(path) {
    if (!path || /^https?:\/\//i.test(path)) return path;
    return new URL(path, this.baseUrl).toString();
  }
}

const apiService = new ApiService();
export default apiService;
