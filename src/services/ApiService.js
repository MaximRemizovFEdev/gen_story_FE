class ApiService {
  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || '/api';
    this.unauthorizedHandler = null;
  }

  setUnauthorizedHandler(handler) {
    this.unauthorizedHandler = typeof handler === 'function' ? handler : null;
    return () => {
      if (this.unauthorizedHandler === handler) this.unauthorizedHandler = null;
    };
  }

  async request(path, options = {}, fallbackMessage = 'Ошибка запроса', config = {}) {
    let response;
    const requestOptions = { ...options, credentials: 'include' };
    try {
      response = await fetch(`${this.baseUrl}${path}`, requestOptions);
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
          if (body && !/<[a-z][\s\S]*>/i.test(body)) serverMessage = body.slice(0, 300);
        }
      } catch {
        // Use the endpoint-specific fallback when the response is unreadable.
      }

      const requestError = new Error(serverMessage || fallbackMessage);
      requestError.status = response.status;
      requestError.endpoint = path;
      if (response.status === 401 && !config.suppressUnauthorized) {
        this.unauthorizedHandler?.(requestError);
      }
      throw requestError;
    }

    if (response.status === 204) return null;
    if (config.responseType === 'blob') return response.blob();
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return null;
    return response.json();
  }

  getCurrentUser() {
    return this.request('/auth/me', {}, 'Не удалось проверить сессию', { suppressUnauthorized: true });
  }

  devLogin() {
    return this.request('/auth/dev-login', { method: 'POST' }, 'Не удалось выполнить тестовый вход', { suppressUnauthorized: true });
  }

  logout() {
    return this.request('/auth/logout', { method: 'POST' }, 'Не удалось выйти', { suppressUnauthorized: true });
  }

  generateStory(questionnaire, childPhoto) {
    if (!childPhoto) {
      return this.request('/generate-story', {
        method: 'POST',
        body: JSON.stringify(questionnaire),
        headers: { 'Content-Type': 'application/json' },
      }, 'Не удалось создать сказку. Проверьте данные анкеты');
    }
    const body = new FormData();
    body.append('formData', JSON.stringify(questionnaire));
    body.append('childPhoto', childPhoto);
    return this.request('/generate-story', { method: 'POST', body }, 'Не удалось создать сказку. Проверьте данные анкеты и фотографию');
  }

  storyRequest(path, storyId, fallbackMessage) {
    return this.request(path, {
      method: 'POST',
      body: JSON.stringify({ storyId }),
      headers: { 'Content-Type': 'application/json' },
    }, fallbackMessage);
  }

  generateCover(storyId) { return this.storyRequest('/generate-cover', storyId, 'Ошибка генерации обложки'); }
  generateScenes(storyId) { return this.storyRequest('/generate-scenes', storyId, 'Ошибка генерации иллюстраций'); }
  generateBook(storyId) { return this.storyRequest('/generate-book', storyId, 'Ошибка создания книги'); }
  generatePaintbook(storyId) { return this.storyRequest('/generate-paintbook', storyId, 'Ошибка создания раскраски'); }

  getUserBooks(signal) {
    return this.request('/books', { headers: { Accept: 'application/json' }, signal }, 'Ошибка загрузки списка книг');
  }

  getStoryScenes(storyId, signal) {
    return this.request(`/stories/${encodeURIComponent(storyId)}/scenes`, { headers: { Accept: 'application/json' }, signal }, 'Не удалось загрузить сцены сказки');
  }

  updateStoryScenes(storyId, scenes) {
    return this.request(`/stories/${encodeURIComponent(storyId)}/scenes`, {
      method: 'PUT',
      body: JSON.stringify({ scenes }),
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    }, 'Не удалось сохранить изменения');
  }

  downloadBook(storyId) {
    return this.request(`/books/${encodeURIComponent(storyId)}/download`, {}, 'Книга недоступна', { responseType: 'blob' });
  }

  getCoverUrl(storyId) { return this.getFileUrl(`/stories/${encodeURIComponent(storyId)}/cover`); }
  getBookDownloadUrl(storyId) { return this.getFileUrl(`/books/${encodeURIComponent(storyId)}/download`); }
  getPaintbookDownloadUrl(storyId) { return this.getFileUrl(`/paintbooks/${encodeURIComponent(storyId)}/download`); }
  getSceneImageUrl(storyId, sceneId) { return this.getFileUrl(`/stories/${encodeURIComponent(storyId)}/scenes/${encodeURIComponent(sceneId)}/image`); }

  getFileUrl(path) {
    if (!path) return path;
    if (/^https?:\/\//i.test(path)) {
      const url = new URL(path);
      return url.origin === window.location.origin && url.pathname.startsWith('/api/') ? url.toString() : '';
    }
    if (path.startsWith('/api/')) return path;
    const base = this.baseUrl.replace(/\/$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalizedPath}`;
  }
}

export { ApiService };
const apiService = new ApiService();
export default apiService;
