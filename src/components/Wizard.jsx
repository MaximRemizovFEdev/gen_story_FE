import React from 'react';

function Wizard() {
  const [step, setStep] = React.useState(1);
  const [form, setForm] = React.useState({
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
  const steps = [
    { label: 'Телефон', field: 'phone' },
    { label: 'Имя ребенка', field: 'childName' },
    { label: 'Возраст', field: 'age' },
    { label: 'Главный герой', field: 'hero' },
    { label: 'Приключение', field: 'adventure' },
    { label: 'Атмосфера сказки', field: 'atmosphere' },
    { label: 'Интересы', field: 'interests' },
  ];
  const current = steps[step-1];

  const ageOptions = ['1–3 года', '3–4 года', '5–6 лет', '7–8 лет'];
  const heroOptions = ['Сам ребенок', 'Котик', 'Медвежонок', 'Дракончик', 'Единорог', 'Супергерой', 'Свой вариант'];
  const adventureOptions = ['Найти сокровище', 'Спасти друга', 'Попасть в волшебный мир', 'Научиться смелости', 'Найти магический предмет', 'Путешествие в космос', 'Свой вариант'];
  const atmosphereOptions = ['Добрая и уютная', 'Смешная', 'Волшебная', 'Приключенческая', 'Перед сном', 'Немного загадочная'];
  const interestsOptions = ['Динозавры', 'Космос', 'Животные', 'Машинки', 'Принцессы', 'Роботы', 'Море', 'Магия'];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setForm(prev => {
        const arr = prev.interests || [];
        return { ...prev, interests: checked ? [...arr, value] : arr.filter(v => v !== value) };
      });
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const isStepValid = () => {
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
  };

  const renderStepContent = () => {
    switch (current.field) {
      case 'phone':
        return (
          <div>
            <label>Телефон:</label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              maxLength="120"
              required
              placeholder="Введите телефон"
            />
          </div>
        );
      case 'childName':
        return (
          <div>
            <label>Имя ребенка:</label>
            <input
              type="text"
              name="childName"
              value={form.childName}
              onChange={handleChange}
              maxLength="120"
              placeholder="Введите имя"
            />
          </div>
        );
      case 'age':
        return (
          <div>
            <label>Возраст:</label>
            {ageOptions.map(option => (
              <div key={option} style={{ marginBottom: '8px' }}>
                <label>
                  <input
                    type="radio"
                    name="age"
                    value={option}
                    checked={form.age === option}
                    onChange={handleChange}
                  />
                  {option}
                </label>
              </div>
            ))}
          </div>
        );
      case 'hero':
        return (
          <div>
            <label>Главный герой:</label>
            {heroOptions.map(option => (
              <div key={option} style={{ marginBottom: '8px' }}>
                <label>
                  <input
                    type="radio"
                    name="hero"
                    value={option}
                    checked={form.hero === option}
                    onChange={handleChange}
                  />
                  {option}
                </label>
              </div>
            ))}
            {form.hero === 'Свой вариант' && (
              <div>
                <label>Ваш вариант героя:</label>
                <input
                  type="text"
                  name="heroCustom"
                  value={form.heroCustom}
                  onChange={handleChange}
                  maxLength="120"
                  placeholder="Введите вариант"
                />
              </div>
            )}
          </div>
        );
      case 'adventure':
        return (
          <div>
            <label>Приключение:</label>
            {adventureOptions.map(option => (
              <div key={option} style={{ marginBottom: '8px' }}>
                <label>
                  <input
                    type="radio"
                    name="adventure"
                    value={option}
                    checked={form.adventure === option}
                    onChange={handleChange}
                  />
                  {option}
                </label>
              </div>
            ))}
            {form.adventure === 'Свой вариант' && (
              <div>
                <label>Ваш вариант приключения:</label>
                <input
                  type="text"
                  name="adventureCustom"
                  value={form.adventureCustom}
                  onChange={handleChange}
                  maxLength="120"
                  placeholder="Введите вариант"
                />
              </div>
            )}
          </div>
        );
      case 'atmosphere':
        return (
          <div>
            <label>Атмосфера сказки:</label>
            {atmosphereOptions.map(option => (
              <div key={option} style={{ marginBottom: '8px' }}>
                <label>
                  <input
                    type="radio"
                    name="atmosphere"
                    value={option}
                    checked={form.atmosphere === option}
                    onChange={handleChange}
                  />
                  {option}
                </label>
              </div>
            ))}
          </div>
        );
      case 'interests':
        return (
          <div>
            <label>Интересы (максимум 3):</label>
            {interestsOptions.map(option => (
              <div key={option} style={{ marginBottom: '8px' }}>
                <label>
                  <input
                    type="checkbox"
                    name="interests"
                    value={option}
                    checked={form.interests.includes(option)}
                    onChange={handleChange}
                  />
                  {option}
                </label>
              </div>
            ))}
            {form.interests.length > 3 && (
              <p style={{ color: 'red' }}>Можно выбрать не более 3 интересов</p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="wizard">
      <h1>Story Generator Wizard</h1>
      <p>Заполните анкету, чтобы создать свою книгу.</p>
      <div className="step-indicator">
        Шаг {step} из {steps.length}
      </div>
      <div className="step-content">
        {renderStepContent()}
      </div>
      <div className="buttons">
        {step > 1 && (
          <button onClick={() => setStep(step - 1)} disabled={!isStepValid()}>
            Назад
          </button>
        )}
        {step < steps.length && (
          <button onClick={() => setStep(step + 1)} disabled={!isStepValid()}>
            Далее
          </button>
        )}
        {step === steps.length && (
          <button onClick={() => alert('Форма готова к отправке!')} disabled={!isStepValid()}>
            Создать книгу
          </button>
        )}
      </div>
    </div>
  );
}

export default Wizard;