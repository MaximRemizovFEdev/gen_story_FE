// Конфигурация шагов оформления книги
export const steps = [
  { label: 'Телефон', field: 'phone' },
  { label: 'Имя ребенка', field: 'childName' },
  { label: 'Возраст', field: 'age' },
  { label: 'Главный герой', field: 'hero' },
  { label: 'Приключение', field: 'adventure' },
  { label: 'Атмосфера сказки', field: 'atmosphere' },
  { label: 'Интересы', field: 'interests' },
];

// Порядок генерации шагов
export const genSteps = [
  'Создаем сценарий',
  'Рисуем обложку',
  'Генерируем иллюстрации',
  'Собираем книгу'
];