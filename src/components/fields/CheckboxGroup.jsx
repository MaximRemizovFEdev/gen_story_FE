import React from 'react';

export const CheckboxGroup = ({ label, name, value, onChange, options, max }) => {
  const handleChange = (event) => {
    onChange({
      target: {
        name,
        value: event.target.value,
        checked: event.target.checked,
      },
    });
  };

  return (
    <fieldset className="choice-field">
      <legend>{label}</legend>
      <div className="choice-grid">
        {options.map((option) => (
          <label className={`choice-card ${value.includes(option) ? 'is-selected' : ''}`} key={option}>
            <input
              type="checkbox"
              name={name}
              value={option}
              checked={Array.isArray(value) && value.includes(option)}
              onChange={handleChange}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
      {value?.length > max && (
        <p className="field-error">Можно выбрать не более {max} вариантов</p>
      )}
    </fieldset>
  );
};
