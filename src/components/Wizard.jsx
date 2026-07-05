import React from 'react';

function Wizard() {
  const [step, setStep] = React.useState(1);
  const [form, setForm] = React.useState({ phone: '', childName: '', age: '', hero: '', adventure: '', atmosphere: '', interests: [] });
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
    if (current.field === 'interests') {
      return form.interests.length > 0 && form.interests.length <= 3;
    }
    return !!form[current.field];
  };
  return (
    <div className="wizard">
      <h1>Story Generator Wizard</h1>
      <p>Fill out the questionnaire to create your book.</p>
    </div>
  );
}

export default Wizard;