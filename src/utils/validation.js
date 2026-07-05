export const validateStep = (field, form) => {
  switch (field) {
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
};