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

  const processStep = useCallback(async (stepIndex, form) => {
    try {
      switch (stepIndex) {
        case 0: {
          const storyResp = await apiService.generateStory(form);
          setCurrentGenStep(1);
          await processStep(stepIndex + 1, form);
          break;
        }
        case 1: {
          const coverResp = await apiService.generateCover(form);
          setCoverUrl(coverResp.url);
          setCurrentGenStep(2);
          await processStep(stepIndex + 1, form);
          break;
        }
        case 2: {
          await apiService.generateScenes(form);
          setCurrentGenStep(3);
          await processStep(stepIndex + 1, form);
          break;
        }
        case 3: {
          const bookResp = await apiService.generateBook(form);
          setPdfUrl(bookResp.pdfUrl);
          setCurrentGenStep(4);
          setIsGenerating(false);
          return;
        }
        default:
          setIsGenerating(false);
      }
    } catch (err) {
      setError(err.message);
      setFailedStep(stepIndex);
      setIsGenerating(false);
    }
  }, []);

  const retryFailedStep = useCallback(async (form) => {
    if (failedStep == null) return;
    setError(null);
    const savedStep = failedStep;
    setFailedStep(null);
    await processStep(savedStep, form);
  }, [failedStep, processStep]);

  const startGeneration = useCallback((form) => {
    setIsGenerating(true);
    setError(null);
    setFailedStep(null);
    processStep(0, form);
  }, [processStep]);

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