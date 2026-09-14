import { useCallback, useEffect, useRef, useState } from 'react';
import apiService from '../services/ApiService';

export const useUserBooks = (enabled) => {
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const reload = useCallback(async () => {
    if (!enabledRef.current) return [];
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiService.getUserBooks(controller.signal);
      const nextBooks = Array.isArray(result) ? result : [];
      if (!controller.signal.aborted) setBooks(nextBooks);
      return nextBooks;
    } catch (requestError) {
      if (requestError.name !== 'AbortError' && requestError.status !== 401) setError(requestError.message);
      throw requestError;
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setBooks([]);
    setError(null);
    setIsLoading(false);
    if (!enabled) {
      controllerRef.current?.abort();
      return undefined;
    }
    reload().catch(() => undefined);
    return () => controllerRef.current?.abort();
  }, [enabled, reload]);

  return { books, isLoading, error, reload };
};
