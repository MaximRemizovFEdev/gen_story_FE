class ApiService {
  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    console.log('API Base URL:', this.baseUrl);
  }

  async request(path, options, fallbackMessage) {
    let response;

    try {
      response = await fetch(`${this.baseUrl}${path}`, options);
    } catch (error) {
      if (error.name === 'AbortError') throw error;

      const networkError = new Error(`${fallbackMessage}. Не удалось связаться с сервером`);
      networkError.endpoint = path;
      networkError.cause = error;
      throw networkError;
    }

    if (!response.ok) {
      let serverMessage = '';

      try {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const body = await response.json();
          serverMessage = body?.message || body?.error || '';
        } else {
          const body = await response.text();
          if (body && !/<[a-z][\s\S]*>/i.test(body)) {
            serverMessage = body.slice(0, 300);
          }
        }
      } catch {
        // Use the endpoint-specific fallback when the response body is unreadable.
      }

      const requestError = new Error(serverMessage || fallbackMessage);
      requestError.status = response.status;
      requestError.endpoint = path;
      throw requestError;
    }

    return response.json();
  }

  async generateStory(formData) {
    return this.request('/generate-story', {
      method: 'POST',
      body: JSON.stringify(formData),
      headers: { 'Content-Type': 'application/json' }
    }, 'Ошибка генерации сценария');
  }

  async generateCover(formData) {
    return this.request('/generate-cover', {
      method: 'POST',
      body: JSON.stringify(formData),
      headers: { 'Content-Type': 'application/json' }
    }, 'Ошибка генерации обложки');
  }

  async generateScenes(formData) {
    return this.request('/generate-scenes', {
      method: 'POST',
      body: JSON.stringify(formData),
      headers: { 'Content-Type': 'application/json' }
    }, 'Ошибка генерации иллюстраций');
  }

  async generateBook(formData) {
    return this.request('/generate-book', {
      method: 'POST',
      body: JSON.stringify(formData),
      headers: { 'Content-Type': 'application/json' }
    }, 'Ошибка создания книги');
  }

  async getUserBooks(phone, signal) {
    return this.request(
      `/books/${encodeURIComponent(phone)}`,
      {
        headers: { Accept: 'application/json' },
        signal
      },
      'Ошибка загрузки списка книг'
    );
  }

  getFileUrl(path) {
    if (!path || /^https?:\/\//i.test(path)) return path;
    const apiBaseUrl = new URL(this.baseUrl, window.location.origin);
    return new URL(path, apiBaseUrl).toString();
  }
}

const apiService = new ApiService();
export default apiService;
