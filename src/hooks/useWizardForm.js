import { useState, useCallback } from "react";
import { steps } from "../config/steps";
import { isValidPhone } from "../utils/phone";

export const useWizardForm = () => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    phone: "",
    childName: "",
    ageGroup: "",
    heroType: "",
    heroCustom: "",
    adventureGoal: "",
    adventureCustom: "",
    storyMood: "",
    interests: [],
  });

  const current = steps[step - 1];

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    if (name === "interests") {
      setForm((prev) => {
        const arr = prev.interests || [];
        return {
          ...prev,
          interests: checked ? [...arr, value] : arr.filter((v) => v !== value),
        };
      });
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const isStepValid = useCallback(() => {
    if (!current) return false;
    switch (current.field) {
      case "phone":
        return isValidPhone(form.phone);
      case "childName":
        return !!form.childName;
      case "ageGroup":
        return !!form.ageGroup;
      case "heroType":
        if (form.heroType === "Свой вариант") {
          return !!form.heroCustom;
        }
        return !!form.heroType;
      case "adventureGoal":
        if (form.adventureGoal === "Свой вариант") {
          return !!form.adventureCustom;
        }
        return !!form.adventureGoal;
      case "storyMood":
        return !!form.storyMood;
      case "interests":
        return (
          Array.isArray(form.interests) &&
          form.interests.length > 0 &&
          form.interests.length <= 3
        );
      default:
        return false;
    }
  }, [form, current]);

  const goBack = useCallback(() => {
    setStep((prev) => Math.max(1, prev - 1));
  }, []);

  const goNext = useCallback(() => {
    setStep((prev) => Math.min(steps.length, prev + 1));
  }, [steps.length]);

  const reset = useCallback(() => {
    setStep(1);
    setForm({
      phone: "",
      childName: "",
      ageGroup: "",
      heroType: "",
      heroCustom: "",
      adventureGoal: "",
      adventureCustom: "",
      storyMood: "",
      interests: [],
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
    reset,
  };
};
