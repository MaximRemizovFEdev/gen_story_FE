import { useState, useCallback } from 'react';
import apiService from '../services/ApiService';

export const useGenerationProcess = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGenStep, setCurrentGenStep] = useState(0);
  const [coverUrl, setCoverUrl] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState(null);
  const [failedStep, setFailedStep] = useState(null);

  const genSteps = [
    'Создаем сценарий',
    'Рисуем обложку',
    'Генерируем иллюстрации',
    'Собираем книгу'
  ];

  const startGeneration = useCallback(async (form) => {
    setIsGenerating(true);
    setError(null);
    setFailedStep(null);
    setCurrentGenStep(0);
    setCoverUrl(null);
    setPdfUrl(null);

    try {
      // Шаг 1: Генерация сюжета
      console.log('📝 Шаг 1: Генерация сюжета...');
      await apiService.generateStory(form);
      setCurrentGenStep(1);

      // Шаг 2: Генерация обложки
      console.log('🎨 Шаг 2: Генерация обложки...');
      const coverResp = await apiService.generateCover(form);
      setCoverUrl(coverResp.url);
      setCurrentGenStep(2);

      // Шаг 3: Генерация сцен
      console.log('🖼️ Шаг 3: Генерация сцен...');
      await apiService.generateScenes(form);
      setCurrentGenStep(3);

      // Шаг 4: Сборка книги
      console.log('📚 Шаг 4: Сборка книги...');
      const bookResp = await apiService.generateBook(form);
      setPdfUrl(bookResp.pdfUrl);
      setCurrentGenStep(4);

      console.log('✅ Генерация завершена!');
    } catch (err) {
      console.error('❌ Ошибка:', err);
      setError(err.message || 'Произошла ошибка при генерации');
      setFailedStep(currentGenStep);
    } finally {
      setIsGenerating(false);
    }
  }, [currentGenStep]);

  const retryFailedStep = useCallback(async (form) => {
    if (failedStep == null) return;
    setError(null);
    const savedStep = failedStep;
    setFailedStep(null);
    setIsGenerating(true);
    
    try {
      // Начинаем с упавшего шага
      if (savedStep <= 0) {
        await apiService.generateStory(form);
        setCurrentGenStep(1);
      }
      if (savedStep <= 1) {
        const coverResp = await apiService.generateCover(form);
        setCoverUrl(coverResp.url);
        setCurrentGenStep(2);
      }
      if (savedStep <= 2) {
        await apiService.generateScenes(form);
        setCurrentGenStep(3);
      }
      if (savedStep <= 3) {
        const bookResp = await apiService.generateBook(form);
        setPdfUrl(bookResp.pdfUrl);
        setCurrentGenStep(4);
      }
    } catch (err) {
      setError(err.message);
      setFailedStep(savedStep);
    } finally {
      setIsGenerating(false);
    }
  }, [failedStep]);

  return {
    isGenerating,
    currentGenStep,
    coverUrl,
    pdfUrl,
    error,
    failedStep,
    genSteps,
    startGeneration,
    retryFailedStep
  };
};