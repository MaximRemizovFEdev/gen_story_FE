export const validateStep = (field, form) => {
  switch (field) {
    case 'phone':
      return !!form.phone;
    case 'childName':
      return !!form.childName;
    case 'ageGroup':
      return !!form.ageGroup;
    case 'heroType':
      if (form.heroType === 'Свой вариант') {
        return !!form.heroCustom;
      }
      return !!form.heroType;
    case 'adventureGoal':
      if (form.adventureGoal === 'Свой вариант') {
        return !!form.adventureCustom;
      }
      return !!form.adventureGoal;
    case 'storyMood':
      return !!form.storyMood;
    case 'interests':
      return form.interests.length > 0 && form.interests.length <= 3;
    default:
      return false;
  }
};