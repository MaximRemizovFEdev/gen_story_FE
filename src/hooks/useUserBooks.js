import { useEffect, useState } from 'react';
import apiService from '../services/ApiService';

export const useUserBooks = (enabled) => {
  const [books, setBooks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setBooks([]);
    setError(null);
    setIsLoading(false);
    if (!enabled) return undefined;

    const controller = new AbortController();
    setIsLoading(true);
    apiService.getUserBooks(controller.signal)
      .then((result) => setBooks(Array.isArray(result) ? result : []))
      .catch((requestError) => {
        if (requestError.name !== 'AbortError' && requestError.status !== 401) setError(requestError.message);
      })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });

    return () => controller.abort();
  }, [enabled]);

  return { books, isLoading, error };
};
