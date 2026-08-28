// Конфигурация шагов оформления книги
export const steps = [
  { label: 'Имя ребенка', field: 'childName' },
  { label: 'Возраст', field: 'ageGroup' },
  { label: 'Главный герой', field: 'heroType' },
  { label: 'Приключение', field: 'adventureGoal' },
  { label: 'Атмосфера сказки', field: 'storyMood' },
  { label: 'Интересы', field: 'interests' },
  { label: 'Фото ребёнка', field: 'childPhoto' },
];

// Порядок генерации шагов
export const genSteps = [
  'Создаем сценарий',
  'Рисуем обложку',
  'Генерируем иллюстрации',
  'Собираем книгу'
];
