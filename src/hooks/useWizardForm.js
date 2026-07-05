import { useState, useCallback } from 'react';
import { steps } from '../config/steps';

export const useWizardForm = () => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    phone: '',
    childName: '',
    age: '',
    hero: '',
    heroCustom: '',
    adventure: '',
    adventureCustom: '',
    atmosphere: '',
    interests: []
  });

  const current = steps[step - 1];

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setForm(prev => {
        const arr = prev.interests || [];
        return { ...prev, interests: checked ? [...arr, value] : arr.filter(v => v !== value) };
      });
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  const isStepValid = useCallback(() => {
    if (!current) return false;
    switch (current.field) {
      case 'phone':
        return !!form.phone;
      case 'childName':
        return !!form.childName;
      case 'age':
        return !!form.age;
      case 'hero':
        if (form.hero === 'Свой вариант') {
          return !!form.heroCustom;
        }
        return !!form.hero;
      case 'adventure':
        if (form.adventure === 'Свой вариант') {
          return !!form.adventureCustom;
        }
        return !!form.adventure;
      case 'atmosphere':
        return !!form.atmosphere;
      case 'interests':
        return form.interests.length > 0 && form.interests.length <= 3;
      default:
        return false;
    }
  }, [form, current]);

  const goBack = useCallback(() => {
    setStep(prev => Math.max(1, prev - 1));
  }, []);

  const goNext = useCallback(() => {
    setStep(prev => Math.min(steps.length, prev + 1));
  }, [steps.length]);

  const reset = useCallback(() => {
    setStep(1);
    setForm({
      phone: '',
      childName: '',
      age: '',
      hero: '',
      heroCustom: '',
      adventure: '',
      adventureCustom: '',
      atmosphere: '',
      interests: []
    });
  }, []);

  return {
    step,
    form,
    current,
    handleChange,
    isStepValid,
    goBack,
    goNext,
    reset
  };
};