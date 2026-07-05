import React from 'react';
import apiService from '../services/ApiService';

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
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [currentGenStep, setCurrentGenStep] = React.useState(0);
  const [coverUrl, setCoverUrl] = React.useState(null);
  const [pdfUrl, setPdfUrl] = React.useState(null);
  const [error, setError] = React.useState(null);

  const steps = [
    { label: 'Телефон', field: 'phone' },
    { label: 'Имя ребенка', field: 'childName' },
    { label: 'Возраст', field: 'age' },
    { label: 'Главный герой', field: 'hero' },
    { label: 'Приключение', field: 'adventure' },
    { label: 'Атмосфера сказки', field: 'atmosphere' },
    { label: 'Интересы', field: 'interests' },
  ];
  const genSteps = ['Создаем сценарий', 'Рисуем обложку', 'Генерируем иллюстрации', 'Собираем книгу'];

  const current = steps[step - 1];

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

  const handleSubmit = async () => {
    setIsGenerating(true);
    setError(null);
    setCoverUrl(null);
    setPdfUrl(null);
    setCurrentGenStep(0);

    try {
      // Шаг 1: Создаем сценарий
      const storyResponse = await apiService.generateStory(form);
      console.log('Сценарий сгенерирован:', storyResponse);
      setCurrentGenStep(1);

      // Шаг 2: Рисуем обложку
      const coverResponse = await apiService.generateCover(form);
      setCoverUrl(coverResponse.url);
      setCurrentGenStep(2);

      // Шаг 3: Генерируем иллюстрации
      await apiService.generateScenes(form);
      setCurrentGenStep(3);

      // Шаг 4: Собираем книгу
      const bookResponse = await apiService.generateBook(form);
      setPdfUrl(bookResponse.pdfUrl);
      setCurrentGenStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderGenProgress = () => {
    if (error) {
      return (
        <div className="generation-error">
          <span style={{ color: 'orange', fontSize: '2rem' }}>⚠️</span>
          <p style={{ color: 'orange' }}>Произошла ошибка. Попробуйте повторить шаг.</p>
        </div>
      );
    }

    return (
      <div className="progress-screen">
        <h2>Генерация книги</h2>
        <div className="progress-steps">
          {genSteps.map((label, idx) => (
            <div
              key={label}
              className={`progress-step ${idx === currentGenStep ? 'active' : ''} ${idx < currentGenStep ? 'completed' : ''}`}
              style={{
                padding: '10px',
                margin: '5px 0',
                backgroundColor: idx === currentGenStep ? '#4CAF50' : idx < currentGenStep ? '#8BC34C' : '#f0f0f0',
                borderRadius: '4px'
              }}
            >
              Шаг {idx + 1}/4 — {label}
            </div>
          ))}
        </div>
        {coverUrl && (
          <div className="cover-preview">
                            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                              <img src={coverUrl} alt="Обложка" style={{ maxWidth: '100%' }} />
                              <p style={{ textAlign: 'center', marginTop: '10px' }}>Скачать книгу</p>
                            </a>
          </div>
        )}
        {pdfUrl && (
          <div className="download-link">
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              <img src={coverUrl} alt="Скачать книгу" style={{ maxWidth: '100%', cursor: 'pointer' }} />
              <p style={{ textAlign: 'center', marginTop: '10px' }}>Скачать книгу</p>
            </a>
          </div>
        )}
      </div>
    );
  };

  const renderStepContent = () => {
    if (isGenerating) {
      return renderGenProgress();
    }

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
        {step > 1 && !isGenerating && (
          <button onClick={() => setStep(step - 1)} disabled={!isStepValid()}>
            Назад
          </button>
        )}
        {step < steps.length && !isGenerating && (
          <button onClick={() => setStep(step + 1)} disabled={!isStepValid()}>
            Далее
          </button>
        )}
        {step === steps.length && !isGenerating && (
          <button onClick={handleSubmit} disabled={!isStepValid()}>
            Создать книгу
          </button>
        )}
      </div>
    </div>
  );
}

export default Wizard;