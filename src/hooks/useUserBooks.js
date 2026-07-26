import { useEffect, useState } from 'react';
import apiService from '../services/ApiService';

export const useUserBooks = (phone, enabled) => {
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setBooks([]);
    setError(null);
    setIsLoading(false);

    const normalizedPhone = phone.trim();
    if (!enabled || !/^\d+$/.test(normalizedPhone)) return undefined;

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setIsLoading(true);

      try {
        const result = await apiService.getUserBooks(
          normalizedPhone,
          controller.signal,
        );
        setBooks(Array.isArray(result) ? result : []);
      } catch (requestError) {
        if (requestError.name !== 'AbortError') {
          setError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [phone, enabled]);

  return { books, isLoading, error };
};
